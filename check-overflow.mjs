#!/usr/bin/env node
import puppeteer from 'puppeteer-core';

const BASE_URL = 'https://product-tracer.vercel.app';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const p = await browser.newPage();
  await p.setViewport({ width: 375, height: 812 });
  await p.goto(`${BASE_URL}/bookmarks`, { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  
  const info = await p.evaluate(() => {
    const nav = document.querySelector('nav');
    const navRect = nav ? nav.getBoundingClientRect() : null;
    const bodyStyle = getComputedStyle(document.body);
    const htmlStyle = getComputedStyle(document.documentElement);
    
    const hasScrollbar = document.documentElement.scrollWidth > window.innerWidth;
    const overflowClip = htmlStyle.overflowX === 'hidden' || 
                         bodyStyle.overflowX === 'hidden' ||
                         htmlStyle.overflow === 'hidden' ||
                         bodyStyle.overflow === 'hidden';
    
    const chain = [];
    if (nav) {
      let el = nav;
      let i = 0;
      while (el && i < 6) {
        const s = getComputedStyle(el);
        chain.push({
          tag: el.tagName,
          id: el.id || '',
          cls: typeof el.className === 'string' ? el.className.slice(0, 50) : '',
          w: Math.round(el.getBoundingClientRect().width),
          overflowX: s.overflowX,
          maxW: s.maxWidth,
          position: s.position,
        });
        el = el.parentElement;
        i++;
      }
    }
    
    // Find the outermost container
    const main = document.querySelector('main') || document.querySelector('[class*="container"]');
    const mainRect = main ? main.getBoundingClientRect() : null;
    
    return {
      windowW: window.innerWidth,
      scrollW: document.documentElement.scrollWidth,
      bodyScrollW: document.body.scrollWidth,
      hasScrollbar,
      overflowClip,
      htmlOverflowX: htmlStyle.overflowX,
      bodyOverflowX: bodyStyle.overflowX,
      nav: navRect ? { right: Math.round(navRect.right), w: Math.round(navRect.width), left: Math.round(navRect.left) } : null,
      navParentChain: chain,
      main: mainRect ? { right: Math.round(mainRect.right), w: Math.round(mainRect.width) } : null,
    };
  });
  
  console.log(JSON.stringify(info, null, 2));
  
  if (info.hasScrollbar && !info.overflowClip) {
    console.log('\n*** VERDICT: Real horizontal scrollbar — user can scroll to overflowed content ***');
  } else if (info.hasScrollbar && info.overflowClip) {
    console.log('\n*** VERDICT: Clipped overflow — content is hidden (overflow-x: hidden), no scrollbar visible ***');
  } else if (!info.hasScrollbar) {
    console.log('\n*** VERDICT: No real overflow — document fits within viewport ***');
  }
  
  await browser.close();
})();
