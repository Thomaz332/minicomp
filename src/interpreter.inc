class Interpreter {
    using Integer = std::uint64_t;
    std::map<std::string, Integer> memory;
    bool tracing;
    std::size_t traceStep = 0;

    void trace(const Ast& node, const std::string& event) {
        if (!tracing) return;
        std::cerr << "[trace " << ++traceStep << "] " << node.position.line << ':'
                  << node.position.column << ' ' << event << '\n';
    }

    void initialize(const Ast& node) {
        if (node.kind == "ID" || node.kind == "Assign" || node.kind == "Read") {
            if (memory.try_emplace(node.value, 0).second) {
                trace(node, "init " + node.value + " = 0");
            }
        }
        for (const auto& child : node.children) initialize(child);
    }

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
            return memory.at(node.value);
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

    void executeNode(const Ast& node) {
        if (node.kind == "Program" || node.kind == "Block") {
            for (const auto& child : node.children) executeNode(child);
        } else if (node.kind == "Assign") {
            const auto value = evaluate(node.children[0]);
            const auto previous = memory.at(node.value);
            memory.at(node.value) = value;
            trace(node, "assign " + node.value + ": " + std::to_string(previous) +
                " -> " + std::to_string(value));
        } else if (node.kind == "Read") {
            std::string text;
            if (!(std::cin >> text)) throw Diagnostic("erro semântico: entrada ausente", node.position);
            const auto value = parseNumber(text, node.position);
            const auto previous = memory.at(node.value);
            memory.at(node.value) = value;
            trace(node, "read " + node.value + ": " + std::to_string(previous) +
                " -> " + std::to_string(value));
        } else if (node.kind == "Write") {
            const auto value = evaluate(node.children[0]);
            std::cout << value << '\n';
            trace(node, "write " + std::to_string(value));
        } else if (node.kind == "If") {
            const auto condition = evaluate(node.children[0]);
            trace(node, "if " + std::to_string(condition) +
                (condition != 0 ? " -> then" : " -> else/skip"));
            if (condition != 0) executeNode(node.children[1]);
            else if (node.children.size() == 3) executeNode(node.children[2]);
        } else if (node.kind == "While") {
            while (true) {
                const auto condition = evaluate(node.children[0]);
                trace(node, "while " + std::to_string(condition) +
                    (condition != 0 ? " -> body" : " -> exit"));
                if (condition == 0) break;
                executeNode(node.children[1]);
            }
        }
    }

public:
    explicit Interpreter(bool enableTrace = false) : tracing(enableTrace) {}

    void execute(const Ast& program) {
        memory.clear();
        traceStep = 0;
        initialize(program);
        executeNode(program);
        for (const auto& [name, value] : memory) {
            trace(program, "final " + name + " = " + std::to_string(value));
        }
        trace(program, "done");
    }
};
