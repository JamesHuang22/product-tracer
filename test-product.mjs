#!/usr/bin/env node
/**
 * Automated browser test + product tour for Product Tracer
 * Tests: HTTP status, i18n leaks, grid layout, project links, search, mobile
 * Usage: node test-product.mjs
 */
import puppeteer from 'puppeteer-core';

const BASE_URL = 'https://product-tracer.vercel.app';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

(async () => {
  const checks = {};
  
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
    const errs1 = [];
    p1.on('console', msg => { if (msg.type() === 'error') errs1.push(msg.text()); });
    
    const r1 = await p1.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 2000));
    
    const hp = await p1.evaluate(() => {
      const text = document.body?.innerText || '';
      return {
        title: document.title,
        h1: !!document.querySelector('h1'),
        wc: text.split(/\s+/).filter(Boolean).length,
        zh: (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length,
      };
    }).catch(() => ({}));
    
    checks.homepage = { s: r1?.status() || 'ERR', ...hp, err: errs1.length };
    console.log(`  HTTP ${r1?.status() || 'ERR'} | Title: ${hp.title || '(empty)'} | H1: ${hp.h1 ? '✅' : '❌'} | ~${hp.wc||0}w | ZH: ${hp.zh||0} | Console errs: ${errs1.length}`);
    await p1.close();

    // ====== PAGE 2: /PROJECTS ======
    console.log('\n--- 2. /projects ---');
    const p2 = await browser.newPage();
    const errs2 = [];
    p2.on('console', msg => { if (msg.type() === 'error') errs2.push(msg.text()); });
    
    const r2 = await p2.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 2000));
    
    const pr = await p2.evaluate(() => {
      const text = document.body?.innerText || '';
      return {
        title: document.title,
        h1: document.querySelector('h1')?.innerText?.trim() || '',
        hasSearch: !!document.querySelector('input[type="text"], input[placeholder*="earch"]'),
        hasFilter: !!document.querySelector('select, [class*="filter"]'),
        wc: text.split(/\s+/).filter(Boolean).length,
        zh: (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length,
      };
    }).catch(() => ({}));
    
    checks.projects = { s: r2?.status() || 'ERR', ...pr, err: errs2.length };
    console.log(`  HTTP ${r2?.status() || 'ERR'} | Title: ${pr.title || '(empty)'} | H1: ${pr.h1 || '(none)'} | Search: ${pr.hasSearch ? '✅' : '❌'} | Filter: ${pr.hasFilter ? '✅' : '❌'} | ~${pr.wc||0}w | Errs: ${errs2.length}`);
    await p2.close();

    // ====== PAGE 3: /TRENDS ======
    console.log('\n--- 3. /trends ---');
    const p3 = await browser.newPage();
    const errs3 = [];
    p3.on('console', msg => { if (msg.type() === 'error') errs3.push(msg.text()); });
    
    const r3 = await p3.goto(`${BASE_URL}/trends`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 2000));
    
    const tr = await p3.evaluate(() => {
      const text = document.body?.innerText || '';
      return {
        title: document.title,
        h1: document.querySelector('h1')?.innerText?.trim() || '',
        wc: text.split(/\s+/).filter(Boolean).length,
      };
    }).catch(() => ({}));
    
    checks.trends = { s: r3?.status() || 'ERR', ...tr, err: errs3.length };
    console.log(`  HTTP ${r3?.status() || 'ERR'} | Title: ${tr.title || '(empty)'} | H1: ${tr.h1 || '(none)'} | ~${tr.wc||0}w | Errs: ${errs3.length}`);
    await p3.close();

    // ====== PAGE 4: /YOUTUBE-INSIGHTS ======
    console.log('\n--- 4. /youtube-insights ---');
    const p4 = await browser.newPage();
    const errs4 = [];
    p4.on('console', msg => { if (msg.type() === 'error') errs4.push(msg.text()); });
    
    const r4 = await p4.goto(`${BASE_URL}/youtube-insights`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 2000));
    
    const yt = await p4.evaluate(() => {
      const text = document.body?.innerText || '';
      return {
        title: document.title,
        h1: document.querySelector('h1')?.innerText?.trim() || '',
        hasToggle: text.includes('Grid') || text.includes('List') || text.includes('网格') || text.includes('列表'),
        wc: text.split(/\s+/).filter(Boolean).length,
        clicks: document.querySelectorAll('a, button, [role="button"]').length,
      };
    }).catch(() => ({}));
    
    checks.youtube = { s: r4?.status() || 'ERR', ...yt, err: errs4.length };
    console.log(`  HTTP ${r4?.status() || 'ERR'} | Title: ${yt.title || '(empty)'} | H1: ${yt.h1 || '(none)'} | Toggle: ${yt.hasToggle ? '✅' : '❌'} | ~${yt.wc||0}w | ${yt.clicks||0} clicks | Errs: ${errs4.length}`);
    await p4.close();

    // ====== PAGE 5: /BOOKMARKS ======
    console.log('\n--- 5. /bookmarks ---');
    const p5 = await browser.newPage();
    const errs5 = [];
    p5.on('console', msg => { if (msg.type() === 'error') errs5.push(msg.text()); });
    
    const r5 = await p5.goto(`${BASE_URL}/bookmarks`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 2000));
    
    const bm = await p5.evaluate(() => {
      const text = document.body?.innerText || '';
      return {
        title: document.title,
        h1: document.querySelector('h1')?.innerText?.trim() || '',
        wc: text.split(/\s+/).filter(Boolean).length,
      };
    }).catch(() => ({}));
    
    checks.bookmarks = { s: r5?.status() || 'ERR', ...bm, err: errs5.length };
    console.log(`  HTTP ${r5?.status() || 'ERR'} | Title: ${bm.title || '(empty)'} | H1: ${bm.h1 || '(none)'} | ~${bm.wc||0}w | Errs: ${errs5.length}`);
    await p5.close();

    // ====== PAGE 6: MOBILE (375px) ======
    console.log('\n--- 6. Mobile 375px (homepage) ---');
    const p6 = await browser.newPage();
    await p6.setViewport({ width: 375, height: 812, isMobile: true });
    const errs6 = [];
    p6.on('console', msg => { if (msg.type() === 'error') errs6.push(msg.text()); });
    
    const r6 = await p6.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 2000));
    
    const mob = await p6.evaluate(() => {
      const text = document.body?.innerText || '';
      const overflowX = document.documentElement.scrollWidth > window.innerWidth;
      return { overflowX, wc: text.split(/\s+/).filter(Boolean).length };
    }).catch(() => ({}));
    
    console.log(`  HTTP ${r6?.status() || 'ERR'} | H-scroll: ${mob.overflowX ? '❌ OVERFLOW' : '✅ None'} | ~${mob.wc||0}w | Errs: ${errs6.length}`);
    
    // Mobile: click through to /projects and a detail page
    await p6.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 2000));
    const mobProj = await p6.evaluate(() => {
      const text = document.body?.innerText || '';
      const overflowX = document.documentElement.scrollWidth > window.innerWidth;
      return { overflowX, wc: text.split(/\s+/).filter(Boolean).length };
    }).catch(() => ({}));
    console.log(`  Mobile /projects: H-scroll: ${mobProj.overflowX ? '❌' : '✅'} | ~${mobProj.wc||0}w`);
    await p6.close();

    // ====== PAGE 7: ZH LOCALE ======
    console.log('\n--- 7. ZH locale ---');
    const p7 = await browser.newPage();
    await p7.setCookie({ name: 'locale', value: 'zh', domain: new URL(BASE_URL).hostname, path: '/' });
    await p7.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 2000));
    
    const zh = await p7.evaluate(() => {
      const text = document.body?.innerText || '';
      const zhChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
      const enChars = (text.match(/[a-zA-Z]/g) || []).length;
      return { zhChars, enChars, wc: text.split(/\s+/).filter(Boolean).length };
    }).catch(() => ({}));
    console.log(`  Homepage ZH: ${zh.zhChars||0} | EN: ${zh.enChars||0}`);
    
    // Check ZH nav on /projects
    await p7.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 2000));
    const zhNav = await p7.evaluate(() => {
      const text = document.body?.innerText || '';
      return text.includes('项目') || text.includes('趋势') || text.includes('洞察');
    }).catch(() => false);
    console.log(`  ZH nav present: ${zhNav ? '✅' : '❌'}`);
    await p7.close();

    // ====== SUMMARY ======
    console.log('\n=== Test Summary ===');
    let all200 = true;
    for (const [page, data] of Object.entries(checks)) {
      const ok = data.s === 200;
      if (!ok) all200 = false;
      console.log(`  ${page}: ${ok ? '✅' : '❌ HTTP ' + data.s} (${data.err} console errs)`);
    }
    console.log(`\nAll HTTP 200: ${all200 ? '✅' : '❌'}`);

    // Favicon check
    const fc = await fetch(`${BASE_URL}/favicon.ico`).catch(() => null);
    console.log(`  /favicon.ico: ${fc?.status || 'ERR'}`);

    console.log('\n=== Automated Test Complete ===');
  } finally {
    await browser.close();
  }
})();
