import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessProject, KEEP_THRESHOLD } from './classifier.js';

const snap = (platform: string, fields: { upvotes?: number; stars?: number }) => ({
  platform,
  upvotes: fields.upvotes ?? null,
  comments: null,
  stars: fields.stars ?? null,
  forks: null,
});

test('a strong cross-platform dev tool scores 100', () => {
  const result = assessProject(
    { id: 'p1', name: 'Widget', one_liner: 'Fast CLI for deploying apps', category: 'dev-tool' },
    [snap('github', { stars: 500 }), snap('hacker_news', { upvotes: 10 })],
    [{ platform: 'product_hunt' }],
  );
  assert.deepEqual(result, { project_id: 'p1', score: 100, reason: '3 platforms', should_keep: true });
});

test('an empty spammy project is dropped with every reason listed', () => {
  const result = assessProject({ id: 'p2', name: 'my resume', one_liner: null, category: 'other' }, [], []);
  assert.equal(result.score, 20);
  assert.equal(result.should_keep, false);
  assert.equal(result.reason, 'thin description, low engagement, off-topic category, spam keyword in name');
});

test('engagement is normalised per platform and capped', () => {
  const base = { id: 'p3', name: 'Widget', one_liner: 'A thing that does stuff', category: 'other' };
  // 10/20 reddit upvotes → half of 25 → 13 (rounded); single platform → no diversity.
  assert.equal(assessProject(base, [snap('reddit', { upvotes: 10 })], []).score, 20 + 15 + 13 + 10);
  // GitHub uses stars, not upvotes.
  assert.equal(assessProject(base, [snap('github', { upvotes: 999 })], []).score, 20 + 15 + 10);
  // Unknown platforms default to 50 for full credit.
  assert.equal(assessProject(base, [snap('mastodon', { upvotes: 5000 })], []).score, 20 + 15 + 25 + 10);
});

test('category falls back to the name, and name length bands apply', () => {
  const r = assessProject({ id: 'p4', name: 'llm router', one_liner: null, category: null }, [], []);
  assert.equal(r.score, 20 + 15 + 10);
  const long = assessProject({ id: 'p5', name: 'x'.repeat(60), one_liner: null, category: null }, [], []);
  assert.match(long.reason, /long name/);
  const tiny = assessProject({ id: 'p6', name: 'ab', one_liner: null, category: null }, [], []);
  assert.match(tiny.reason, /bad name length/);
  assert.equal(KEEP_THRESHOLD, 40);
});
