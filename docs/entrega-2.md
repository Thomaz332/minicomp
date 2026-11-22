# Segunda entrega: checklist e demonstração

## Conteúdo do pacote

- `src/`: código-fonte C++17 e cabeçalhos gerados.
- `spec/grammar.json`: gramática adotada, fonte das tabelas LL(1).
- `jflap/`: seis autômatos editáveis no JFLAP.
- `docs/grammar.md`: produções, FIRST/FOLLOW e tabela LL(1) completa.
- `docs/relatorio.md` e `docs/relatorio-final.pdf`: relatório final e diagramas.
- `docs/test-results.json`: evidência datada dos testes adicionais.
- `tests/`: exemplos válidos, inválidos, rastreamento e suítes automatizadas.
- `Makefile` e `README.md`: compilação, execução e limitações.

## Roteiro de demonstração (terminal POSIX)

```sh
make
make test
echo 5 | ./minicomp --run tests/factorial.ml
echo '12 25' | ./minicomp --run tests/maximum.ml
echo '2 5 9 0' | ./minicomp --run tests/sum-until-zero.ml
./minicomp --run tests/default-zero.ml
echo 2 | ./minicomp --trace tests/trace.ml > resultado.txt 2> rastreamento.txt
./minicomp --run tests/invalid-semantic.ml
./minicomp tests/invalid-syntax.ml
```

Resultados: fatorial 120; máximo 25; soma 16; zero inicial 0, 0 e 1 em linhas separadas. O exemplo de trace escreve 0 e registra as duas iterações, a saída do laço e o ramo then. Os dois últimos comandos devem retornar código 1 e diagnósticos, pois são casos inválidos intencionais. No Windows, use `./minicomp.exe`; o executável opcional do pacote foi compilado para Windows x86-64.

## Reproduzir a validação JFLAP (opcional)

Com Java 17 ou superior e uma cópia do `JFLAP.jar`, execute na raiz do projeto:

```sh
java -Djava.awt.headless=true -cp /caminho/JFLAP.jar tests/CheckJflap.java jflap
```

O verificador carrega os seis XMLs pela biblioteca do JFLAP e executa 31 simulações positivas/negativas. O JAR não é redistribuído no pacote. Essa ferramenta é independente dos testes Node executados por `make test`.

## Requisito pendente de confirmação externa

A captura do enunciado não contém a gramática léxica/sintática oficial completa. Verificar se os delimitadores (`:=`, `read(...)`, `write(...)`, `end`, `;`) coincidem com a especificação do professor. Nenhum teste local substitui essa comparação. A data normal de entrega informada na captura é 30/11/2026; atraso permitido até 11/12/2026. O pacote não é submetido automaticamente ao portal.
