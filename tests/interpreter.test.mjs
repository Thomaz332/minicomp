import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const binary = path.join(root, process.platform === 'win32' ? 'minicomp.exe' : 'minicomp');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'minicomp-tests-'));
const results = [];
let fixtureIndex = 0;

function test(name, check) {
  check();
  results.push({name, status: 'passed'});
  console.log(`OK ${name}`);
}

function invoke(args, input = '') {
  const result = spawnSync(binary, args, {cwd: root, encoding: 'utf8', input, timeout: 5000});
  if (result.error) throw result.error;
  assert.equal(result.signal, null);
  result.stdout = result.stdout.replace(/\r\n/g, '\n');
  result.stderr = result.stderr.replace(/\r\n/g, '\n');
  return result;
}

function run(file, mode, input) {
  return invoke(mode ? [mode, `tests/${file}`] : [`tests/${file}`], input);
}

function source(text, mode = '--run', input) {
  const file = path.join(temporary, `${++fixtureIndex}.ml`);
  fs.writeFileSync(file, text);
  return invoke(mode ? [mode, file] : [file], input);
}

function expectOutput(result, expected) {
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), expected);
  assert.equal(result.stderr, '');
}

function expectError(result, expected) {
  assert.equal(result.status, 1);
  assert.match(result.stderr, expected);
}

