import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const binary = fileURLToPath(new URL(process.platform === 'win32' ? '../minicomp.exe' : '../minicomp', import.meta.url));

function run(file, mode, input) {
  const args = mode ? [mode, 'tests/' + file] : ['tests/' + file];
  const result = spawnSync(binary, args, {encoding: 'utf8', input});
  if (result.error) throw result.error;
  return result;
}

const ast = run('valid.ml');
assert.equal(ast.status, 0, ast.stderr);
assert.match(ast.stdout, /\(Assign "n"\s+\(Binary "-"\s+\(Binary "-"\s+\(INTEGER "10"\)\s+\(INTEGER "3"\)\s+\)\s+\(INTEGER "2"\)/);
assert.match(ast.stdout, /\(Binary "\+"\s+\(ID "n"\)\s+\(Binary "\*"/);

const tokens = run('valid.ml', '--tokens');
assert.equal(tokens.status, 0, tokens.stderr);
assert.match(tokens.stdout, /^2:1 ID "n"/);
assert.match(tokens.stdout, / ASSIGN ":="/);
assert.doesNotMatch(tokens.stdout, /SKIP|Precedencia/);
const symbols = run('factorial.ml', '--symbols');
assert.equal(symbols.status, 0, symbols.stderr);
assert.match(symbols.stdout, /^f 2:1\s+n 1:6/);

for (const [file, input, expected] of [
  ['factorial.ml', '5\n', '120'], ['maximum.ml', '12 25\n', '25'],
  ['maximum.ml', '25 12\n', '25'], ['sum-until-zero.ml', '2 5 9 0\n', '16']
]) {
  const result = run(file, '--run', input);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), expected);
}

const syntax = run('invalid-syntax.ml');
assert.equal(syntax.status, 1, syntax.stderr);
assert.match(syntax.stderr, /:1:6: erro sintático/);
assert.match(syntax.stderr, /:2:7: erro sintático/);
assert.equal(syntax.stdout, '');

for (const [file, mode, expected] of [
  ['invalid-lexical.ml', null, /:2:6: erro léxico/],
  ['invalid-comment.ml', null, /:2:1: erro léxico: comentário/],
  ['invalid-semantic.ml', '--run', /:1:9: erro semântico: divisão por zero/]
]) {
  const result = run(file, mode);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, expected);
}
console.log('11 cenários passaram.');
