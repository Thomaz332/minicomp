import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const ascii = Array.from({length: 128}, (_, i) => String.fromCharCode(i));
const letters = ascii.filter(c => /[a-zA-Z_]/.test(c)).join('');
const digits = '0123456789';
const keywords = {
  read: 'KW_READ', write: 'KW_WRITE', if: 'KW_IF', then: 'KW_THEN',
  else: 'KW_ELSE', while: 'KW_WHILE', do: 'KW_DO', end: 'KW_END'
};
const symbols = {
  ';': 'SEMI', ':=': 'ASSIGN', '(': 'LP', ')': 'RP',
  '=': 'EQ', '!=': 'NE', '<': 'LT', '<=': 'LE',
  '>': 'GT', '>=': 'GE', '+': 'PLUS', '-': 'MINUS', '*': 'STAR',
  '/': 'SLASH', '%': 'MOD'
};
const dfa = (name, final, edges) => ({name, final, edges: edges.flatMap(
  ([from, to, chars]) => [...chars].map(char => [from, to, char])
)});

function trie(name, entries) {
  const final = {};
  const edges = [];
  const prefixes = new Map([['', 0]]);
  for (const [word, token] of Object.entries(entries)) {
    for (let i = 1; i <= word.length; i++) {
      const prefix = word.slice(0, i);
      if (!prefixes.has(prefix)) {
        prefixes.set(prefix, prefixes.size);
        edges.push([prefixes.get(prefix.slice(0, -1)), prefixes.get(prefix), prefix.at(-1)]);
      }
    }
    final[prefixes.get(word)] = token;
  }
  return {name, final, edges};
}

const automata = [
  trie('palavras-reservadas', keywords),
  trie('operadores-e-delimitadores', symbols),
  dfa('identificadores', {1: 'ID'}, [[0, 1, letters], [1, 1, letters + digits]]),
  dfa('numeros', {1: 'INTEGER'}, [[0, 1, digits], [1, 1, digits]])
];
const white = ' \t\r\n\f\v';
const commentChars = ascii.filter(c => c >= ' ' && c <= '~').join('') + '\t\r\n\f\v';
const ignored = [
  dfa('espacos', {1: 'SKIP'}, [[0, 1, white], [1, 1, white]]),
  dfa('comentarios', {2: 'SKIP', 5: 'SKIP'}, [[0, 1, '/'], [1, 2, '/'],
    [2, 2, commentChars.replace(/[\r\n]/g, '')], [1, 3, '*'],
    [3, 4, '*'], [3, 3, commentChars.replace('*', '')], [4, 4, '*'],
    [4, 5, '/'], [4, 3, commentChars.replace(/[*/]/g, '')]])
];
const all = [...automata, ...ignored];
const q = JSON.stringify;
function states(machine) {
  return Math.max(...machine.edges.flatMap(([from, to]) => [from, to])) + 1;
}
const lines = ['// Gerado por tools/generate-lexer.mjs.', '#pragma once', '#include <array>',
  '#include <vector>', '', 'struct Automaton {',
  '    std::vector<std::array<int, 128>> next;', '    std::vector<const char*> accepted;', '};', '',
  'inline const std::vector<Automaton> automata = {'];
for (const machine of all) {
  const count = states(machine);
  const table = Array.from({length: count}, () => Array(128).fill(-1));
  for (const [from, to, char] of machine.edges) table[from][char.charCodeAt(0)] = to;
  lines.push('    {', '        {', ...table.map(row => '            {' + row.join(', ') + '},'),
    '        },', '        {' + Array.from({length: count}, (_, i) =>
      machine.final[i] ? q(machine.final[i]) : 'nullptr').join(', ') + '}', '    },');
}
lines.push('};', '');
fs.writeFileSync(new URL('src/lexer.generated.hpp', root), lines.join('\n'));

const xml = char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;'}[char] ??
  (char.charCodeAt(0) < 32 ? '&#' + char.charCodeAt(0) + ';' : char));
fs.mkdirSync(new URL('jflap/', root), {recursive: true});
for (const machine of all) {
  // XML 1.0 aceita tabulação, LF e CR entre os controles ASCII.
  const edges = machine.edges.filter(([, , char]) => !/[\f\v]/.test(char));
  const document = ['<?xml version="1.0" encoding="UTF-8"?>', '<structure>', '  <type>fa</type>',
    '  <automaton>', ...Array.from({length: states(machine)}, (_, i) => [
      '    <state id="' + i + '" name="q' + i + '">',
      '      <x>' + (75 + 135 * (i % 8)) + '</x>',
      '      <y>' + (90 + 100 * Math.floor(i / 8)) + '</y>',
      ...(i === 0 ? ['      <initial/>'] : []),
      ...(machine.final[i] ? ['      <final/>', '      <label>' + machine.final[i] + '</label>'] : []),
      '    </state>'
    ].join('\n')),
    ...edges.map(([from, to, char]) => '    <transition><from>' + from + '</from><to>' + to +
      '</to><read>' + xml(char) + '</read></transition>'),
    '  </automaton>', '</structure>', ''].join('\n');
  fs.writeFileSync(new URL('jflap/' + machine.name + '.jff', root), document);
}
