#!/usr/bin/env node
/**
 * Product Tour: Homepage focus
 * Run: node tour-homepage.mjs
 * Focus: First impression, value prop clarity, card interaction, scroll, speed
 */
import puppeteer from 'puppeteer-core';

const BASE_URL = 'https://product-tracer.vercel.app';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const BUGS = [];

function bug(priority, page, description, reproduction, expected, actual) {
  BUGS.push({ priority, page, description, reproduction, expected, actual, ts: new Date().toISOString() });
}

(async () => {
  console.log('=== Product Tour: Homepage ===\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800']
  });

  try {
    // ─── 1. Homepage HTTP status + load timing ───
    console.log('--- 1. Homepage HTTP status + load timing ---');
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('  CONSOLE ERROR:', msg.text());
        consoleErrors.push(msg.text());
      }
    });
    const httpErrors = [];
    page.on('response', resp => {
      if (resp.status() >= 400) httpErrors.push({ status: resp.status(), url: resp.url().slice(0, 120) });
    });

    const startTime = Date.now();
    try {
      const resp = await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 25000 });
      const loadTime = Date.now() - startTime;
      const status = resp.status();
      console.log(`  Status: ${status}, Load time: ${loadTime}ms`);
      if (status !== 200) {
        bug('P0', '/', `Homepage returned HTTP ${status}`, `GET ${BASE_URL}`, 'HTTP 200', `HTTP ${status}`);
      }
    } catch (err) {
      const loadTime = Date.now() - startTime;
      console.log(`  Navigation error after ${loadTime}ms: ${err.message}`);
      bug('P0', '/', `Homepage navigation failed: ${err.message}`, `GET ${BASE_URL}`, 'HTTP 200 with page content', `Navigation error: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 3000));

    if (httpErrors.length) {
      console.log(`  HTTP errors (${httpErrors.length}):`);
      httpErrors.forEach(e => console.log(`    ${e.status} ${e.url}`));
      if (httpErrors.length > 2) {
        bug('P2', '/', `${httpErrors.length} HTTP resource errors on homepage`, 'Load homepage and check Network tab', '< 3 resource errors', `${httpErrors.length} errors`);
      }
    }

    // ─── 2. Value proposition + content check ───
    console.log('\n--- 2. Value proposition ---');
    const pageText = await page.evaluate(() => document.body.innerText);

    const h1 = await page.evaluate(() => {
      const el = document.querySelector('h1');
      return el ? el.innerText : null;
    });
    console.log(`  H1: ${h1}`);
    if (!h1) {
      bug('P2', '/', 'No H1 element found on homepage', 'Inspect page source for H1 tag', 'H1 present with value proposition', 'No H1 element found');
    }

    const h2s = await page.evaluate(() => Array.from(document.querySelectorAll('h2')).slice(0, 5).map(h => h.innerText));
    console.log(`  H2s (first 5):`, h2s);

    if (pageText.includes('signalsfor')) {
      bug('P2', '/', 'Typo: "signalsfor" missing space (should be "signals for")', 'Read homepage heading text', '"signals for"', '"signalsfor"');
    }

    const visibleTextLen = pageText.trim().length;
    console.log(`  Visible text length: ${visibleTextLen} chars`);
    if (visibleTextLen < 50) {
      bug('P1', '/', `Homepage has almost no visible text (${visibleTextLen} chars)`, 'Load homepage, read body text', '> 500 chars of meaningful content', `Only ${visibleTextLen} chars`);
    }

    // ─── 3. Insight cards ───
    console.log('\n--- 3. Insight cards / content sections ---');
    const cards = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('article, [class*="card"], section'))
        .slice(0, 20)
        .map(c => ({
          tag: c.tagName,
          cls: (c.className || '').slice(0, 60),
          textLen: (c.innerText || '').trim().length,
          text: (c.innerText || '').trim().slice(0, 80),
          hasLink: !!c.querySelector('a')
        }));
    });
    console.log(`  Found ${cards.length} sections/articles/cards`);
    cards.forEach((c, i) => {
      console.log(`    [${i}] <${c.tag}> cls=${c.cls} text=${c.textLen}c ${c.text.slice(0, 60)}`);
    });

    const emptyCards = cards.filter(c => c.textLen < 5);
    if (emptyCards.length > 0) {
      bug('P1', '/', `${emptyCards.length} empty card(s)/section(s) on homepage — no text content`,
        'Load homepage and inspect content sections', 'All content sections have meaningful text',
        `${emptyCards.length} empty section(s) found`);
    }

    // ─── 4. Navigation ───
    console.log('\n--- 4. Navigation ---');
    const navLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('nav a, header a, [class*="nav"] a, [class*="header"] a'))
        .map(a => ({ text: a.innerText.trim(), href: a.href }));
    });
    console.log(`  Nav links: ${navLinks.map(l => `${l.text}(${l.href.replace(BASE_URL, '')})`).join(', ')}`);

    if (navLinks.length === 0) {
      bug('P2', '/', 'No navigation links found on homepage', 'Inspect header for nav elements', 'Navigation links present (Projects, Trends, etc.)', 'No nav links found');
    }

    const hasBookmarks = navLinks.some(l => l.text.toLowerCase().includes('bookmark'));
    console.log(`  Bookmarks nav link: ${hasBookmarks ? '✅' : '❌'}`);

    // ─── 5. Scroll test ───
    console.log('\n--- 5. Scroll + page height ---');
    const initialHeight = await page.evaluate(() => document.body.scrollHeight);
    console.log(`  Initial page height: ${initialHeight}px`);

    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(r => setTimeout(r, 800));
    }
    const finalHeight = await page.evaluate(() => document.body.scrollHeight);
    console.log(`  Post-scroll height: ${finalHeight}px`);

    // ─── 6. Footer ───
    console.log('\n--- 6. Footer ---');
    const footer = await page.evaluate(() => {
      const el = document.querySelector('footer');
      return el ? el.innerText.trim().slice(0, 200) : null;
    });
    console.log(`  Footer: ${footer ? footer.slice(0, 120) + '…' : '❌ Not found'}`);
    if (!footer) {
      bug('P2', '/', 'No footer found on homepage', 'Scroll to bottom of homepage', 'Footer present with links/info', 'No footer element');
    }

    // ─── 7. Console errors ───
    console.log('\n--- 7. Console errors ---');
    if (consoleErrors.length) {
      console.log(`  ${consoleErrors.length} errors:`);
      consoleErrors.forEach(e => console.log(`    ${e}`));
      if (consoleErrors.some(e => e.toLowerCase().includes('hydrat'))) {
        bug('P1', '/', `React hydration errors on homepage (${consoleErrors.filter(e => e.toLowerCase().includes('hydrat')).length} errors)`,
          'Load homepage and check console', 'No hydration errors', 'Hydration errors detected');
      }
      if (consoleErrors.some(e => e.includes('Failed to load') || e.includes('404'))) {
        bug('P2', '/', 'Resource loading errors on homepage', 'Load homepage and check console', 'No resource loading errors', 'Resource loading errors found');
      }
    } else {
      console.log('  No console errors ✅');
    }

    // ─── 8. Mobile ───
    console.log('\n--- 8. Mobile viewport (375px) ---');
    const mobilePage = await browser.newPage();
    const mobileErrors = [];
    mobilePage.on('console', msg => {
      if (msg.type() === 'error') mobileErrors.push(msg.text());
    });
    await mobilePage.setViewport({ width: 375, height: 812 });
    try {
      await mobilePage.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 15000 });
      await new Promise(r => setTimeout(r, 2000));
      const mobileText = await mobilePage.evaluate(() => document.body.innerText);
      console.log(`  Mobile visible text: ${mobileText.trim().length} chars`);
      const mobileH1 = await mobilePage.evaluate(() => {
        const h = document.querySelector('h1');
        return h ? h.innerText : null;
      });
      console.log(`  Mobile H1: ${mobileH1}`);

      const hasHScroll = await mobilePage.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      console.log(`  Horizontal scroll: ${hasHScroll ? '❌ YES' : '✅ No'}`);
      if (hasHScroll) {
        bug('P1', '/', 'Homepage has horizontal scroll on mobile (375px viewport)', 'Set viewport to 375×812, load homepage, check scrollWidth vs clientWidth', 'No horizontal scroll', 'Horizontal scroll present on mobile');
      }

      if (mobileErrors.length) {
        console.log(`  Mobile console errors: ${mobileErrors.length}`);
        mobileErrors.forEach(e => console.log(`    ${e}`));
      }

      await mobilePage.close();
    } catch (err) {
      console.log(`  Mobile test error: ${err.message}`);
    }

    // ─── Summary ───
    console.log(`\n=== Tour Complete ===`);
    console.log(`Found ${BUGS.length} bug(s):`);
    BUGS.forEach(b => console.log(`  [${b.priority}] ${b.page}: ${b.description}`));

    if (BUGS.length > 0) {
      const fs = await import('fs');
      const reportPath = '/Users/jameshuang/.openclaw/workspace/agents/jbk/doc/bug-reports.md';
      let content = fs.readFileSync(reportPath, 'utf-8');

      content += `\n\n## Product Tour: Homepage — ${new Date().toISOString()}\n\n`;

      const existingDescriptions = new Set();
      const existingLines = content.split('\n');
      existingLines.forEach(line => {
        const m = line.match(/Description:\s*(.+)/);
        if (m) existingDescriptions.add(m[1].trim().toLowerCase());
      });

      let newCount = 0;
      BUGS.forEach(b => {
        const key = b.description.toLowerCase();
        if (!existingDescriptions.has(key)) {
          content += `### [${b.priority}] ${b.page}\n`;
          content += `- **Description:** ${b.description}\n`;
          content += `- **Found:** ${b.ts}\n`;
          content += `- **Reproduction:**\n`;
          b.reproduction.split('\n').forEach(line => content += `  ${line}\n`);
          content += `- **Expected:** ${b.expected}\n`;
          content += `- **Actual:** ${b.actual}\n\n`;
          newCount++;
        }
      });

      fs.writeFileSync(reportPath, content, 'utf-8');
      console.log(`\nWrote ${newCount} new bug(s) to bug-reports.md`);
    }

  } catch (err) {
    console.error('Tour error:', err);
  } finally {
    await browser.close();
  }

  process.exit(BUGS.length > 0 ? 1 : 0);
})();
