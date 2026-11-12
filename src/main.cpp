#include <algorithm>
#include <charconv>
#include <cstdint>
#include <limits>
#include <map>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <iterator>
#include <sstream>
#include <stdexcept>
#include <string>
#include <string_view>
#include <utility>
#include <vector>

#include "grammar.generated.hpp"
#include "lexer.generated.hpp"

struct Position {
    std::size_t line = 1;
    std::size_t column = 1;
};

struct Token {
    std::string kind;
    std::string lexeme;
    Position position;
};

struct Diagnostic : std::runtime_error {
    Position position;
    Diagnostic(const std::string& message, Position at)
        : std::runtime_error(message), position(at) {}
};

std::string quoted(const std::string& value) {
    std::ostringstream out;
    out << '"';
    for (char c : value) {
        switch (c) {
            case '\n': out << "\\n"; break;
            case '\r': out << "\\r"; break;
            case '\t': out << "\\t"; break;
            case '\\': out << "\\\\"; break;
            case '"': out << "\\\""; break;
            default:
                if (static_cast<unsigned char>(c) < 32 || c == 127) {
                    out << "\\x" << std::hex << std::setw(2) << std::setfill('0')
                        << static_cast<unsigned>(static_cast<unsigned char>(c)) << std::dec;
                } else {
                    out << c;
                }
        }
    }
    out << '"';
    return out.str();
}

void advance(Position& position, char current, char previous) {
    if (current == '\r' || (current == '\n' && previous != '\r')) {
        ++position.line;
        position.column = 1;
    } else if (current != '\n') {
        ++position.column;
    }
}

std::vector<Token> tokenize(const std::string& input) {
    std::vector<Token> tokens;
    Position position;
    for (std::size_t cursor = 0; cursor < input.size();) {
        const char* kind = nullptr;
        std::size_t length = 0;
        for (const auto& machine : automata) {
            int state = 0;
            for (std::size_t index = cursor; index < input.size(); ++index) {
                const auto byte = static_cast<unsigned char>(input[index]);
                if (byte >= 128) break;
                state = machine.next[static_cast<std::size_t>(state)][byte];
                if (state < 0) break;
                const auto* accepted = machine.accepted[static_cast<std::size_t>(state)];
                if (accepted && index - cursor + 1 > length) {
                    kind = accepted;
                    length = index - cursor + 1;
                }
            }
        }

        if (input.compare(cursor, 2, "/*") == 0 && length < 4) {
            throw Diagnostic("erro léxico: comentário de bloco inválido ou sem fechamento", position);
        }
        if (!kind) {
            throw Diagnostic("erro léxico: caractere inesperado " + quoted(input.substr(cursor, 1)), position);
        }
        if (std::string_view(kind) != "SKIP") tokens.push_back({kind, input.substr(cursor, length), position});
        const auto end = cursor + length;
        for (; cursor < end; ++cursor) {
            advance(position, input[cursor], cursor == 0 ? '\0' : input[cursor - 1]);
        }
    }
    tokens.push_back({"EOF", "", position});
    return tokens;
}

struct Syntax {
    std::string symbol;
    std::string value;
    std::vector<Syntax> children;
    Position position{};
};

std::string describe(const Token& token) {
    return token.kind == "EOF" ? "fim de arquivo" : quoted(token.lexeme);
}

Syntax parse(const std::vector<Token>& tokens, std::vector<Diagnostic>& errors) {
    Syntax root{"Program", "", {}};
    std::vector<Syntax*> pending{&root};
    std::size_t cursor = 0;
    while (!pending.empty()) {
        Syntax& node = *pending.back();
        pending.pop_back();
        const auto& token = tokens.at(cursor);
        node.position = token.position;
        const auto nonterminal = parseTable.find(node.symbol);
        if (nonterminal == parseTable.end()) {
            if (node.symbol != token.kind) {
                errors.emplace_back("erro sintático: esperado " + node.symbol + ", encontrado " +
                    describe(token), token.position);
                continue;
            }
            node.value = token.lexeme;
            ++cursor;
            continue;
        }
        const auto& row = nonterminal->second;
        const auto entry = row.find(token.kind);
        if (entry == row.end()) {
            std::vector<std::string> choices;
            for (const auto& item : row) choices.push_back(item.first);
            std::sort(choices.begin(), choices.end());
            std::string expected;
            for (const auto& item : choices) expected += (expected.empty() ? "" : ", ") + item;
            errors.emplace_back("erro sintático: esperado " + expected + ", encontrado " +
                describe(token), token.position);
            // Sincroniza no próximo ponto que pode iniciar esta produção ou encerrar o comando.
            while (tokens[cursor].kind != "EOF" && tokens[cursor].kind != "SEMI" &&
                   tokens[cursor].kind != "KW_ELSE" && tokens[cursor].kind != "KW_END" &&
                   row.find(tokens[cursor].kind) == row.end()) ++cursor;
            if (row.find(tokens[cursor].kind) != row.end()) pending.push_back(&node);
            continue;
        }
        for (const auto& symbol : productions.at(entry->second)) node.children.push_back({symbol, "", {}});
        for (auto it = node.children.rbegin(); it != node.children.rend(); ++it) pending.push_back(&*it);
    }
    if (tokens.at(cursor).kind != "EOF") {
        errors.emplace_back("erro sintático: esperado fim de arquivo, encontrado " + describe(tokens[cursor]),
            tokens[cursor].position);
    }
    return root;
}

