#!/usr/bin/env node
/**
 * Product Tour: Homepage focus
 * Run: node tour-homepage.cjs
 * Focus: First impression, value prop clarity, card interaction, scroll, speed
 */
const puppeteer = require('puppeteer-core');

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

    // Wait for content to settle
    await new Promise(r => setTimeout(r, 3000));

    // Log HTTP errors
    if (httpErrors.length) {
      console.log(`  HTTP errors (${httpErrors.length}):`);
      httpErrors.forEach(e => console.log(`    ${e.status} ${e.url}`));
      if (httpErrors.length > 2) {
        bug('P2', '/', `${httpErrors.length} HTTP resource errors on homepage`, 'Load homepage and check Console > Network', '< 3 resource errors', `${httpErrors.length} errors`);
      }
    }

    // ─── 2. Value proposition check ───
    console.log('\n--- 2. Value proposition ---');
    const pageText = await page.evaluate(() => document.body.innerText);
    const html = await page.evaluate(() => document.documentElement.innerHTML);

    // Check for H1
    const h1 = await page.evaluate(() => {
      const el = document.querySelector('h1');
      return el ? el.innerText : null;
    });
    console.log(`  H1: ${h1}`);
    if (!h1) {
      bug('P2', '/', 'No H1 element found on homepage', 'Inspect page source for H1 tag', 'H1 present with value proposition', 'No H1 element found');
    }

    // Check for subheading / tagline
    const h2s = await page.evaluate(() => Array.from(document.querySelectorAll('h2')).slice(0, 5).map(h => h.innerText));
    console.log(`  H2s (first 5):`, h2s);

    // Check for "signalsfor" typo
    if (pageText.includes('signalsfor')) {
      bug('P2', '/', 'Typo: "signalsfor" missing space (should be "signals for")', 'Read homepage heading text', '"signals for"', '"signalsfor"');
    }

    // Check if page has meaningful content
    const visibleTextLen = pageText.trim().length;
    console.log(`  Visible text length: ${visibleTextLen} chars`);
    if (visibleTextLen < 50) {
      bug('P1', '/', `Homepage has almost no visible text (${visibleTextLen} chars)`, 'Load homepage, read body text', '> 500 chars of meaningful content', `Only ${visibleTextLen} chars`);
    }

    // ─── 3. Insight cards check ───
    console.log('\n--- 3. Insight cards ---');
    const insightCards = await page.evaluate(() => {
      // Find any YouTube insight-like cards
      const cards = Array.from(document.querySelectorAll('[class*="insight"], [class*="card"], article, [class*="youtube"]'));
      return cards.slice(0, 20).map(c => ({
        tag: c.tagName,
        class: c.className.slice(0, 80),
        text: c.innerText.slice(0, 100).trim(),
        hasLink: !!c.querySelector('a'),
        linkHref: c.querySelector('a')?.href?.slice(0, 100)
      }));
    });
    console.log(`  Found ${insightCards.length} potential insight/card elements`);
    insightCards.forEach((c, i) => {
      console.log(`    [${i}] <${c.tag}> ${c.text.slice(0, 60)}${c.text.length > 60 ? '…' : ''}`);
    });

    // Check for empty cards (BUG-1 from queue)
    const emptyCards = insightCards.filter(c => !c.text || c.text.length < 5);
    if (emptyCards.length > 0) {
      bug('P1', '/', `${emptyCards.length} empty insight card(s) on homepage — no text content`,
        'Load homepage and observe insight section', 'All insight cards have meaningful text',
        `${emptyCards.length} empty card(s) found`);
    }

    // ─── 4. Navigation / header check ───
    console.log('\n--- 4. Navigation ---');
    const navLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('nav a, header a, [class*="nav"] a'))
        .map(a => ({ text: a.innerText.trim(), href: a.href.slice(0, 80) }));
    });
    console.log(`  Nav links: ${navLinks.map(l => `${l.text}(${l.href.replace(BASE_URL, '')})`).join(', ')}`);

    if (navLinks.length === 0) {
      bug('P2', '/', 'No navigation links found on homepage', 'Inspect header for nav elements', 'Navigation links present (Projects, Trends, etc.)', 'No nav links found');
    }

    // Check bookmark link exists
    const hasBookmarks = navLinks.some(l => l.text.toLowerCase().includes('bookmark'));
    console.log(`  Bookmarks link: ${hasBookmarks ? '✅' : '❌'}`);

    // ─── 5. Scroll test ───
    console.log('\n--- 5. Scroll + lazyload ---');
    const initialHeight = await page.evaluate(() => document.body.scrollHeight);
    console.log(`  Initial page height: ${initialHeight}px`);

    // Scroll to bottom gradually
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(r => setTimeout(r, 800));
    }
    const finalHeight = await page.evaluate(() => document.body.scrollHeight);
    console.log(`  Post-scroll height: ${finalHeight}px`);

    // Check if content loaded more content
    const newErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') newErrors.push(msg.text());
    });

    // ─── 6. Footer check ───
    console.log('\n--- 6. Footer ---');
    const footer = await page.evaluate(() => {
      const el = document.querySelector('footer');
      return el ? el.innerText.slice(0, 200).trim() : null;
    });
    console.log(`  Footer: ${footer ? footer.slice(0, 100) + '…' : '❌ Not found'}`);
    if (!footer) {
      bug('P2', '/', 'No footer found on homepage', 'Scroll to bottom of homepage', 'Footer present with links/info', 'No footer element');
    }

    // ─── 7. Console errors check ───
    console.log('\n--- 7. Console errors ---');
    if (consoleErrors.length) {
      console.log(`  ${consoleErrors.length} errors:`);
      consoleErrors.forEach(e => console.log(`    ${e}`));
      if (consoleErrors.some(e => e.includes('hydrate') || e.includes('Hydration'))) {
        bug('P1', '/', `React hydration errors on homepage (${consoleErrors.filter(e => e.includes('hydrate') || e.includes('Hydration')).length} errors)`,
          'Load homepage and check console', 'No hydration errors', 'Hydration errors detected');
      }
    } else {
      console.log('  No console errors ✅');
    }

    // ─── 8. Mobile viewport check ───
    console.log('\n--- 8. Mobile viewport (375px) ---');
    const mobilePage = await browser.newPage();
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

      // Check horizontal scroll
      const hasHScroll = await mobilePage.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      console.log(`  Horizontal scroll: ${hasHScroll ? '❌ YES (bug)' : '✅ No'}`);
      if (hasHScroll) {
        bug('P1', '/', 'Homepage has horizontal scroll on mobile (375px)', 'Set viewport to 375×812, load homepage', 'No horizontal scroll', 'Horizontal scroll present');
      }

      // Check tap targets
      const links = await mobilePage.evaluate(() => document.querySelectorAll('a').length);
      console.log(`  Links on mobile: ${links}`);

      await mobilePage.close();
    } catch (err) {
      console.log(`  Mobile test error: ${err.message}`);
    }

    // ─── Summary ───
    console.log(`\n=== Tour Complete ===`);
    console.log(`Found ${BUGS.length} bug(s):`);
    BUGS.forEach(b => console.log(`  [${b.priority}] ${b.page}: ${b.description}`));

    if (BUGS.length > 0) {
      // Append to bug-reports.md
      const fs = require('fs');
      const reportPath = '/Users/jameshuang/.openclaw/workspace/agents/jbk/doc/bug-reports.md';
      let content = fs.readFileSync(reportPath, 'utf-8');

      content += `\n\n## Product Tour: Homepage — ${new Date().toISOString()}\n\n`;

      // Only add NEW bugs (dedup by description prefix)
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

  // Exit with bug count as code
  process.exit(BUGS.length > 0 ? 1 : 0);
})();
