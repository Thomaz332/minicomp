# Gramática e tabelas

Símbolo inicial Program. ε representa a produção vazia.

## Produções

1. Program → StmtList
2. StmtList → Stmt StmtList
3. StmtList → ε
4. Stmt → Assign SEMI
5. Stmt → Write SEMI
6. Stmt → Read SEMI
7. Stmt → If
8. Stmt → While
9. Assign → ID ASSIGN Expr
10. Write → KW_WRITE LP Expr RP
11. Read → KW_READ LP ID RP
12. If → KW_IF Expr KW_THEN StmtList Else KW_END
13. Else → KW_ELSE StmtList
14. Else → ε
15. While → KW_WHILE Expr KW_DO StmtList KW_END
16. Expr → Simple RelTail
17. RelTail → RelOp Simple
18. RelTail → ε
19. RelOp → EQ
20. RelOp → NE
21. RelOp → LT
22. RelOp → LE
23. RelOp → GT
24. RelOp → GE
25. Simple → Mul AddTail
26. AddTail → AddOp Mul AddTail
27. AddTail → ε
28. AddOp → PLUS
29. AddOp → MINUS
30. Mul → Primary MulTail
31. MulTail → MulOp Primary MulTail
32. MulTail → ε
33. MulOp → STAR
34. MulOp → SLASH
35. MulOp → MOD
36. Primary → ID
37. Primary → INTEGER
38. Primary → LP Expr RP

## FIRST e FOLLOW

| Não terminal | FIRST | FOLLOW |
| --- | --- | --- |
| Program | ID, KW_IF, KW_READ, KW_WHILE, KW_WRITE, ε | EOF |
| StmtList | ID, KW_IF, KW_READ, KW_WHILE, KW_WRITE, ε | EOF, KW_ELSE, KW_END |
| Stmt | ID, KW_IF, KW_READ, KW_WHILE, KW_WRITE | EOF, ID, KW_ELSE, KW_END, KW_IF, KW_READ, KW_WHILE, KW_WRITE |
| Assign | ID | SEMI |
| Write | KW_WRITE | SEMI |
| Read | KW_READ | SEMI |
| If | KW_IF | EOF, ID, KW_ELSE, KW_END, KW_IF, KW_READ, KW_WHILE, KW_WRITE |
| Else | KW_ELSE, ε | KW_END |
| While | KW_WHILE | EOF, ID, KW_ELSE, KW_END, KW_IF, KW_READ, KW_WHILE, KW_WRITE |
| Expr | ID, INTEGER, LP | KW_DO, KW_THEN, RP, SEMI |
| RelTail | EQ, GE, GT, LE, LT, NE, ε | KW_DO, KW_THEN, RP, SEMI |
| RelOp | EQ, GE, GT, LE, LT, NE | ID, INTEGER, LP |
| Simple | ID, INTEGER, LP | EQ, GE, GT, KW_DO, KW_THEN, LE, LT, NE, RP, SEMI |
| AddTail | MINUS, PLUS, ε | EQ, GE, GT, KW_DO, KW_THEN, LE, LT, NE, RP, SEMI |
| AddOp | MINUS, PLUS | ID, INTEGER, LP |
| Mul | ID, INTEGER, LP | EQ, GE, GT, KW_DO, KW_THEN, LE, LT, MINUS, NE, PLUS, RP, SEMI |
| MulTail | MOD, SLASH, STAR, ε | EQ, GE, GT, KW_DO, KW_THEN, LE, LT, MINUS, NE, PLUS, RP, SEMI |
| MulOp | MOD, SLASH, STAR | ID, INTEGER, LP |
| Primary | ID, INTEGER, LP | EQ, GE, GT, KW_DO, KW_THEN, LE, LT, MINUS, MOD, NE, PLUS, RP, SEMI, SLASH, STAR |

## Tabela LL(1)

| Não terminal | Token de antecipação | Produção |
| --- | --- | --- |
| Program | EOF | 1 |
| Program | ID | 1 |
| Program | KW_IF | 1 |
| Program | KW_READ | 1 |
| Program | KW_WHILE | 1 |
| Program | KW_WRITE | 1 |
| StmtList | EOF | 3 |
| StmtList | ID | 2 |
| StmtList | KW_ELSE | 3 |
| StmtList | KW_END | 3 |
| StmtList | KW_IF | 2 |
| StmtList | KW_READ | 2 |
| StmtList | KW_WHILE | 2 |
| StmtList | KW_WRITE | 2 |
| Stmt | ID | 4 |
| Stmt | KW_IF | 7 |
| Stmt | KW_READ | 6 |
| Stmt | KW_WHILE | 8 |
| Stmt | KW_WRITE | 5 |
| Assign | ID | 9 |
| Write | KW_WRITE | 10 |
| Read | KW_READ | 11 |
| If | KW_IF | 12 |
| Else | KW_ELSE | 13 |
| Else | KW_END | 14 |
| While | KW_WHILE | 15 |
| Expr | ID | 16 |
| Expr | INTEGER | 16 |
| Expr | LP | 16 |
| RelTail | EQ | 17 |
| RelTail | GE | 17 |
| RelTail | GT | 17 |
| RelTail | KW_DO | 18 |
| RelTail | KW_THEN | 18 |
| RelTail | LE | 17 |
| RelTail | LT | 17 |
| RelTail | NE | 17 |
| RelTail | RP | 18 |
| RelTail | SEMI | 18 |
| RelOp | EQ | 19 |
| RelOp | GE | 24 |
| RelOp | GT | 23 |
| RelOp | LE | 22 |
| RelOp | LT | 21 |
| RelOp | NE | 20 |
| Simple | ID | 25 |
| Simple | INTEGER | 25 |
| Simple | LP | 25 |
| AddTail | EQ | 27 |
| AddTail | GE | 27 |
| AddTail | GT | 27 |
| AddTail | KW_DO | 27 |
| AddTail | KW_THEN | 27 |
| AddTail | LE | 27 |
| AddTail | LT | 27 |
| AddTail | MINUS | 26 |
| AddTail | NE | 27 |
| AddTail | PLUS | 26 |
| AddTail | RP | 27 |
| AddTail | SEMI | 27 |
| AddOp | MINUS | 29 |
| AddOp | PLUS | 28 |
| Mul | ID | 30 |
| Mul | INTEGER | 30 |
| Mul | LP | 30 |
| MulTail | EQ | 32 |
| MulTail | GE | 32 |
| MulTail | GT | 32 |
| MulTail | KW_DO | 32 |
| MulTail | KW_THEN | 32 |
| MulTail | LE | 32 |
| MulTail | LT | 32 |
| MulTail | MINUS | 32 |
| MulTail | MOD | 31 |
| MulTail | NE | 32 |
| MulTail | PLUS | 32 |
| MulTail | RP | 32 |
| MulTail | SEMI | 32 |
| MulTail | SLASH | 31 |
| MulTail | STAR | 31 |
| MulOp | MOD | 35 |
| MulOp | SLASH | 34 |
| MulOp | STAR | 33 |
| Primary | ID | 36 |
| Primary | INTEGER | 37 |
| Primary | LP | 38 |

As células ausentes indicam erro sintático. O gerador rejeita conflitos.
