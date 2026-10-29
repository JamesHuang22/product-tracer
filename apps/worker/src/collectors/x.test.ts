import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Tweet } from 'agent-twitter-client';
import { handleFromUrl, isProductTweet, normalizeTweet, xPostSlug } from './x.js';

test('normalizeTweet maps fields, defaults counts and keeps only external URLs', () => {
  const post = normalizeTweet({
    id: '123',
    text: 'Shipped v2 https://widget.dev',
    username: 'Founder',
    urls: ['https://widget.dev', 'https://x.com/founder/status/1', 'https://t.co/abc', 'not a url'],
    timeParsed: new Date('2026-01-01T00:00:00Z'),
    isRetweet: true,
  } as Tweet);
  assert.deepEqual(post, {
    id: '123',
    text: 'Shipped v2 https://widget.dev',
    username: 'Founder',
    userId: null,
    likes: 0,
    retweets: 0,
    replies: 0,
    views: null,
    urls: ['https://widget.dev'],
    permanentUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    isRetweet: true,
    isReply: false,
  });
});

test('normalizeTweet rejects tweets without id or text', () => {
  assert.equal(normalizeTweet({ text: 'hi' } as Tweet), null);
  assert.equal(normalizeTweet({ id: '1' } as Tweet), null);
});

test('isProductTweet accepts links or launch language, rejects chatter', () => {
  const base = normalizeTweet({ id: '1', text: 'good morning' } as Tweet)!;
  assert.equal(isProductTweet(base), false);
  assert.equal(isProductTweet({ ...base, text: 'We just launched our beta' }), true);
  assert.equal(isProductTweet({ ...base, urls: ['https://widget.dev'] }), true);
});

test('xPostSlug is stable per handle + tweet id', () => {
  const post = normalizeTweet({ id: '99', text: 't', username: 'Some_User' } as Tweet)!;
  assert.equal(xPostSlug(post), 'x-some-user-99');
  assert.equal(xPostSlug({ ...post, username: '' }), 'x-x-99');
});

test('handleFromUrl extracts profile handles and rejects other paths', () => {
  assert.equal(handleFromUrl('https://x.com/levelsio'), 'levelsio');
  assert.equal(handleFromUrl('https://mobile.twitter.com/@levelsio/status/1'), 'levelsio');
  assert.equal(handleFromUrl('https://x.com/i/flow/login'), null);
  assert.equal(handleFromUrl('https://x.com/'), null);
  assert.equal(handleFromUrl('https://example.com/levelsio'), null);
  assert.equal(handleFromUrl('not a url'), null);
  assert.equal(handleFromUrl(null), null);
});