try {
  for (const [name, file, input, expected] of [
    ['Fatorial de 5', 'factorial.ml', '5\n', '120'],
    ['Fatorial de 0', 'factorial.ml', '0\n', '1'],
    ['Máximo pelo ramo else', 'maximum.ml', '12 25\n', '25'],
    ['Máximo pelo ramo then', 'maximum.ml', '25 12\n', '25'],
    ['Máximo com valores iguais', 'maximum.ml', '12 12\n', '12'],
    ['Soma até zero', 'sum-until-zero.ml', '2 5 9 0\n', '16'],
    ['Soma com sentinela inicial', 'sum-until-zero.ml', '0\n', '0'],
    ['Zero inicial inclusive em ramo não executado', 'default-zero.ml', '', '0\n0\n1'],
  ]) test(name, () => expectOutput(run(file, '--run', input), expected));

  for (const [name, program, expected] of [
    ['Programa vazio', '', ''],
    ['Autorreferência usa zero inicial', 'x := x + 2; write(x);', '2'],
    ['Escopo global entre blocos', 'if 1 then x := 7; end write(x);', '7'],
    ['If falso sem else', 'if 0 then write(99); end write(1);', '1'],
    ['Condição inteira não nula', 'if 2 then write(7); else write(9); end', '7'],
    ['While falso não executa corpo', 'while 0 do write(9); end write(1);', '1'],
    ['Laços e condicionais aninhados', 'n := 2; while n > 0 do if n = 2 then write(8); else write(7); end n := n - 1; end', '8\n7'],
    ['Precedência aritmética', 'write(2 + 3 * 4); write((2 + 3) * 4);', '14\n20'],
    ['Associatividade da subtração e divisão', 'write(10 - 3 - 2); write(20 / 2 / 2);', '5\n5'],
    ['Divisão inteira e resto', 'write(7 / 2); write(7 % 2);', '3\n1'],
    ['Limite superior uint64', 'write(18446744073709551615);', '18446744073709551615'],
    ['Multiplicação por zero', 'write(18446744073709551615 * 0); write(0 * 18446744073709551615);', '0\n0'],
    ['Subtração resulta em zero', 'write(4 - 4);', '0'],
    ['Comentários e linhas CRLF', '// cabecalho\r\nx := 2; /* bloco\r\n continua */\r\nwrite(x);', '2'],
    ['Identificador com prefixo reservado', 'whilex := 3; write(whilex);', '3'],
  ]) test(name, () => expectOutput(source(program), expected));

  for (const [operator, expected] of [['=', '0'], ['!=', '1'], ['<', '1'], ['<=', '1'], ['>', '0'], ['>=', '0']]) {
    test(`Relacional ${operator}`, () => expectOutput(source(`write(2 ${operator} 3);`), expected));
  }

  for (const [name, program, input, expected] of [
    ['Resto por zero', 'write(5 % 0);', '', /divisão por zero/],
    ['Resultado negativo', 'write(1 - 2);', '', /resultado negativo/],
    ['Overflow na soma', 'write(18446744073709551615 + 1);', '', /estouro aritmético/],
    ['Overflow no produto', 'write(18446744073709551615 * 2);', '', /estouro aritmético/],
    ['Literal fora de uint64', 'write(18446744073709551616);', '', /inteiro não negativo/],
    ['Leitura ausente', 'read(x);', '', /entrada ausente/],
    ['Leitura negativa', 'read(x);', '-1\n', /inteiro não negativo/],
    ['Leitura não numérica', 'read(x);', 'abc\n', /inteiro não negativo/],
    ['Leitura parcialmente numérica', 'read(x);', '12abc\n', /inteiro não negativo/],
    ['Leitura fora de uint64', 'read(x);', '18446744073709551616\n', /inteiro não negativo/],
    ['Parêntese ausente', 'write(2;', '', /erro sintático/],
    ['End ausente', 'if 1 then write(2);', '', /erro sintático/],
    ['Literal negativo não pertence à sintaxe', 'write(-1);', '', /erro sintático/],
    ['Diagnóstico após CRLF', 'write(1);\r\nwrite(@);', '', /:2:7: erro léxico/],
  ]) test(name, () => expectError(source(program, '--run', input), expected));

  test('Trace preserva stdout e registra decisões, memória e posições', () => {
    const result = run('trace.ml', '--trace', '2\n');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '0\n');
    assert.match(result.stderr, /\[trace 1\] 1:1 init n = 0/);
    assert.match(result.stderr, /1:1 read n: 0 -> 2/);
    assert.match(result.stderr, /3:5 assign n: 2 -> 1/);
    assert.equal((result.stderr.match(/while 1 -> body/g) ?? []).length, 2);
    assert.match(result.stderr, /2:1 while 0 -> exit/);
    assert.match(result.stderr, /5:1 if 1 -> then/);
    assert.match(result.stderr, /6:5 write 0/);
    assert.match(result.stderr, /final n = 0/);
    assert.match(result.stderr, /done\n$/);
    const steps = [...result.stderr.matchAll(/\[trace (\d+)\]/g)].map(match => Number(match[1]));
    assert.deepEqual(steps, steps.map((_, index) => index + 1));
  });
  test('Trace registra else e não executa then', () => {
    const result = source('if 0 then x := 9; else x := 2; end write(x);', '--trace');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '2\n');
    assert.match(result.stderr, /if 0 -> else\/skip/);
    assert.doesNotMatch(result.stderr, /assign x: 0 -> 9/);
    assert.match(result.stderr, /assign x: 0 -> 2/);
  });
  test('Trace não sinaliza sucesso após erro', () => {
    const result = source('x := 1; write(x / 0);', '--trace');
    expectError(result, /:1:17: erro semântico: divisão por zero/);
    assert.match(result.stderr, /assign x: 0 -> 1/);
    assert.equal(result.stdout, '');
    assert.doesNotMatch(result.stderr, /done/);
  });
  test('Erro sintático impede execução parcial', () => {
    const result = source('write(123); write(;', '--trace');
    expectError(result, /erro sintático/);
    assert.equal(result.stdout, '');
    assert.doesNotMatch(result.stderr, /\[trace/);
  });
  test('CLI rejeita opção desconhecida', () => assert.equal(invoke(['--unknown', 'tests/valid.ml']).status, 2));
  test('CLI rejeita arquivo ausente', () => assert.equal(invoke([path.join(temporary, 'missing.ml')]).status, 2));
  test('CLI sem argumentos informa uso', () => {
    const result = invoke([]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /--trace/);
  });

  const reportIndex = process.argv.indexOf('--report');
  if (reportIndex >= 0) {
    assert.ok(process.argv[reportIndex + 1], 'Informe o caminho depois de --report.');
    fs.writeFileSync(process.argv[reportIndex + 1], JSON.stringify({
      executedAt: new Date().toISOString(), platform: process.platform,
      node: process.version, total: results.length, passed: results.length, failed: 0, results,
    }, null, 2) + '\n');
  }
  console.log(`${results.length} cenários adicionais passaram.`);
} finally {
  fs.rmSync(temporary, {recursive: true, force: true});
}
