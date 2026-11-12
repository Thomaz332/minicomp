# MiniComp

Front-end em C++17 para a MiniLang. O projeto lê arquivos de entrada, reconhece tokens, usa um parser preditivo LL(1), produz uma AST e interpreta os comandos. O lexer descarta espaços e comentários. A tabela de símbolos reúne identificadores globais e suas primeiras ocorrências.

## Compilar e executar

```sh
make
./minicomp tests/factorial.ml
./minicomp --tokens tests/factorial.ml
./minicomp --symbols tests/factorial.ml
echo 5 | ./minicomp --run tests/factorial.ml
make test
```

No Windows o executável é `minicomp.exe`. Use um compilador compatível com C++17. Os cabeçalhos gerados acompanham o código. Node.js é usado em `make test` e `make regenerate`.

## Especificação adotada

A descrição do projeto confirma inteiros não negativos, escopo global, atribuição, leitura, escrita, condicional com `then` e laço com `do`. A captura não inclui a lista completa de tokens, as produções originais ou os arquivos de exemplo da disciplina. Este pacote assume `:=` para atribuição, `read(x)` e `write(expressão)`, comandos simples terminados por `;` e `end` para fechar o condicional e o laço. O `else` é opcional. Os exemplos incluídos foram escritos para a sintaxe adotada.

A implementação usa inteiros sem sinal de 64 bits, divisão inteira e zero como falso. Leituras de variáveis sem valor, entrada inválida, resultados negativos, divisão por zero e estouro geram diagnósticos. Os identificadores e comentários usam o conjunto ASCII nesta versão. Um erro sintático impede a geração da AST. O parser tenta retomar a análise nos delimitadores para relatar mais de um erro no mesmo arquivo.

## Arquivos de apoio

- [Regras léxicas](docs/lexer.md)
- [Produções e tabelas FIRST/FOLLOW e LL(1)](docs/grammar.md)
- [Relatório técnico](docs/relatorio.md)
- [Autômatos JFLAP](jflap/)
- [Programas de teste](tests/)
