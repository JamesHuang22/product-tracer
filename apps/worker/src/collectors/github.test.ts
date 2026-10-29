import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNoiseRepo, isStaleRepo, repoSlug, type GithubRepo } from './github.js';

function repo(overrides: Partial<GithubRepo> = {}): GithubRepo {
  return {
    id: 1,
    full_name: 'acme/widget',
    name: 'widget',
    html_url: 'https://github.com/acme/widget',
    description: 'A fast widget engine',
    language: 'TypeScript',
    stargazers_count: 10,
    forks_count: 0,
    open_issues_count: 0,
    topics: [],
    owner: { login: 'acme', html_url: 'https://github.com/acme', type: 'User' },
    created_at: new Date().toISOString(),
    pushed_at: new Date().toISOString(),
    ...overrides,
  };
}

test('isNoiseRepo keeps a normal repo', () => {
  assert.equal(isNoiseRepo(repo()), false);
});

test('isNoiseRepo flags noise descriptions, topics and garbage names', () => {
  assert.equal(isNoiseRepo(repo({ description: 'Awesome curated list of tools' })), true);
  assert.equal(isNoiseRepo(repo({ description: 'LeetCode solutions' })), true);
  assert.equal(isNoiseRepo(repo({ topics: ['cli', 'interview-preparation'] })), true);
  assert.equal(isNoiseRepo(repo({ name: '---' })), true);
  assert.equal(isNoiseRepo(repo({ name: 'a'.repeat(81) })), true);
});

test('isNoiseRepo tolerates a null description', () => {
  assert.equal(isNoiseRepo(repo({ description: null })), false);
});

test('isStaleRepo drops repos untouched for > 6 months unless popular', () => {
  const old = new Date(Date.now() - 200 * 86_400_000).toISOString();
  assert.equal(isStaleRepo(repo({ pushed_at: old })), true);
  assert.equal(isStaleRepo(repo({ pushed_at: old, stargazers_count: 1001 })), false);
  assert.equal(isStaleRepo(repo()), false);
  assert.equal(isStaleRepo(repo({ pushed_at: 'not-a-date' })), false);
});

test('repoSlug lowercases and collapses non-alphanumerics', () => {
  assert.equal(repoSlug('Acme/My_Cool.Repo'), 'acme-my-cool-repo');
  assert.equal(repoSlug('--x--/--y--'), 'x-y');
});
