# Regras léxicas

| Classe | Regra |
| --- | --- |
| Identificador | Letra ASCII ou sublinhado, seguida de zero ou mais letras ASCII, dígitos ou sublinhados |
| Inteiro | Um ou mais dígitos |
| Palavras reservadas | read, write, if, then, else, while, do, end |
| Atribuição | `:=` |
| Operadores aritméticos | `+`, `-`, `*`, `/`, `%` |
| Operadores relacionais | `=`, `!=`, `<`, `<=`, `>`, `>=` |
| Delimitadores | Ponto e vírgula e parênteses |
| Comentários | Duas barras até o fim da linha ou bloco delimitado por barra-asterisco e asterisco-barra |
| Espaços | Espaço, tabulação, LF, CR, avanço de página e tabulação vertical |
| EOF | Marcador sintético de fim do arquivo |

Os autômatos do scanner e os arquivos JFLAP são gerados a partir da mesma definição. A correspondência mais longa vence. Em empate, as palavras reservadas têm prioridade sobre identificadores. O XML 1.0 dos arquivos JFLAP não representa avanço de página nem tabulação vertical.
