#!/usr/bin/env node
/**
 * Automated browser test + product tour for Product Tracer
 * Tests: HTTP status, i18n leaks, grid layout, project links, search, mobile
 * Usage: node test-product.cjs
 */
const puppeteer = require('puppeteer-core');

const BASE_URL = 'https://product-tracer.vercel.app';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function waitForNetwork(page, timeout = 12000) {
  try {
    await page.goto(page.url(), { waitUntil: 'networkidle0', timeout });
  } catch (e) {
    // timeout is fine, continue
  }
}

(async () => {
  const results = { pages: [], bugs: [], checks: {} };
  
  console.log('=== Product Tracer Automated Test ===\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1400,900']
  });

  try {
    // ====== PAGE 1: HOMEPAGE ======
    console.log('--- 1. Homepage (/) ---');
    const p1 = await browser.newPage();
    const consoleErrors1 = [];
    p1.on('console', msg => { if (msg.type() === 'error') consoleErrors1.push(msg.text()); });
    
    const resp1 = await p1.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 2000));
    
    const hpStatus = await p1.evaluate(() => {
      const text = document.body?.innerText || '';
      return {
        h1: !!document.querySelector('h1'),
        title: document.title,
        hasProjects: text.includes('Project') || text.includes('项目'),
        hasInsights: text.includes('Insight') || text.includes('洞察'),
        hasNav: !!document.querySelector('nav, header'),
        wordCount: text.split(/\s+/).filter(Boolean).length,
        charCount: text.length,
        zhChars: (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length,
      };
    }).catch(() => ({}));
    
    const hpHttpStatus = resp1 ? resp1.status() : 'ERR';
    results.checks.homepage = { status: hpHttpStatus, ...hpStatus, errors: consoleErrors1.length };
    console.log(`  HTTP: ${hpHttpStatus}`);
    console.log(`  Title: ${hpStatus.title || '(empty)'}`);
    console.log(`  H1: ${hpStatus.h1 ? '✅' : '❌'}`);
    console.log(`  Words: ~${hpStatus.wordCount || 0}`);
    console.log(`  ZH chars: ${hpStatus.zhChars || 0}`);
    console.log(`  Console errors: ${consoleErrors1.length}`);
    
    await p1.close();

    // ====== PAGE 2: /PROJECTS ======
    console.log('\n--- 2. /projects ---');
    const p2 = await browser.newPage();
    const consoleErrors2 = [];
    p2.on('console', msg => { if (msg.type() === 'error') consoleErrors2.push(msg.text()); });
    
    const resp2 = await p2.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 2000));
    
    const projStatus = await p2.evaluate(() => {
      const text = document.body?.innerText || '';
      const links = [...document.querySelectorAll('a[href*="/projects/"]')].slice(0, 5).map(a => a.href);
      return {
        title: document.title,
        h1: document.querySelector('h1')?.innerText?.trim() || '',
        hasSearch: !!document.querySelector('input[type="text"], input[placeholder*="earch"]'),
        hasFilter: !!document.querySelector('select, [class*="filter"]'),
        hasBookmarkBtns: document.body.innerText.includes('Bookmark') || document.querySelectorAll('[class*="bookmark"]').length > 0,
        projectLinks: links,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        zhChars: (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length,
      };
    }).catch(() => ({}));
    
    const projHttp = resp2 ? resp2.status() : 'ERR';
    results.checks.projects = { status: projHttp, ...projStatus, errors: consoleErrors2.length };
    console.log(`  HTTP: ${projHttp}`);
    console.log(`  Title: ${projStatus.title || '(empty)'}`);
    console.log(`  H1: ${projStatus.h1 || '(none)'}`);
    console.log(`  Search: ${projStatus.hasSearch ? '✅' : '❌'}`);
    console.log(`  Filter: ${projStatus.hasFilter ? '✅' : '❌'}`);
    console.log(`  Bookmarks: ${projStatus.hasBookmarkBtns ? '✅' : '❌'}`);
    console.log(`  Project links: ${(projStatus.projectLinks || []).length}`);
    console.log(`  Console errors: ${consoleErrors2.length}`);
    
    await p2.close();

    // ====== PAGE 3: /TRENDS ======
    console.log('\n--- 3. /trends ---');
    const p3 = await browser.newPage();
    const consoleErrors3 = [];
    p3.on('console', msg => { if (msg.type() === 'error') consoleErrors3.push(msg.text()); });
    
    const resp3 = await p3.goto(`${BASE_URL}/trends`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 2000));
    
    const trendsStatus = await p3.evaluate(() => {
      const text = document.body?.innerText || '';
      return {
        title: document.title,
        h1: document.querySelector('h1')?.innerText?.trim() || '',
        hasTrends: text.length > 50,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        zhChars: (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length,
      };
    }).catch(() => ({}));
    
    const trendsHttp = resp3 ? resp3.status() : 'ERR';
    results.checks.trends = { status: trendsHttp, ...trendsStatus, errors: consoleErrors3.length };
    console.log(`  HTTP: ${trendsHttp}`);
    console.log(`  Title: ${trendsStatus.title || '(empty)'}`);
    console.log(`  H1: ${trendsStatus.h1 || '(none)'}`);
    console.log(`  Content: ~${trendsStatus.wordCount || 0} words`);
    console.log(`  Console errors: ${consoleErrors3.length}`);
    
    await p3.close();

    // ====== PAGE 4: /YOUTUBE-INSIGHTS ======
    console.log('\n--- 4. /youtube-insights ---');
    const p4 = await browser.newPage();
    const consoleErrors4 = [];
    p4.on('console', msg => { if (msg.type() === 'error') consoleErrors4.push(msg.text()); });
    
    const resp4 = await p4.goto(`${BASE_URL}/youtube-insights`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 2000));
    
    const ytStatus = await p4.evaluate(() => {
      const text = document.body?.innerText || '';
      return {
        title: document.title,
        h1: document.querySelector('h1')?.innerText?.trim() || '',
        hasGridToggle: text.includes('Grid') || text.includes('List') || text.includes('网格') || text.includes('列表'),
        hasContent: text.length > 100,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        zhChars: (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length,
        clickableCards: document.querySelectorAll('a, button, [role="button"]').length,
      };
    }).catch(() => ({}));
    
    const ytHttp = resp4 ? resp4.status() : 'ERR';
    results.checks.youtube = { status: ytHttp, ...ytStatus, errors: consoleErrors4.length };
    console.log(`  HTTP: ${ytHttp}`);
    console.log(`  Title: ${ytStatus.title || '(empty)'}`);
    console.log(`  H1: ${ytStatus.h1 || '(none)'}`);
    console.log(`  Grid/List toggle: ${ytStatus.hasGridToggle ? '✅' : '❌'}`);
    console.log(`  Content: ~${ytStatus.wordCount || 0} words`);
    console.log(`  Clickable elements: ${ytStatus.clickableCards || 0}`);
    console.log(`  Console errors: ${consoleErrors4.length}`);
    
    await p4.close();

    // ====== PAGE 5: /BOOKMARKS ======
    console.log('\n--- 5. /bookmarks ---');
    const p5 = await browser.newPage();
    const consoleErrors5 = [];
    p5.on('console', msg => { if (msg.type() === 'error') consoleErrors5.push(msg.text()); });
    
    const resp5 = await p5.goto(`${BASE_URL}/bookmarks`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 2000));
    
    const bmStatus = await p5.evaluate(() => {
      const text = document.body?.innerText || '';
      return {
        title: document.title,
        h1: document.querySelector('h1')?.innerText?.trim() || '',
        wordCount: text.split(/\s+/).filter(Boolean).length,
      };
    }).catch(() => ({}));
    
    const bmHttp = resp5 ? resp5.status() : 'ERR';
    results.checks.bookmarks = { status: bmHttp, ...bmStatus, errors: consoleErrors5.length };
    console.log(`  HTTP: ${bmHttp}`);
    console.log(`  Title: ${bmStatus.title || '(empty)'}`);
    console.log(`  H1: ${bmStatus.h1 || '(none)'}`);
    console.log(`  Console errors: ${consoleErrors5.length}`);
    
    await p5.close();

    // ====== PAGE 6: MOBILE (375px) ======
    console.log('\n--- 6. Mobile viewport (375px) ---');
    const p6 = await browser.newPage();
    await p6.setViewport({ width: 375, height: 812, isMobile: true });
    const consoleErrors6 = [];
    p6.on('console', msg => { if (msg.type() === 'error') consoleErrors6.push(msg.text()); });
    
    const resp6 = await p6.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 2000));
    
    const mobStatus = await p6.evaluate(() => {
      const text = document.body?.innerText || '';
      const overflowX = document.documentElement.scrollWidth > window.innerWidth;
      return {
        overflowX,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        zhChars: (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length,
        navLinks: document.querySelectorAll('nav a, header a').length,
      };
    }).catch(() => ({}));
    
    console.log(`  HTTP: ${resp6 ? resp6.status() : 'ERR'}`);
    console.log(`  Horizontal scroll: ${mobStatus.overflowX ? '❌ OVERFLOW' : '✅ None'}`);
    console.log(`  Words: ~${mobStatus.wordCount || 0}`);
    console.log(`  Console errors: ${consoleErrors6.length}`);
    
    await p6.close();

    // ====== PAGE 7: ZH LOCALE ======
    console.log('\n--- 7. ZH locale ---');
    const p7 = await browser.newPage();
    // Set locale via cookie
    await p7.setCookie({ name: 'locale', value: 'zh', domain: new URL(BASE_URL).hostname, path: '/' });
    await p7.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 2000));
    
    const zhStatus = await p7.evaluate(() => {
      const text = document.body?.innerText || '';
      const zhChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
      const enChars = (text.match(/[a-zA-Z]/g) || []).length;
      return { zhChars, enChars, wordCount: text.split(/\s+/).filter(Boolean).length };
    }).catch(() => ({}));
    
    console.log(`  ZH chars: ${zhStatus.zhChars || 0}, EN chars: ${zhStatus.enChars || 0}`);
    const zhRatio = zhStatus.zhChars > 0 && zhStatus.enChars > 0 ? (zhStatus.zhChars / zhStatus.enChars).toFixed(2) : 'N/A';
    console.log(`  ZH/EN ratio: ${zhRatio}`);
    // Project data is intentionally English, only chrome is translated. Check nav has Chinese.
    await p7.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 2000));
    const zhNav = await p7.evaluate(() => {
      const text = document.body?.innerText || '';
      return text.includes('项目') || text.includes('趋势') || text.includes('洞察');
    }).catch(() => false);
    console.log(`  ZH nav items: ${zhNav ? '✅' : '❌'}`);
    
    await p7.close();

    // ====== SUMMARY ======
    console.log('\n=== Test Summary ===');
    let allGood = true;
    for (const [page, data] of Object.entries(results.checks)) {
      const status = data.status;
      const ok = status === 200;
      if (!ok) allGood = false;
      console.log(`  ${page}: ${ok ? '✅' : '❌ HTTP ' + status}`);
    }
    console.log(`\nTotal pages: ${Object.keys(results.checks).length}`);
    console.log(`All passing: ${allGood ? '✅ Yes' : '❌ No'}`);
    
    // Check favicon
    console.log('\n--- Extras ---');
    const favResp = await fetch(`${BASE_URL}/favicon.ico`).catch(() => null);
    console.log(`  /favicon.ico: ${favResp?.status || 'ERR'}`);

    console.log('\n=== Automated Test Complete ===');
    return results;
  } finally {
    await browser.close();
  }
})();
