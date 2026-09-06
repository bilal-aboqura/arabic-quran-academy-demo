// Start scripts/preview-templates.mjs first. Supply PLAYWRIGHT_MODULE if bundled externally.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await fs.mkdir('.template-preview/academy-qa', { recursive: true });
try {
  for (const locale of ['en', 'ar']) for (const width of [375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`http://127.0.0.1:4173/?template=global-arabic-quran&locale=${locale}`);
    await page.locator('.aq-program').last().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(async () => { for (const img of document.images) { img.loading = 'eager'; await img.decode().catch(() => {}); } });
    const result = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, images: [...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.src), dir: document.querySelector('.aq-site').dir, programs: document.querySelectorAll('.aq-program').length }));
    if (result.overflow || result.images.length || result.programs !== 4 || result.dir !== (locale === 'ar' ? 'rtl' : 'ltr')) throw new Error(JSON.stringify({ width, locale, ...result }));
    await page.locator('#faq summary').first().click();
    if (!await page.locator('#faq details').first().getAttribute('open').then(v => v !== null)) throw new Error('FAQ failed');
    await page.screenshot({ path: `.template-preview/academy-qa/${locale}-${width}.png`, fullPage: true });
    if (width === 1440 && locale === 'en') { await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: 'public/template-previews/global-arabic-quran.png' }); }
    console.log(`${locale} ${width}px: no overflow, images loaded, 4 programs, FAQ works`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
} finally { await browser.close(); }
