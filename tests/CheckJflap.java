import java.io.File;
import file.XMLCodec;
import automata.fsa.FiniteStateAutomaton;
import automata.fsa.FSAStepWithClosureSimulator;

class CheckJflap {
    public static void main(String[] args) {
        check(args[0], "comentarios", new String[]{"//abc", "/* abc */", "// [", "/* [ */"}, new String[]{"/", "/* abc"});
        check(args[0], "espacos", new String[]{" ", "\t", "\r\n"}, new String[]{"", "a"});
        check(args[0], "identificadores", new String[]{"a", "_x1", "count"}, new String[]{"1abc", "a-b"});
        check(args[0], "numeros", new String[]{"0", "0123", "99"}, new String[]{"-1", "1.2"});
        check(args[0], "operadores-e-delimitadores", new String[]{":=", "<=", ")"}, new String[]{":", "==="});
        check(args[0], "palavras-reservadas", new String[]{"if", "then", "end"}, new String[]{"ifx", "int"});
    }

    private static void check(String path, String name, String[] yes, String[] no) {
        var automaton = (FiniteStateAutomaton) new XMLCodec().decode(new File(path, name + ".jff"), null);
        for (String input : yes) assertAccept(automaton, name, input, true);
        for (String input : no) assertAccept(automaton, name, input, false);
        System.out.println(name + ": " + (yes.length + no.length) + " simulações passaram");
    }

    private static void assertAccept(FiniteStateAutomaton automaton, String name, String input, boolean expected) {
        if (new FSAStepWithClosureSimulator(automaton).simulateInput(input) != expected)
            throw new AssertionError(name + " entrada " + input.replace("\t", "\\t").replace("\n", "\\n") + " esperado " + expected);
    }
}
