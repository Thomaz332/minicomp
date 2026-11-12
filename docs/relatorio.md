# MiniComp · Relatório técnico

O scanner percorre o arquivo reconhecendo o maior prefixo aceito por um autômato. Os autômatos de palavras reservadas e pontuação compartilham prefixos para distinguir casos como `<` e `<=`. Cada token preserva a posição do primeiro caractere. Espaços e comentários avançam a posição sem produzir tokens.

A gramática adotada separa expressões relacionais, aditivas e multiplicativas. Uma formulação recursiva à esquerda como `Simple → Simple AddOp Mul | Mul` é transformada em `Simple → Mul AddTail` e `AddTail → AddOp Mul AddTail | ε`. O condicional compartilha o prefixo `if Expr then StmtList`, seguido de um não terminal para o `else` opcional e do terminador `end`. As tabelas são calculadas até que FIRST e FOLLOW estabilizem. Cada produção entra nas colunas de FIRST e, quando admite ε, nas de FOLLOW do seu lado esquerdo. Uma colisão aborta a geração.

O parser usa uma pilha e um token de antecipação. Em caso de erro, tenta retomar em um token aceito pela produção atual ou em um delimitador de comando. A AST descarta a pontuação e agrupa operações binárias à esquerda no mesmo nível de precedência. O interpretador executa a AST em memória global e recebe a entrada pelo terminal.

A suíte inclui fatorial, as duas ramificações do máximo, soma até zero, precedência, tabela de símbolos e diagnósticos léxicos, sintáticos e semânticos. Os programas foram produzidos para este projeto com base nos exemplos nomeados na descrição. A conformidade exata depende da gramática e dos exemplos oficiais da disciplina.