struct Ast {
    std::string kind;
    std::string value;
    std::vector<Ast> children;
    Position position{};
};

Ast lower(const Syntax& node);

Ast binary(std::string op, Ast left, Ast right, Position position) {
    std::vector<Ast> children;
    children.push_back(std::move(left));
    children.push_back(std::move(right));
    return {"Binary", std::move(op), std::move(children), position};
}

Ast expression(const Syntax& node) {
    Ast left = lower(node.children[0]);
    const Syntax* tail = &node.children[1];
    while (!tail->children.empty()) {
        const auto& op = tail->children[0];
        left = binary(op.children.empty() ? op.value : op.children[0].value,
            std::move(left), lower(tail->children[1]), op.position);
        if (tail->children.size() == 2) break;
        tail = &tail->children[2];
    }
    return left;
}

std::vector<Ast> statements(const Syntax& node) {
    std::vector<Ast> result;
    for (const Syntax* list = &node; !list->children.empty(); list = &list->children[1]) {
        result.push_back(lower(list->children[0]));
    }
    return result;
}

Ast lower(const Syntax& node) {
    const auto& children = node.children;
    const auto& kind = node.symbol;
    if (kind == "Program" || kind == "StmtList") {
        return {kind == "Program" ? "Program" : "Block", "",
            statements(kind == "Program" ? children[0] : node), node.position};
    }
    if (kind == "Stmt") return lower(children[0]);
    if (kind == "Assign") return {"Assign", children[0].value, {lower(children[2])}, node.position};
    if (kind == "Write") return {"Write", "", {lower(children[2])}, node.position};
    if (kind == "Read") return {"Read", children[2].value, {}, node.position};
    if (kind == "While") return {"While", "", {lower(children[1]), lower(children[3])}, node.position};
    if (kind == "If") {
        Ast result{"If", "", {lower(children[1]), lower(children[3])}, node.position};
        if (!children[4].children.empty()) result.children.push_back(lower(children[4].children[1]));
        return result;
    }
    if (kind == "Primary") {
        return children.size() == 1 ? Ast{children[0].symbol, children[0].value, {}, node.position}
            : lower(children[1]);
    }
    return expression(node);
}

void printAst(const Ast& node, std::size_t depth = 0) {
    const std::string indent(depth * 2, ' ');
    std::cout << indent << '(' << node.kind;
    if (!node.value.empty()) std::cout << ' ' << quoted(node.value);
    if (!node.children.empty()) {
        std::cout << '\n';
        for (const auto& child : node.children) printAst(child, depth + 1);
        std::cout << indent;
    }
    std::cout << ")\n";
}

#include "interpreter.inc"

int main(int argc, char** argv) {
    const std::string_view mode = argc == 3 ? argv[1] : "";
    if (argc != 2 && (argc != 3 || (mode != "--tokens" && mode != "--run" && mode != "--symbols"))) {
        std::cerr << "Uso: minicomp [--tokens | --symbols | --run] <arquivo>\n";
        return 2;
    }
    const std::string file = argv[argc - 1];
    std::ifstream stream(file, std::ios::binary);
    if (!stream) {
        std::cerr << "Não foi possível abrir " << file << '\n';
        return 2;
    }
    const std::string input((std::istreambuf_iterator<char>(stream)), std::istreambuf_iterator<char>());
    if (stream.bad()) {
        std::cerr << "Não foi possível ler " << file << '\n';
        return 2;
    }
    try {
        const auto tokens = tokenize(input);
        if (mode == "--tokens") {
            for (const auto& token : tokens) {
                std::cout << token.position.line << ':' << token.position.column << ' '
                          << token.kind << ' ' << quoted(token.lexeme) << '\n';
            }
        } else if (mode == "--symbols") {
            std::map<std::string, Position> symbols;
            for (const auto& token : tokens) {
                if (token.kind == "ID") symbols.try_emplace(token.lexeme, token.position);
            }
            for (const auto& [name, position] : symbols) {
                std::cout << name << ' ' << position.line << ':' << position.column << '\n';
            }
        } else {
            std::vector<Diagnostic> errors;
            const auto syntax = parse(tokens, errors);
            for (const auto& error : errors) {
                std::cerr << file << ':' << error.position.line << ':' << error.position.column
                          << ": " << error.what() << '\n';
            }
            if (!errors.empty()) return 1;
            const auto ast = lower(syntax);
            if (mode == "--run") Interpreter{}.execute(ast);
            else printAst(ast);
        }
        return 0;
    } catch (const Diagnostic& error) {
        std::cerr << file << ':' << error.position.line << ':' << error.position.column
                  << ": " << error.what() << '\n';
        return 1;
    }
}
