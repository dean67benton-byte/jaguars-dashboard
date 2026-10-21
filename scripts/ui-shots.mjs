// CI only (.github/workflows/ui-preview.yml): screenshot the built app at
// iPhone and desktop sizes with the runner's preinstalled Chrome.
import { chromium } from 'playwright-core';

const BASE = 'http://localhost:4173/';
const PAGES = ['rankings', 'home', 'more', 'settings'];
const browser = await chromium.launch({ channel: 'chrome' });

const iphone = await browser.newContext({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  colorScheme: 'dark',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
});
const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' });

for (const [ctx, prefix, pages] of [[iphone, 'iphone', PAGES], [desktop, 'desktop', ['rankings']]]) {
  const page = await ctx.newPage();
  for (const p of pages) {
    await page.goto(BASE + '#' + p, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    // Grow the viewport to the page height so the fixed tab bar lands at the bottom.
    const vp = page.viewportSize();
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: vp.width, height: Math.max(h, vp.height) });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `shots/${prefix}-${p.replace('/', '-')}.png` });
    await page.setViewportSize(vp);
  }
}
await browser.close();
