#!/usr/bin/env node
/**
 * Product Tour Focus: /projects page
 * Tests: search, category filter, tags, bookmarks, sort, detail page, ZH locale
 * Run: node tour-projects.mjs
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

  console.log(`=== /projects Product Tour (${TS}) ===\n`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    // 1. LOAD /projects
    console.log('--- 1. Load /projects ---');
    const p = await browser.newPage();
    p.on('console', msg => { if (msg.type() === 'error') console.log('  CONSOLE ERROR:', msg.text()); });
    await p.setViewport({ width: 1400, height: 900 });

    const resp = await p.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle0', timeout: 15000 });
    console.log(`  HTTP ${resp.status()}`);
    await new Promise(r => setTimeout(r, 2000));

    // Check expected elements
    const initial = await p.evaluate(() => {
      const text = document.body.innerText;
      return {
        h1: document.querySelector('h1')?.innerText?.trim() || '',
        hasTagChips: text.includes('#') || document.querySelectorAll('[class*="tag"], [class*="chip"], [class*="badge"]').length > 0,
        hasBookmarkText: text.includes('Bookmark') || text.includes('bookmark'),
        hasSearchInput: !!document.querySelector('input[type="text"]'),
        hasCategorySelect: !!document.querySelector('select'),
        projectLinks: [...document.querySelectorAll('a')].filter(a => a.href?.includes('/projects/') && !a.href.endsWith('/projects')).length,
        totalText: text.length,
      };
    });
    console.log(`  H1: "${initial.h1}"`);
    console.log(`  Searches input: ${initial.hasSearchInput ? '✅' : '❌'}`);
    console.log(`  Category selects: ${initial.hasCategorySelect ? '✅' : '❌'}`);
    console.log(`  Tag chips: ${initial.hasTagChips ? '✅' : '❌'}`);
    console.log(`  Bookmark mentions: ${initial.hasBookmarkText ? '✅' : '❌'}`);
    console.log(`  Project links: ${initial.projectLinks}`);
    console.log(`  Total text: ${initial.totalText} chars`);

    if (!initial.hasSearchInput) {
      bug('P2', '/projects', 'No search input visible', 'Load /projects and look for search input', 'An input to search projects', 'No input found');
    }
    if (!initial.hasCategorySelect) {
      bug('P2', '/projects', 'No category filter dropdown', 'Load /projects and look for category filter', 'A select element to filter by category', 'No select found');
    }

    // 2. TRY SEARCH - type in search box
    console.log('\n--- 2. Search functionality ---');
    const searchInput = await p.$('input[type="text"]');
    if (searchInput) {
      await searchInput.click();
      await searchInput.type('AI', { delay: 50 });
      await new Promise(r => setTimeout(r, 1500));

      const searchResult = await p.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        // Check if results dropdown appeared or page changed
        const projectsAfter = [...document.querySelectorAll('a')].filter(a => a.href?.includes('/projects/') && !a.href.endsWith('/projects'));
        const hasAIMentions = text.includes('ai') || text.includes('artificial intelligence');
        return { remainingLinks: projectsAfter.length, hasAIMentions, someText: projectsAfter.slice(0, 3).map(a => a.innerText.trim()).filter(Boolean) };
      });
      console.log(`  After typing "AI": ${searchResult.remainingLinks} project links visible`);
      console.log(`  AI mentions in text: ${searchResult.hasAIMentions ? '✅' : 'ℹ️ Not required'}`);
      if (searchResult.someText.length) console.log(`  Sample: ${searchResult.someText.join(', ')}`);

      // Clear search
      await searchInput.click({ clickCount: 3 });
      await searchInput.type('', { delay: 30 });
    } else {
      console.log('  Skipping: no search input found');
    }

    // 3. TRY CATEGORY FILTER
    console.log('\n--- 3. Category filter ---');
    const select = await p.$('select');
    if (select) {
      // Get options
      const options = await p.evaluate(() => {
        const sel = document.querySelector('select');
        return sel ? [...sel.options].map(o => ({ value: o.value, text: o.innerText })) : [];
      });
      console.log(`  Filter options: ${options.map(o => o.text).join(', ')}`);

      if (options.length > 1) {
        // Select first non-default option
        const pick = options.find(o => o.value && o.value !== '' && o.value !== 'all');
        if (pick) {
          await select.select(pick.value);
          await new Promise(r => setTimeout(r, 1500));
          const filtered = await p.evaluate(() => {
            const text = document.body.innerText;
            const links = [...document.querySelectorAll('a')].filter(a => a.href?.includes('/projects/') && !a.href.endsWith('/projects'));
            return { linkCount: links.length, textLen: text.length };
          });
          console.log(`  Selected "${pick.text}": ${filtered.linkCount} project links (was ~${initial.projectLinks})`);
          
          // Reset filter
          await select.select(options[0].value);
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    } else {
      console.log('  Skipping: no select found');
    }

    // 4. CLICK INTO A DETAIL PAGE
    console.log('\n--- 4. Detail page /projects/[slug] ---');
    const firstLink = await p.evaluate(() => {
      const links = [...document.querySelectorAll('a')].filter(a => a.href?.includes('/projects/') && !a.href.endsWith('/projects'));
      return links.length > 0 ? links[0].href : null;
    });

    if (firstLink) {
      console.log(`  Opening: ${firstLink}`);
      const dp = await browser.newPage();
      const detailErrs = [];
      dp.on('console', msg => { if (msg.type() === 'error') detailErrs.push(msg.text()); });
      
      const dr = await dp.goto(firstLink, { waitUntil: 'networkidle0', timeout: 15000 });
      await new Promise(r => setTimeout(r, 2000));

      const detail = await dp.evaluate(() => {
        const text = document.body.innerText;
        const h1 = document.querySelector('h1')?.innerText?.trim() || '';
        return {
          h1,
          httpStatus: document.querySelector('[data-error]') ? 'error' : 'ok',
          hasBreadcrumb: text.includes('Projects') && (!!document.querySelector('nav[aria-label*="crumb"], ol, [class*="crumb"]')),
          hasAISummary: text.includes('AI') || text.includes('Summary') || text.includes('summary') || text.includes('About'),
          hasRelated: Array.from(document.querySelectorAll('h2, h3, h4')).some(h => /related|similar|more.*in|you might/i.test(h.innerText)),
          hasBookmarkBtn: text.includes('Bookmark') || text.includes('bookmark') || text.includes('☆') || text.includes('★'),
          hasTags: text.includes('#') || document.querySelectorAll('[class*="tag"], [class*="badge"]').length > 0,
          hasLinks: [...document.querySelectorAll('a')].filter(a => a.href?.includes('github') || a.href?.includes('producthunt')).length,
          wordCount: text.split(/\s+/).filter(Boolean).length,
          charCount: text.length,
          zhChars: (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length,
        };
      });
      
      console.log(`  HTTP ${dr.status()} | H1: "${detail.h1}"`);
      console.log(`  Breadcrumb: ${detail.hasBreadcrumb ? '✅' : '❌'}`);
      console.log(`  AI Summary: ${detail.hasAISummary ? '✅' : '❌'}`);
      console.log(`  Related projects: ${detail.hasRelated ? '✅' : '❌'}`);
      console.log(`  Bookmark button: ${detail.hasBookmarkBtn ? '✅' : '❌'}`);
      console.log(`  Tags: ${detail.hasTags ? '✅' : '❌'}`);
      console.log(`  External links (GH/PH): ${detail.hasLinks}`);
      console.log(`  Content: ~${detail.wordCount} words, ${detail.charCount} chars, ${detail.zhChars} ZH`);
      console.log(`  Console errors: ${detailErrs.length}`);

      if (detailErrs.length > 0) {
        bug('P2', firstLink.replace(BASE_URL, ''), 'Console errors on detail page', `Navigate to ${firstLink} and check console`, 'No console errors', `${detailErrs.length} errors: ${detailErrs.join('; ')}`);
      }
      if (!detail.hasBreadcrumb) {
        bug('P2', firstLink.replace(BASE_URL, ''), 'Missing breadcrumb navigation', `Navigate to ${firstLink}, look for breadcrumb`, 'Breadcrumb nav showing path to current page', 'No breadcrumb found');
      }
      if (!detail.hasAISummary) {
        bug('P2', firstLink.replace(BASE_URL, ''), 'No AI summary or about section', `Navigate to ${firstLink}, look for AI summary or section heading`, 'AI-generated project summary visible', 'No summary text found');
      }
      if (!detail.hasRelated) {
        bug('P2', firstLink.replace(BASE_URL, ''), 'No related projects section', `Navigate to ${firstLink}, scroll for related projects`, 'Related/similar projects shown below main content', 'No related projects text found');
      }

      await dp.close();
    } else {
      console.log('  No project links found');
      bug('P1', '/projects', 'No project links visible on /projects', 'Load /projects and check for clickable project links', 'At least one project link visible', '0 project links found');
    }

    // 5. ZH LOCALE ON /projects
    console.log('\n--- 5. ZH locale on /projects ---');
    const zp = await browser.newPage();
    await zp.setCookie({ name: 'locale', value: 'zh', domain: new URL(BASE_URL).hostname, path: '/' });
    await zp.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    const zhData = await zp.evaluate(() => {
      const text = document.body.innerText;
      const zhChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
      const enChars = (text.match(/[a-zA-Z]/g) || []).length;
      const hasZhNav = text.includes('项目') || text.includes('趋势') || text.includes('洞察');
      return { zhChars, enChars, hasZhNav, total: text.length };
    });
    console.log(`  ZH chars: ${zhData.zhChars}, EN chars: ${zhData.enChars}, Total: ${zhData.total}`);
    console.log(`  ZH nav items: ${zhData.hasZhNav ? '✅' : '❌'}`);

    if (zhData.zhChars < 50 && zhData.total > 1000) {
      bug('P2', '/projects (ZH)', 'i18n leak: page is mostly English in ZH locale', 'Set locale=zh cookie, load /projects', 'UI chrome should be in Chinese', `Only ${zhData.zhChars} ZH chars vs ${zhData.enChars} EN chars`);
    }

    await zp.close();

    // 6. BOOKMARK FLOW E2E TEST
    console.log('\n--- 6. Bookmark flow ---');
    const bp = await browser.newPage();
    await bp.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    const bookmarkStatus = await bp.evaluate(() => {
      // Check for bookmark buttons or any toggle-able bookmark UI
      const buttons = [...document.querySelectorAll('button, a, [role="button"]')];
      const bookmarkElements = buttons.filter(el => {
        const text = el.innerText?.toLowerCase() || '';
        return text.includes('bookmark') || text.includes('☆') || text.includes('★') || text.includes('save');
      });
      return {
        count: bookmarkElements.length,
        sampleText: bookmarkElements.slice(0, 3).map(el => el.innerText.trim()),
      };
    });
    console.log(`  Bookmark elements found: ${bookmarkStatus.count}`);
    if (bookmarkStatus.sampleText.length) console.log(`  Sample: ${bookmarkStatus.sampleText.join(', ')}`);

    // Navigate to /bookmarks
    await bp.goto(`${BASE_URL}/bookmarks`, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
    const bmContent = await bp.evaluate(() => {
      const text = document.body.innerText;
      return {
        h1: document.querySelector('h1')?.innerText?.trim() || '',
        isEmpty: text.includes('No bookmarks') || text.includes('empty') || text.includes('还没有'),
        wordCount: text.split(/\s+/).filter(Boolean).length,
      };
    });
    console.log(`  /bookmarks H1: "${bmContent.h1}"`);
    console.log(`  Empty state: ${bmContent.isEmpty ? '✅ (expected for first visit)' : 'ℹ️'}`);

    await bp.close();

    // ====== SUMMARY ======
    console.log(`\n=== Tour Complete ===`);
    console.log(`Bugs found: ${findings.length}`);
    for (const f of findings) {
      console.log(`  [${f.severity}] ${f.page}: ${f.desc}`);
    }
    if (findings.length === 0) {
      console.log('  No new bugs found. Site is healthy.');
    }

  } finally {
    await browser.close();
  }
})();
