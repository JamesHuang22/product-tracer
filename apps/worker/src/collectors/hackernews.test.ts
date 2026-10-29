import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanShowHnTitle, extractGithubRepo, storySlug } from './hackernews.js';

test('extractGithubRepo normalises repo URLs to owner/repo', () => {
  assert.equal(extractGithubRepo('https://github.com/Acme/Widget'), 'acme/widget');
  assert.equal(extractGithubRepo('https://github.com/acme/widget/'), 'acme/widget');
  assert.equal(extractGithubRepo('https://github.com/acme/widget.git'), 'acme/widget');
  assert.equal(extractGithubRepo('https://github.com/acme/widget/tree/main/src'), 'acme/widget');
  assert.equal(extractGithubRepo('http://github.com/acme/widget?tab=readme#top'), 'acme/widget');
});

test('extractGithubRepo rejects non-repo URLs', () => {
  assert.equal(extractGithubRepo(undefined), null);
  assert.equal(extractGithubRepo(''), null);
  assert.equal(extractGithubRepo('https://github.com/acme'), null);
  assert.equal(extractGithubRepo('https://github.com/topics/cli'), null);
  assert.equal(extractGithubRepo('https://gitlab.com/acme/widget'), null);
});

test('cleanShowHnTitle strips the Show HN prefix variants', () => {
  assert.equal(cleanShowHnTitle('Show HN: Widget'), 'Widget');
  assert.equal(cleanShowHnTitle('show hn - Widget'), 'Widget');
  assert.equal(cleanShowHnTitle('Show HN — Widget '), 'Widget');
  assert.equal(cleanShowHnTitle('Ask HN: Why?'), 'Ask HN: Why?');
});

test('storySlug builds from the cleaned title and falls back to the id', () => {
  assert.equal(storySlug({ id: 7, type: 'story', time: 0, title: 'Show HN: My Cool App!' }), 'my-cool-app');
  assert.equal(storySlug({ id: 7, type: 'story', time: 0, title: 'Show HN: 日本語' }), 'hn-7');
  assert.equal(storySlug({ id: 7, type: 'story', time: 0 }), 'hn-7');
  assert.equal(storySlug({ id: 7, type: 'story', time: 0, title: 'x'.repeat(100) }).length, 80);
});
