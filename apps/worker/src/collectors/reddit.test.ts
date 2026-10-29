import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNoisePost, parseRedditRss, postSlug, type RedditPost } from './reddit.js';

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>t3_abc123</id>
    <title>I built a widget &amp; it&#39;s live</title>
    <link href="https://www.reddit.com/r/SideProject/comments/abc123/i_built_a_widget/" />
    <published>2026-01-02T03:04:05+00:00</published>
    <category term="SideProject" label="r/SideProject"/>
    <content type="html">&lt;a href=&quot;https://github.com/acme/widget&quot;&gt;[link]&lt;/a&gt;</content>
  </entry>
  <entry>
    <id>t3_self1</id>
    <title>Text post</title>
    <link href="https://www.reddit.com/r/startups/comments/self1/text_post/" />
    <content type="html">just text</content>
  </entry>
  <entry>
    <title>No id, skipped</title>
  </entry>
</feed>`;

test('parseRedditRss extracts link posts with decoded titles and the [link] URL', () => {
  const [post] = parseRedditRss(FEED, 'fallback');
  assert.deepEqual(post, {
    id: 'abc123',
    title: "I built a widget & it's live",
    selftext: '',
    url: 'https://github.com/acme/widget',
    score: 0,
    num_comments: 0,
    created_utc: Date.parse('2026-01-02T03:04:05Z') / 1000,
    subreddit: 'SideProject',
    permalink: '/r/SideProject/comments/abc123/i_built_a_widget/',
  });
});

test('parseRedditRss falls back to entry link and fallback subreddit, skips id-less entries', () => {
  const posts = parseRedditRss(FEED, 'fallback');
  assert.equal(posts.length, 2);
  const self = posts[1]!;
  assert.equal(self.url, 'https://www.reddit.com/r/startups/comments/self1/text_post/');
  assert.equal(self.subreddit, 'fallback');
  assert.ok(Number.isFinite(self.created_utc));
});

test('parseRedditRss returns [] for a feed with no entries', () => {
  assert.deepEqual(parseRedditRss('<feed></feed>', 'x'), []);
});

function post(title: string): RedditPost {
  return {
    id: 'p1',
    title,
    selftext: '',
    url: '',
    score: 0,
    num_comments: 0,
    created_utc: 0,
    subreddit: 'SideProject',
    permalink: '',
  };
}

test('isNoisePost flags megathreads, hiring and blank titles', () => {
  assert.equal(isNoisePost(post('I launched my first SaaS')), false);
  assert.equal(isNoisePost(post('Weekly feedback thread')), true);
  assert.equal(isNoisePost(post('Who is hiring? (May)')), true);
  assert.equal(isNoisePost(post('   ')), true);
});

test('postSlug slugifies the title and falls back to the id', () => {
  assert.equal(postSlug(post('I launched my first SaaS!')), 'i-launched-my-first-saas');
  assert.equal(postSlug(post('???')), 'reddit-p1');
});
