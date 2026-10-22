import { webkit, devices } from 'playwright';
import { writeFileSync, appendFileSync } from 'node:fs';
const b = await webkit.launch();
const ctx = await b.newContext({ ...devices['iPhone 14'], colorScheme: 'dark' });
const page = await ctx.newPage();
page.on('console', (m) => appendFileSync('console.txt', `${m.type()}: ${m.text()}\n`));
page.on('pageerror', (e) => appendFileSync('console.txt', `pageerror: ${e.message}\n${e.stack}\n`));
page.on('requestfailed', (r) => appendFileSync('console.txt', `failed: ${r.url()} ${r.failure()?.errorText}\n`));
page.on('response', (r) => r.status() >= 400 && appendFileSync('console.txt', `${r.status()}: ${r.url()}\n`));
for (const h of ['home', 'swag', 'more']) {
  await page.goto('https://dean67benton-byte.github.io/jaguars-dashboard/#' + h, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${h}.png` });
  writeFileSync(`${h}.txt`, await page.evaluate(() => document.body.innerText.slice(0, 2000)));
}
await b.close();
