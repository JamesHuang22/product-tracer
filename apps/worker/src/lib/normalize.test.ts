import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeText, NAME_MAX_LEN, ONE_LINER_MAX_LEN } from './normalize.js';

test('returns null for nullish or empty input', () => {
  assert.equal(normalizeText(null), null);
  assert.equal(normalizeText(undefined), null);
  assert.equal(normalizeText(''), null);
  assert.equal(normalizeText('   '), null);
  assert.equal(normalizeText('\n\t  \r'), null);
});

test('trims and collapses internal whitespace and newlines', () => {
  assert.equal(normalizeText('  hello   world  '), 'hello world');
  assert.equal(normalizeText('a\nmulti\tline\r\ntagline'), 'a multi line tagline');
});

test('strips layout-hostile control characters', () => {
  const zwsp = String.fromCharCode(0x200b); // zero-width space
  const bidi = String.fromCharCode(0x202e); // right-to-left override
  const bom = String.fromCharCode(0xfeff); // BOM / zero-width no-break space
  const input = `he${zwsp}llo${bidi}world${bom}`;
  assert.equal(normalizeText(input), 'he llo world');
});

test('passes through normal text unchanged', () => {
  assert.equal(normalizeText('A normal one-liner.'), 'A normal one-liner.');
});

test('caps length and truncates on a word boundary with an ellipsis', () => {
  const long = 'word '.repeat(100).trim(); // 499 chars
  const out = normalizeText(long, 50);
  assert.ok(out!.length <= 51, `expected <= 51, got ${out!.length}`);
  assert.ok(out!.endsWith('…'));
  assert.ok(!out!.includes('  '));
});

test('hard-truncates a single oversized token (no usable boundary)', () => {
  const out = normalizeText('x'.repeat(400), 50);
  assert.equal(out!.length, 51); // 50 chars + ellipsis
  assert.ok(out!.endsWith('…'));
});

test('exposes sane default caps', () => {
  assert.equal(NAME_MAX_LEN, 120);
  assert.equal(ONE_LINER_MAX_LEN, 280);
  assert.equal(normalizeText('short'), 'short'); // default cap doesn't truncate short text
});
