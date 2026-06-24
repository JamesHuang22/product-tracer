#!/usr/bin/env node
/**
 * Quick sanity: /projects detail pages, ZH locale, search
 * Run: node quick-sanity.mjs
 */
import puppeteer from 'puppeteer-core';

const BASE_URL = 'https://product-tracer.vercel.app';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

(async () => {
  console.log('=== Quick Sanity Check ===\n');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800']
  });

  try {
    // 1. /projects page - search, filter, cards
    console.log('--- 1. /projects ---');
    const p = await browser.newPage();
    let errors = [];
    p.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await p.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    const projectCount = await p.evaluate(() => document.querySelectorAll('[class*="card"], tr, [class*="row"]').length);
    console.log(`  Project elements visible: ${projectCount}`);

    // Check for search input
    const hasSearch = await p.evaluate(() => !!document.querySelector('input[type="text"], input[placeholder*="Search"], input[placeholder*="search"]'));
    console.log(`  Search input: ${hasSearch ? '✅' : '❌'}`);

    // Check for category filter
    const hasFilter = await p.evaluate(() => !!document.querySelector('select, [class*="filter"], [class*="category"]'));
    console.log(`  Category filter: ${hasFilter ? '✅' : '❌'}`);

    // Check for tag chips 
    const hasTags = await p.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('#') && document.querySelectorAll('[class*="tag"], [class*="chip"]').length > 0;
    });
    console.log(`  Tag chips: ${hasTags ? '✅' : '❌'}`);

    // Check bookmark buttons
    const hasBookmark = await p.evaluate(() => {
      return document.querySelectorAll('[class*="bookmark"], button svg').length > 0;
    });
    console.log(`  Bookmark buttons: ${hasBookmark ? '✅' : '❌'}`);

    console.log(`  Console errors: ${errors.length}${errors.length ? ' ' + errors.join(', ') : ''}`);

    await p.close();

    // 2. Detail page
    console.log('\n--- 2. /projects/[slug] ---');
    const dp = await browser.newPage();
    errors = [];
    dp.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await dp.goto(`${BASE_URL}/projects/speakup`, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    const detailStatus = await dp.evaluate(() => {
      return {
        h1: document.querySelector('h1')?.innerText?.trim(),
        breadcrumb: document.body.innerText.includes('Projects') && (document.body.innerText.includes('>') || document.querySelector('nav[aria-label*="breadcrumb"], ol li')),
        aiSummary: document.body.innerText.includes('AI') || document.body.innerText.includes('summary') || document.body.innerText.includes('Summary'),
        related: document.body.innerText.includes('You might') || document.body.innerText.includes('Related') || document.body.innerText.includes('猜你喜欢'),
        bookmarkBtn: document.body.innerText.includes('Bookmark') || document.body.innerText.includes('bookmark'),
        tags: document.body.innerText.includes('#')
      };
    });
    console.log(`  H1: ${detailStatus.h1}`);
    console.log(`  Breadcrumb: ${detailStatus.breadcrumb ? '✅' : '❌'}`);
    console.log(`  AI Summary: ${detailStatus.aiSummary ? '✅' : '❌'}`);
    console.log(`  Related projects: ${detailStatus.related ? '✅' : '❌'}`);
    console.log(`  Bookmark button: ${detailStatus.bookmarkBtn ? '✅' : '❌'}`);
    console.log(`  Tags: ${detailStatus.tags ? '✅' : '❌'}`);
    console.log(`  Console errors: ${errors.length}${errors.length ? ' ' + errors.join(', ') : ''}`);
    await dp.close();

    // 3. ZH locale
    console.log('\n--- 3. ZH locale ---');
    const zhp = await browser.newPage();
    await zhp.setExtraHTTPHeaders({ 'Cookie': 'locale=zh' });
    await zhp.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    const zhText = await zhp.evaluate(() => document.body.innerText);
    const zhCharCount = (zhText.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
    const enCharCount = (zhText.match(/[a-zA-Z]/g) || []).length;
    console.log(`  ZH chars: ${zhCharCount}, EN chars: ${enCharCount}`);
    console.log(`  Ratio: ${zhCharCount > enCharCount * 0.2 ? '✅ Acceptable' : '❌ Mostly English'}`);

    // Check nav items localized
    const hasZhNav = await zhp.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('项目') || text.includes('趋势') || text.includes('洞察');
    });
    console.log(`  ZH nav items: ${hasZhNav ? '✅' : '❌'}`);

    // Check detail page in ZH
    await zhp.goto(`${BASE_URL}/projects/speakup`, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
    const zhDetailText = await zhp.evaluate(() => document.body.innerText);
    const zhDetailChars = (zhDetailText.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
    console.log(`  ZH detail page ZH chars: ${zhDetailChars}`);
    await zhp.close();

    // 4. /trends page
    console.log('\n--- 4. /trends ---');
    const tp = await browser.newPage();
    errors = [];
    tp.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await tp.goto(`${BASE_URL}/trends`, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
    const trendsContent = await tp.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasWeekLabel: text.includes('Week'),
        hasTopProducts: text.includes('Top') || text.includes('Top'),
        hasWoW: text.includes('week') || text.includes('WoW'),
        hasChart: !!document.querySelector('[class*="chart"], [class*="bar"]'),
        productCount: text.split('\n').filter(l => l.trim().length > 0 && l.trim().length < 40).length
      };
    });
    console.log(`  Week label: ${trendsContent.hasWeekLabel ? '✅' : '❌'}`);
    console.log(`  Top products: ${trendsContent.hasTopProducts ? '✅' : '❌'}`);
    console.log(`  WoW comparison: ${trendsContent.hasWoW ? '✅' : '❌'}`);
    console.log(`  Bar chart: ${trendsContent.hasChart ? '✅' : '❌'}`);
    console.log(`  Console errors: ${errors.length}${errors.length ? ' ' + errors.join(', ') : ''}`);
    await tp.close();

    // 5. /youtube-insights
    console.log('\n--- 5. /youtube-insights ---');
    const yp = await browser.newPage();
    errors = [];
    yp.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await yp.goto(`${BASE_URL}/youtube-insights`, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
    const ytContent = await yp.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasTitle: text.includes('Insight') || text.includes('YouTube'),
        hasGridToggle: text.includes('Grid') || text.includes('List'),
        categoryChips: !!document.querySelectorAll('[class*="chip"], [class*="tag"], button').length,
        insightCards: document.querySelectorAll('article, [class*="card"]').length,
        insightsCount: text.split('\n').filter(l => l.trim().length > 10).length
      };
    });
    console.log(`  Title/heading: ${ytContent.hasTitle ? '✅' : '❌'}`);
    console.log(`  Grid/List toggle: ${ytContent.hasGridToggle ? '✅' : '❌'}`);
    console.log(`  Category chips: ${ytContent.categoryChips ? '✅' : '❌'}`);
    console.log(`  Insight cards: ${ytContent.insightCards}`);
    console.log(`  Console errors: ${errors.length}${errors.length ? ' ' + errors.join(', ') : ''}`);
    await yp.close();

    console.log('\n=== Quick Sanity Complete ===');
  } finally {
    await browser.close();
  }
})();
