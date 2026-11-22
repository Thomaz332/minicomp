# MiniComp

Front-end e interpretador em C++17 para a MiniLang. O projeto lê arquivos de entrada, reconhece tokens, usa um parser preditivo LL(1), produz uma AST e interpreta os comandos. O lexer descarta espaços e comentários. Todos os identificadores globais começam com valor zero antes da execução, inclusive os presentes em ramos que não serão executados.

## Compilar e executar

```sh
make
./minicomp tests/factorial.ml
./minicomp --tokens tests/factorial.ml
./minicomp --symbols tests/factorial.ml
echo 5 | ./minicomp --run tests/factorial.ml
echo 2 | ./minicomp --trace tests/trace.ml
echo 5 | ./minicomp --trace tests/factorial.ml > resultado.txt 2> rastreamento.txt
make test
```

No Windows o executável é `minicomp.exe`. Use um compilador compatível com C++17. Os cabeçalhos gerados acompanham o código. Node.js é usado em `make test` e `make regenerate`.

## Especificação adotada

A descrição do projeto confirma inteiros não negativos, escopo global, atribuição, leitura, escrita, condicional com `then` e laço com `do`. A captura não inclui a lista completa de tokens, as produções originais ou os arquivos de exemplo da disciplina. Este pacote assume `:=` para atribuição, `read(x)` e `write(expressão)`, comandos simples terminados por `;` e `end` para fechar o condicional e o laço. O `else` é opcional. Os exemplos incluídos foram escritos para a sintaxe adotada.

A implementação usa inteiros sem sinal de 64 bits, divisão inteira e zero como falso (qualquer valor não zero é verdadeiro). Variáveis não precisam de declaração e começam em zero. Entrada inválida, resultados negativos, divisão ou resto por zero e estouro geram diagnósticos com arquivo, linha e coluna. Os identificadores e comentários usam o conjunto ASCII nesta versão. Um erro sintático impede a geração da AST e toda a execução. O parser tenta retomar a análise nos delimitadores para relatar mais de um erro no mesmo arquivo.

## Modos de execução

| Comando | Comportamento |
| --- | --- |
| `minicomp arquivo.ml` | Imprime a AST, sem executar o programa. |
| `minicomp --tokens arquivo.ml` | Lista tokens com posições; somente análise léxica. |
| `minicomp --symbols arquivo.ml` | Lista nomes globais e primeiras ocorrências; somente análise léxica. |
| `minicomp --run arquivo.ml` | Executa; `stdout` contém somente os resultados de `write`. |
| `minicomp --trace arquivo.ml` | Executa com rastreamento em `stderr`, preservando os resultados em `stdout`. |

O rastreamento inclui contador sequencial, linha e coluna, inicialização, leitura, atribuição com valor anterior/novo, escrita, decisões de `if`, cada teste de `while` e memória final. `done` indica término normal. Em erro de execução, a trilha anterior é preservada, o diagnóstico é emitido e não há `done`. Códigos de saída: 0 para sucesso, 1 para erro léxico/sintático/semântico, 2 para uso incorreto ou erro de acesso ao arquivo.

## Validação e segunda entrega

`make test` executa a suíte original de 11 cenários e os testes adicionais de `tests/interpreter.test.mjs`. Para salvar evidência dos testes adicionais:

```sh
node tests/interpreter.test.mjs --report docs/test-results.json
```

O [relatório final](docs/relatorio.md) explica semântica, transformações, decisões, resultados, limitações e a matriz dos requisitos. A versão para leitura está em [PDF](docs/relatorio-final.pdf). Os diagramas são derivados dos arquivos JFLAP em `jflap/`; as tabelas completas estão em `docs/grammar.md`.

Não foi fornecida a gramática oficial completa da disciplina. A implementação atende à descrição recebida e mantém documentadas as escolhas de sintaxe; a conformidade com tokens/produções oficiais ainda depende dessa comparação. Não há geração de código de máquina: a execução percorre a AST.

## Arquivos de apoio

- [Regras léxicas](docs/lexer.md)
- [Produções e tabelas FIRST/FOLLOW e LL(1)](docs/grammar.md)
- [Relatório técnico](docs/relatorio.md)
- [Autômatos JFLAP](jflap/)
- [Programas de teste](tests/)
