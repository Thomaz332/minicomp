class Interpreter {
    using Integer = std::uint64_t;
    std::map<std::string, Integer> memory;

    static Integer parseNumber(const std::string& text, Position at) {
        Integer value = 0;
        const auto* end = text.data() + text.size();
        const auto result = std::from_chars(text.data(), end, value);
        if (result.ec != std::errc{} || result.ptr != end) {
            throw Diagnostic("erro semântico: esperado inteiro não negativo de até 64 bits", at);
        }
        return value;
    }

    Integer evaluate(const Ast& node) const {
        if (node.kind == "INTEGER") return parseNumber(node.value, node.position);
        if (node.kind == "ID") {
            const auto item = memory.find(node.value);
            if (item == memory.end()) {
                throw Diagnostic("erro semântico: variável sem valor " + node.value, node.position);
            }
            return item->second;
        }

        const auto left = evaluate(node.children[0]);
        const auto right = evaluate(node.children[1]);
        const auto& op = node.value;
        const auto maximum = std::numeric_limits<Integer>::max();
        if (op == "=") return left == right;
        if (op == "!=") return left != right;
        if (op == "<") return left < right;
        if (op == "<=") return left <= right;
        if (op == ">") return left > right;
        if (op == ">=") return left >= right;
        if (op == "+" && right <= maximum - left) return left + right;
        if (op == "*" && (right == 0 || left <= maximum / right)) return left * right;
        if (op == "-") {
            if (right <= left) return left - right;
            throw Diagnostic("erro semântico: resultado negativo", node.position);
        }
        if (op == "/" || op == "%") {
            if (right == 0) throw Diagnostic("erro semântico: divisão por zero", node.position);
            return op == "/" ? left / right : left % right;
        }
        throw Diagnostic("erro semântico: estouro aritmético", node.position);
    }

public:
    void execute(const Ast& node) {
        if (node.kind == "Program" || node.kind == "Block") {
            for (const auto& child : node.children) execute(child);
        } else if (node.kind == "Assign") {
            memory[node.value] = evaluate(node.children[0]);
        } else if (node.kind == "Read") {
            std::string text;
            if (!(std::cin >> text)) throw Diagnostic("erro semântico: entrada ausente", node.position);
            memory[node.value] = parseNumber(text, node.position);
        } else if (node.kind == "Write") {
            std::cout << evaluate(node.children[0]) << '\n';
        } else if (node.kind == "If") {
            if (evaluate(node.children[0]) != 0) execute(node.children[1]);
            else if (node.children.size() == 3) execute(node.children[2]);
        } else if (node.kind == "While") {
            while (evaluate(node.children[0]) != 0) execute(node.children[1]);
        }
    }
};
