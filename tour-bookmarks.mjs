#!/usr/bin/env node
/**
 * Product Tour Focus: /bookmarks — bookmark flow end-to-end
 * Tests: bookmarking a project, /bookmarks page rendering, empty/loaded states, ZH locale, mobile
 */
import puppeteer from 'puppeteer-core';

const BASE_URL = 'https://product-tracer.vercel.app';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TS = new Date().toISOString();

(async () => {
  const findings = [];
  function bug(severity, page, desc, steps, expected, actual) {
    findings.push({ severity, page, desc, steps, expected, actual, ts: TS });
  }

  console.log(`=== /bookmarks Product Tour (${TS}) ===\n`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    // --- PART 1: /bookmarks page (empty state) ---
    console.log('--- 1. /bookmarks (fresh/empty) ---');
    const p = await browser.newPage();
    p.on('console', msg => { if (msg.type() === 'error') console.log('  CONSOLE ERROR:', msg.text()); });
    p.on('pageerror', err => console.log('  PAGE ERROR:', err.message));
    await p.setViewport({ width: 1400, height: 900 });

    const resp1 = await p.goto(`${BASE_URL}/bookmarks`, { waitUntil: 'networkidle0', timeout: 15000 });
    console.log(`  HTTP ${resp1.status()}`);
    await new Promise(r => setTimeout(r, 2000));

    const emptyState = await p.evaluate(() => {
      const text = document.body.innerText;
      return {
        h1: document.querySelector('h1')?.innerText?.trim() || '',
        pCount: document.querySelectorAll('p').length,
        aCount: document.querySelectorAll('a').length,
        buttonCount: document.querySelectorAll('button').length,
        text,
        hasEmptyMsg: text.includes('no bookmark') || text.includes('No bookmark') || text.includes("haven't") || text.includes('nothing'),
        hasBrowseCta: text.includes('Browse') || text.includes('Discover') || text.includes('explore'),
        wordCount: text.split(/\s+/).length,
        metaDescription: document.querySelector('meta[name="description"]')?.content || '',
      };
    });
    console.log(`  H1: "${emptyState.h1}"`);
    console.log(`  Empty message: ${emptyState.hasEmptyMsg ? '✅' : '❌'}`);
    console.log(`  Browse CTA: ${emptyState.hasBrowseCta ? '✅' : '❌'}`);
    console.log(`  Meta description: "${emptyState.metaDescription}"`);
    console.log(`  Page text: ${emptyState.wordCount} words`);
    console.log(`  <a> links: ${emptyState.aCount}`);
    console.log(`  <button> buttons: ${emptyState.buttonCount}`);

    if (emptyState.h1 === 'Bookmarks' && !emptyState.hasEmptyMsg && emptyState.wordCount < 30) {
      bug('P2', '/bookmarks',
        'Empty bookmarks page has no helpful message or CTA',
        'Go to /bookmarks with no bookmarks',
        'An empty-state message + "Browse projects" CTA',
        `Page shows just "${emptyState.h1}" (${emptyState.wordCount} words total, no empty-state guidance)`
      );
    }

    if (!emptyState.metaDescription) {
      bug('P2', '/bookmarks',
        '/bookmarks has no meta description',
        'Inspect <meta name="description"> on /bookmarks',
        'A description meta tag summarizing the page',
        'No meta description found'
      );
    }
    console.log('');

    // --- PART 2: /projects — try bookmark flow ---
    console.log('--- 2. /projects — find bookmark buttons ---');
    await p.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    const projectBookmarks = await p.evaluate(() => {
      // Look for bookmark toggle buttons on project cards
      const buttons = [...document.querySelectorAll('button')];
      const bookmarkBtns = buttons.filter(b => 
        b.innerText.toLowerCase().includes('bookmark') || 
        b.getAttribute('aria-label')?.toLowerCase().includes('bookmark')
      );
      const links = [...document.querySelectorAll('a')];
      const projectLinks = links.filter(a => a.href?.match(/\/projects\/[^\/]+$/) && !a.href.endsWith('/projects'));
      return {
        bookmarkButtonCount: bookmarkBtns.length,
        bookmarkButtonTexts: bookmarkBtns.map(b => b.innerText.trim().slice(0, 40)),
        projectLinkCount: projectLinks.length,
        firstProjectHref: projectLinks[0]?.href || '',
        firstProjectText: projectLinks[0]?.innerText?.trim().slice(0, 60) || '',
      };
    });
    console.log(`  Bookmark buttons on /projects: ${projectBookmarks.bookmarkButtonCount}`);
    console.log(`  Project links: ${projectBookmarks.projectLinkCount}`);
    console.log(`  First project: "${projectBookmarks.firstProjectText}"`);
    if (projectBookmarks.bookmarkButtonCount > 0) {
      console.log(`  Button texts: ${projectBookmarks.bookmarkButtonTexts.join(', ')}`);
    }

    if (projectBookmarks.bookmarkButtonCount === 0) {
      bug('P2', '/projects',
        'No bookmark buttons visible on /projects listing',
        'Go to /projects and look for bookmark icons/buttons on each project card',
        'Bookmark toggle button on each project card',
        '0 bookmark buttons found on /projects'
      );
    }
    console.log('');

    // --- PART 3: Detail page bookmark flow ---
    console.log('--- 3. Detail page bookmark toggle ---');
    if (projectBookmarks.firstProjectHref) {
      await p.goto(projectBookmarks.firstProjectHref, { waitUntil: 'networkidle0', timeout: 15000 });
      await new Promise(r => setTimeout(r, 2000));

      const detailInfo = await p.evaluate(() => {
        const buttons = [...document.querySelectorAll('button')];
        const bookmarkBtns = buttons.filter(b => 
          b.innerText.toLowerCase().includes('bookmark') || 
          b.getAttribute('aria-label')?.toLowerCase().includes('bookmark')
        );
        const links = [...document.querySelectorAll('[href*="/bookmarks"], [href*="/bookmark"]')];
        return {
          h1: document.querySelector('h1')?.innerText?.trim() || '',
          bookmarkButtonCount: bookmarkBtns.length,
          bookmarkBtnText: bookmarkBtns.map(b => b.innerText.trim().slice(0, 40)),
          bookmarkLinksToBookmarks: links.map(l => ({ href: l.href, text: l.innerText.trim().slice(0, 40) })),
          totalButtons: buttons.length,
        };
      });
      console.log(`  Detail page H1: "${detailInfo.h1}"`);
      console.log(`  Bookmark buttons: ${detailInfo.bookmarkButtonCount}`);

      if (detailInfo.bookmarkButtonCount === 0) {
        bug('P2', projectBookmarks.firstProjectHref,
          'No bookmark button on project detail page',
          `Go to ${projectBookmarks.firstProjectHref}, look for bookmark toggle`,
          'A bookmark button to save/unsave the project',
          '0 bookmark buttons found on detail page'
        );
      } else {
        // Try clicking the bookmark button
        console.log(`  Bookmark button text: "${detailInfo.bookmarkBtnText}"`);
        
        // Click bookmark to save
        await p.evaluate(() => {
          const btns = [...document.querySelectorAll('button')];
          const bookmarkBtn = btns.find(b => 
            b.innerText.toLowerCase().includes('bookmark') || 
            b.getAttribute('aria-label')?.toLowerCase().includes('bookmark')
          );
          if (bookmarkBtn) bookmarkBtn.click();
        });
        await new Promise(r => setTimeout(r, 2000));

        // Check if button text changed (indicating state toggle)
        const afterClick = await p.evaluate(() => {
          const btns = [...document.querySelectorAll('button')];
          const bookmarkBtn = btns.find(b => 
            b.innerText.toLowerCase().includes('bookmark') || 
            b.getAttribute('aria-label')?.toLowerCase().includes('bookmark')
          );
          if (!bookmarkBtn) return { text: 'NOT FOUND', found: false };
          const text = bookmarkBtn.innerText.trim();
          return { text: text.slice(0, 40), found: true, isBookmarked: text.toLowerCase().includes('remove') || text.toLowerCase().includes('saved') };
        });
        console.log(`  After click: "${afterClick.text}" (${afterClick.isBookmarked ? 'saved' : 'unsaved'})`);

        // Un-bookmark to reset state
        if (afterClick.found) {
          await p.evaluate(() => {
            const btns = [...document.querySelectorAll('button')];
            const bookmarkBtn = btns.find(b => 
              b.innerText.toLowerCase().includes('bookmark') || 
              b.getAttribute('aria-label')?.toLowerCase().includes('bookmark')
            );
            if (bookmarkBtn) bookmarkBtn.click();
          });
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
    console.log('');

    // --- PART 4: /bookmarks ZH locale ---
    console.log('--- 4. /bookmarks ZH locale ---');
    await p.goto(`${BASE_URL}/bookmarks`, { waitUntil: 'networkidle0', timeout: 15000 });
    await p.setCookie({ name: 'locale', value: 'zh', domain: 'product-tracer.vercel.app', path: '/' });
    await p.goto(`${BASE_URL}/bookmarks`, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    const zhState = await p.evaluate(() => {
      const text = document.body.innerText;
      const h1 = document.querySelector('h1')?.innerText?.trim() || '';
      const zhChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
      const enChars = (text.match(/[a-zA-Z]/g) || []).length;
      return { h1, zhChars, enChars, wordCount: text.split(/\s+/).length, text: text.slice(0, 500) };
    });
    console.log(`  H1: "${zhState.h1}"`);
    console.log(`  ZH chars: ${zhState.zhChars}, EN chars: ${zhState.enChars}`);

    if (zhState.h1 !== '收藏' && zhState.h1 !== '书签') {
      bug('P2', '/bookmarks (ZH)',
        '/bookmarks ZH locale H1 not translated',
        'Set locale=zh cookie, reload /bookmarks',
        'H1 should be "收藏" or "书签"',
        `H1 is "${zhState.h1}"`
      );
    }
    console.log('');

    // --- PART 5: Mobile 375px on /bookmarks ---
    console.log('--- 5. Mobile 375px on /bookmarks ---');
    await p.setViewport({ width: 375, height: 812 });
    await p.setCookie({ name: 'locale', value: 'en', domain: 'product-tracer.vercel.app', path: '/' });
    await p.goto(`${BASE_URL}/bookmarks`, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    const mobileInfo = await p.evaluate(() => {
      const body = document.body;
      const overflowX = body.scrollWidth > body.clientWidth;
      const smallTargets = [...document.querySelectorAll('a, button')].filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.height > 0 && rect.width > 0 && (rect.height < 44 || rect.width < 44);
      });
      return {
        overflowX,
        scrollW: body.scrollWidth,
        clientW: body.clientWidth,
        smallTargetCount: smallTargets.length,
        smallTargetTexts: smallTargets.slice(0, 15).map(el => ({
          tag: el.tagName,
          text: (el.innerText || '').trim().slice(0, 30),
          w: Math.round(el.getBoundingClientRect().width),
          h: Math.round(el.getBoundingClientRect().height),
        })),
        wordCount: body.innerText.split(/\s+/).length,
      };
    });
    console.log(`  Width: ${mobileInfo.scrollW}px scrolled / ${mobileInfo.clientW}px viewport`);
    console.log(`  Scroll overflow: ${mobileInfo.overflowX ? '❌ YES' : '✅ no'}`);
    console.log(`  Small tap targets (<44px): ${mobileInfo.smallTargetCount}`);

    if (mobileInfo.overflowX) {
      bug('P1', '/bookmarks (mobile)',
        'Horizontal overflow on /bookmarks at 375px',
        'Set viewport 375px, load /bookmarks',
        'No horizontal scroll',
        `scrollWidth ${mobileInfo.scrollW} > clientWidth ${mobileInfo.clientW}`
      );
    }

    if (mobileInfo.smallTargetCount > 10) {
      console.log(`  First small targets (sample):`);
      mobileInfo.smallTargetTexts.forEach(t => console.log(`    <${t.tag}> "${t.text}" ${t.w}×${t.h}px`));
    }
    console.log('');

    // --- PART 6: Try bookmark from /projects card (click one) ---
    console.log('--- 6. Bookmark from /projects card ---');
    await p.setViewport({ width: 1400, height: 900 });
    await p.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    const cardBookmarkTest = await p.evaluate(() => {
      // Try to find bookmark buttons that aren't inside an <a> tag (card-level)
      const buttons = [...document.querySelectorAll('button')];
      const bookmarkBtns = buttons.filter(b => 
        b.innerText.toLowerCase().includes('bookmark') || 
        b.getAttribute('aria-label')?.toLowerCase().includes('bookmark')
      );
      return {
        count: bookmarkBtns.length,
        tags: bookmarkBtns.map(b => b.tagName),
        texts: bookmarkBtns.map(b => b.innerText.trim().slice(0, 40)),
        ariaLabels: bookmarkBtns.map(b => b.getAttribute('aria-label') || 'none'),
        onClick: bookmarkBtns.map(b => b.getAttribute('onclick') || ''),
      };
    });
    console.log(`  Bookmark buttons on /projects: ${cardBookmarkTest.count}`);
    if (cardBookmarkTest.count > 0) {
      console.log(`  Labels: ${cardBookmarkTest.ariaLabels.join(', ')}`);
    }
    console.log('');

    // --- SUMMARY ---
    console.log('=== Findings ===');
    if (findings.length === 0) {
      console.log('  No bugs found! 🎉');
    } else {
      findings.forEach(f => {
        console.log(`  [${f.severity}] ${f.page}: ${f.desc}`);
        console.log(`    Steps: ${f.steps}`);
        console.log(`    Expected: ${f.expected}`);
        console.log(`    Actual: ${f.actual}`);
        console.log('');
      });
    }

    await browser.close();

    // Save findings to file
    const fs = require('fs');
    const path = require('path');
    const docDir = path.join(__dirname, 'doc');
    if (!fs.existsSync(docDir)) fs.mkdirSync(docDir, { recursive: true });

    const reportSec = findings.map(f => `
### [${f.severity}] ${f.page} — ${f.desc}
- **Found:** ${f.ts}
- **Reproduction:**
  ${f.steps}
- **Expected:** ${f.expected}
- **Actual:** ${f.actual}
`).join('\n');

    console.log(`\n  ${findings.length} bug(s) found.`);
    process.exit(0);

  } catch (err) {
    console.error('  ❌ Fatal error during tour:', err.message);
    await browser.close();
    process.exit(1);
  }
})();

// Re-run just the overflow check with more detail
import http from 'http';
import https from 'https';
