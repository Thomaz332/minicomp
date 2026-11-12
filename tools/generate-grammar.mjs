import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../', import.meta.url);
const grammar = JSON.parse(fs.readFileSync(new URL('spec/grammar.json', root), 'utf8'));
const names = Object.keys(grammar);
const nonterminals = new Set(names);
const EPSILON = 'ε';
const END = 'EOF';
const productions = names.flatMap(lhs => grammar[lhs].map(rhs => ({
  lhs, rhs: rhs ? rhs.split(/\s+/) : []
})));
const first = new Map(names.map(name => [name, new Set()]));
const follow = new Map(names.map(name => [name, new Set()]));
follow.get(names[0]).add(END);

function firstOf(symbols) {
  const result = new Set();
  for (const symbol of symbols) {
    const set = first.get(symbol) ?? new Set([symbol]);
    for (const token of set) if (token !== EPSILON) result.add(token);
    if (!set.has(EPSILON)) return result;
  }
  result.add(EPSILON);
  return result;
}

function extend(destination, source, exclude) {
  let changed = false;
  for (const item of source) {
    if (item !== exclude && !destination.has(item)) {
      destination.add(item);
      changed = true;
    }
  }
  return changed;
}

function converge(step) {
  let changed;
  do {
    changed = false;
    for (const production of productions) changed = step(production) || changed;
  } while (changed);
}

converge(({lhs, rhs}) => extend(first.get(lhs), firstOf(rhs)));
converge(({lhs, rhs}) => {
  let changed = false;
  for (const [index, symbol] of rhs.entries()) {
    if (!nonterminals.has(symbol)) continue;
    const suffix = firstOf(rhs.slice(index + 1));
    changed = extend(follow.get(symbol), suffix, EPSILON) || changed;
    if (suffix.has(EPSILON)) changed = extend(follow.get(symbol), follow.get(lhs)) || changed;
  }
  return changed;
});

const table = new Map(names.map(name => [name, new Map()]));
for (const [index, {lhs, rhs}] of productions.entries()) {
  const tokens = firstOf(rhs);
  if (tokens.delete(EPSILON)) extend(tokens, follow.get(lhs));
  for (const token of tokens) {
    const row = table.get(lhs);
    if (row.has(token)) throw new Error('Conflito LL(1) em ' + lhs + ' / ' + token);
    row.set(token, index);
  }
}

const documentation = [
  '# Gramática e tabelas', '', 'Símbolo inicial ' + names[0] + '. ε representa a produção vazia.', '',
  '## Produções', '', ...productions.map(({lhs, rhs}, i) =>
    (i + 1) + '. ' + lhs + ' → ' + (rhs.join(' ') || EPSILON)),
  '', '## FIRST e FOLLOW', '', '| Não terminal | FIRST | FOLLOW |', '| --- | --- | --- |',
  ...names.map(name => '| ' + name + ' | ' + [...first.get(name)].sort().join(', ') +
    ' | ' + [...follow.get(name)].sort().join(', ') + ' |'),
  '', '## Tabela LL(1)', '', '| Não terminal | Token de antecipação | Produção |', '| --- | --- | --- |',
  ...names.flatMap(name => [...table.get(name)].sort(([a], [b]) => a.localeCompare(b))
    .map(([token, index]) => '| ' + name + ' | ' + token + ' | ' + (index + 1) + ' |')),
  '', 'As células ausentes indicam erro sintático. O gerador rejeita conflitos.', ''
].join('\n');

const q = JSON.stringify;
const header = [
  '// Gerado por tools/generate-grammar.mjs.', '#pragma once', '#include <string>',
  '#include <unordered_map>', '#include <vector>', '',
  'inline const std::vector<std::vector<std::string>> productions = {',
  ...productions.map(({rhs}) => '    {' + rhs.map(value => q(value)).join(', ') + '},'),
  '};', '',
  'inline const std::unordered_map<std::string, std::unordered_map<std::string, size_t>> parseTable = {',
  ...names.map(name => '    {' + q(name) + ', {' + [...table.get(name)]
    .map(([token, index]) => '{' + q(token) + ', ' + index + '}').join(', ') + '}},'),
  '};', ''
].join('\n');

for (const [file, content] of [['docs/grammar.md', documentation], ['src/grammar.generated.hpp', header]]) {
  const target = new URL(file, root);
  fs.mkdirSync(path.dirname(target.pathname.replace(/^\/([A-Z]:)/i, '$1')), {recursive: true});
  fs.writeFileSync(target, content);
}
