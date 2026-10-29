import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNoiseProduct, productSlug, type PHProduct } from './producthunt.js';

function product(overrides: Partial<PHProduct> = {}): PHProduct {
  return {
    id: 42,
    name: 'Widget',
    tagline: 'Build widgets faster',
    url: 'https://www.producthunt.com/posts/widget',
    votesCount: 0,
    commentsCount: 0,
    createdAt: '2026-01-01T00:00:00Z',
    topics: ['Developer Tools'],
    website: 'https://widget.dev',
    ...overrides,
  };
}

test('isNoiseProduct keeps a normal product', () => {
  assert.equal(isNoiseProduct(product()), false);
});

test('isNoiseProduct flags blank names, deal wording and deal topics', () => {
  assert.equal(isNoiseProduct(product({ name: '  ' })), true);
  assert.equal(isNoiseProduct(product({ name: 'Black Friday Bundle' })), true);
  assert.equal(isNoiseProduct(product({ tagline: '50% discount on everything' })), true);
  assert.equal(isNoiseProduct(product({ topics: ['Tech Deals'] })), true);
});

test('productSlug slugifies the name and falls back to the id', () => {
  assert.equal(productSlug(product({ name: 'Widget Pro 2.0' })), 'widget-pro-2-0');
  assert.equal(productSlug(product({ name: '!!!' })), 'ph-42');
});
