#!/usr/bin/env node
/**
 * Product Tour: /youtube-insights focus
 * Run: node tour-youtube.cjs
 */
const puppeteer = require('puppeteer-core');

const BASE_URL = 'https://product-tracer.vercel.app';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const BUGS = [];

function bug(priority, page, description, reproduction, expected, actual) {
  BUGS.push({ priority, page, description, reproduction, expected, actual, ts: new Date().toISOString() });
}

(async () => {
  console.log('=== Product Tour: /youtube-insights ===\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800']
  });

  try {
    // ─── 1. EN /youtube-insights ───
    console.log('--- 1. EN /youtube-insights ---');
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
      if (resp.status() >= 400) httpErrors.push({ status: resp.status(), url: resp.url() });
    });
    await page.setExtraHTTPHeaders({ 'Cookie': 'locale=en' });
    await page.goto(`${BASE_URL}/youtube-insights`, { waitUntil: 'networkidle0', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2500));

    const title = await page.title();
    console.log('  Title:', title);

    if (httpErrors.length) {
      httpErrors.forEach(e => console.log('  HTTP ERROR:', e.status, e.url.slice(0, 100)));
      bug('P2', '/youtube-insights', `${httpErrors.length} HTTP error(s) loading page resources`,
        httpErrors.map(e => `  ${e.status} ${e.url}`).join('\n'),
        'All resources load successfully (2xx)',
        `${httpErrors.length} resource(s) returned ${httpErrors.map(e=>e.status).join(', ')}`);
    }

    // Check grid/list toggle
    const hasToggle = await page.evaluate(() => {
      const body = document.body.innerText.toLowerCase();
      return body.includes('grid') || body.includes('list') || body.includes('view');
    });
    console.log('  Grid/List toggle in text:', hasToggle);

    // Check category filter
    const hasFilter = await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      for (const s of selects) {
        if (s.querySelectorAll('option').length >= 2) return true;
      }
      return false;
    });
    console.log('  <select> with options > filter:', hasFilter);

    // Check for visible content — count meaningful video-like entries
    const contentStats = await page.evaluate(() => {
      const text = document.body.innerText;
      // Look for common patterns: video titles, dates, channel names
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      return {
        totalLines: lines.length,
        preview: lines.slice(0, 20).join(' | ')
      };
    });
    console.log('  Content lines:', contentStats.totalLines);
    console.log('  Preview:', contentStats.preview.slice(0, 300));

    // Are there any clickable cards?
    const clickableCards = await page.evaluate(() => {
      const cards = document.querySelectorAll('a[href*="/youtube-insights/"], a[href*="youtube.com"], a[href*="youtu.be"]');
      return cards.length;
    });
    console.log('  Clickable card/links:', clickableCards);

    if (contentStats.totalLines < 3) {
      bug('P1', '/youtube-insights', 'Page appears empty or has no visible content',
        '1. Navigate to /youtube-insights',
        'Page should show video insight cards/content',
        `Only ${contentStats.totalLines} non-empty lines found`);
    }

    // ─── 2. ZH /youtube-insights ───
    console.log('\n--- 2. ZH /youtube-insights ---');
    const pageZh = await browser.newPage();
    pageZh.on('console', msg => { if (msg.type() === 'error') console.log('  CONSOLE ERROR:', msg.text()); });
    await pageZh.setExtraHTTPHeaders({ 'Cookie': 'locale=zh' });
    await pageZh.goto(`${BASE_URL}/youtube-insights`, { waitUntil: 'networkidle0', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    const zhBody = await pageZh.evaluate(() => document.body.innerText);
    const hasChinese = /[\u4e00-\u9fff\u3400-\u4dbf]/.test(zhBody);
    console.log('  Has Chinese content:', hasChinese);
    if (!hasChinese) {
      bug('P1', '/youtube-insights (ZH)', 'ZH locale shows no Chinese text (full English fallback)',
        '1. Set locale=zh cookie\n2. Navigate to /youtube-insights\n3. Check page for Chinese characters',
        'Page text should be in Chinese',
        'Page shows only English text content');
    }

    // ─── 3. Mobile 375px ───
    console.log('\n--- 3. Mobile 375px ---');
    const pageMob = await browser.newPage();
    await pageMob.setViewport({ width: 375, height: 812 });
    pageMob.on('console', msg => { if (msg.type() === 'error') console.log('  CONSOLE ERROR:', msg.text()); });
    await pageMob.setExtraHTTPHeaders({ 'Cookie': 'locale=en' });
    await pageMob.goto(`${BASE_URL}/youtube-insights`, { waitUntil: 'networkidle0', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    const hScroll = await pageMob.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    console.log('  Horizontal scroll on mobile:', hScroll);
    if (hScroll) {
      const overflow = await pageMob.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth
      }));
      console.log(`    ${overflow.scrollW}px vs ${overflow.clientW}px viewport`);
      bug('P1', '/youtube-insights (mobile), focus=%22+youtube+insights, +global+fuzzy+search', 'Horizontal scroll on mobile youtube-insights page',
        '1. Set viewport to 375x812\n2. Navigate to /youtube-insights\n3. Check for horizontal scrollbar or overflow',
        'Page should fit within 375px viewport width',
        `scrollWidth ${overflow.scrollW}px > clientWidth ${overflow.clientW}px`);
    }

    // Check if mobile content is usable
    const mobContent = await pageMob.evaluate(() => {
      const text = document.body.innerText;
      const lines = text.split('\n').filter(l => l.trim());
      return { lines: lines.length, words: text.split(/\s+/).length };
    });
    console.log('  Mobile content:', mobContent.lines, 'lines,', mobContent.words, 'words');
    if (mobContent.words < 10) {
      bug('P2', '/youtube-insights (mobile)', 'Mobile page has very little visible content',
        '1. Set viewport 375x812\n2. Navigate to /youtube-insights',
        'Mobile should show video cards/content',
        `Only ${mobContent.words} words visible`);
    }

    // ─── 4. Check daily usefulness ───
    console.log('\n--- 4. Usefulness assessment ---');
    const hasDates = await page.evaluate(() => {
      const text = document.body.innerText;
      // Match date patterns YYYY-MM-DD or similar
      return /\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(text);
    });
    console.log('  Has date timestamps:', hasDates);

    const hasCategories = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      const keywords = ['ai', 'llm', 'machine learning', 'startup', 'saas', 'tool', 'product', 'category'];
      return keywords.filter(k => text.includes(k)).length;
    });
    console.log('  Category keywords found:', hasCategories);

    console.log('\n=== Tour Complete ===');
    console.log('Bugs found:', BUGS.length);
    BUGS.forEach(b => console.log(`  [${b.priority}] ${b.page}: ${b.description}`));

  } catch (err) {
    console.error('FATAL:', err.message);
    bug('P1', 'general', 'Tour crashed: ' + err.message, 'Run the tour script', 'Tour completes without errors', err.message);
  } finally {
    await browser.close();
  }

  // ─── Write bug report ───
  const fs = require('fs');
  const reportPath = '/Users/jameshuang/.openclaw/workspace/agents/jbk/doc/bug-reports.md';

  let existing = '';
  try { existing = fs.readFileSync(reportPath, 'utf-8'); } catch(e) {}

  const header = `\n\n## Product Tour: ${new Date().toISOString()} (Focus: /youtube-insights)\n\n`;
  const body = BUGS.length === 0
    ? '**No new bugs found.** Page renders correctly in EN/ZH modes, mobile is responsive, content is visible.\n'
    : BUGS.map(b =>
      `### [${b.priority}] ${b.page}\n` +
      `- **Description:** ${b.description}\n` +
      `- **Found:** ${b.ts}\n` +
      (b.reproduction ? `- **Reproduction:**\n${b.reproduction.split('\n').map(l => '  ' + l).join('\n')}\n` : '') +
      (b.expected ? `- **Expected:** ${b.expected}\n` : '') +
      (b.actual ? `- **Actual:** ${b.actual}\n` : '')
    ).join('\n');

  const newContent = existing + header + body;
  fs.writeFileSync(reportPath, newContent);
  console.log('\nReport appended to bug-reports.md');

  // Also write tour report
  const tourReport = `/Users/jameshuang/.openclaw/workspace/agents/jbk/doc/tour-report.txt`;
  const report = `Product Tour: ${new Date().toISOString()} (Focus: /youtube-insights)\n${'='.repeat(60)}\n\nBugs: ${BUGS.length}\n\n` +
    BUGS.map(b => `[${b.priority}] ${b.page}: ${b.description}`).join('\n') + '\n';
  fs.writeFileSync(tourReport, report);
  console.log('Tour report written');

  process.exit(BUGS.length > 0 ? 1 : 0);
})();
