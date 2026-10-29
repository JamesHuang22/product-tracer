import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractDescriptionUrls, extractGithubUrls } from './youtube.js';

test('extractGithubUrls normalises, dedupes and drops reserved routes', () => {
  const text = `
    Repo: https://github.com/Acme/Widget/tree/main.
    Again https://github.com/acme/widget.git, and https://github.com/other/thing?tab=readme
    Not a repo: https://github.com/topics/ai https://github.com/sponsors/acme
  `;
  assert.deepEqual(extractGithubUrls(text), [
    'https://github.com/acme/widget',
    'https://github.com/other/thing',
  ]);
  assert.deepEqual(extractGithubUrls(''), []);
});

test('extractDescriptionUrls keeps off-platform links and strips trailing punctuation', () => {
  const text = 'Try https://widget.dev! Sub: https://www.youtube.com/@me and https://youtu.be/abc. Docs https://docs.widget.dev/start, ok';
  assert.deepEqual(extractDescriptionUrls(text), ['https://widget.dev', 'https://docs.widget.dev/start']);
  assert.deepEqual(extractDescriptionUrls(''), []);
});
