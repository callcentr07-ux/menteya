// Снимок одного раздела страницы в натуральную величину на нескольких ширинах (headless Edge/Chrome через CDP).
// Нужен для проверки вёрстки агентами и людьми; на сайт не попадает.
//   node tools/sec-shot.mjs <url> <css-селектор> <папка-или-префикс> [ширины, по умолчанию 1440 390]
// Пример: node tools/sec-shot.mjs http://localhost:8765/design-v3/index.html "#services" C:\tmp\services 1440 768 390
import { pathToFileURL } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const lib = pathToFileURL('C:/Users/Сергей/.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs').href;
const { Browser, sleep } = await import(lib);
const [url, selector, prefix, ...ws] = process.argv.slice(2);
const widths = (ws.length ? ws : ['1440', '390']).map(Number);
mkdirSync(dirname(prefix + '-x.png'), { recursive: true });

const browser = await Browser.launch({ width: 1440, height: 900 });
try {
  for (const w of widths) {
    const h = w < 700 ? 844 : 900;
    const page = await browser.newPage({ width: w, height: h, dsf: 1, mobile: w < 700 });
    await page.goto(url, { settleMs: 1500 });
    const box = await page.eval((sel) => {
      const s = document.createElement('style');
      s.textContent = '.js [data-reveal], .js .hero-card, .js .hero-mark{animation:none!important;opacity:1!important;translate:none!important} .cookie{display:none!important}';
      document.head.appendChild(s);
      const el = document.querySelector(sel);
      if (!el) return null;
      el.scrollIntoView({ block: 'start', behavior: 'instant' });
      const r = el.getBoundingClientRect();
      return { x: 0, y: Math.max(0, r.top + scrollY), width: document.documentElement.clientWidth, height: Math.min(r.height, 4000) };
    }, selector);
    if (!box) { console.log('нет элемента', selector); await page.close(); continue; }
    await sleep(700);
    const { data } = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...box, scale: 1 } }, 45000);
    const file = `${prefix}-${w}.png`;
    writeFileSync(file, Buffer.from(data, 'base64'));
    const errors = page.consoleErrors.length ? ' | ошибки JS: ' + page.consoleErrors.join(' / ') : '';
    const over = await page.eval(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(`saved ${file} (${box.width}×${Math.round(box.height)})${over > 0 ? ' | ГОРИЗОНТАЛЬНАЯ ПРОКРУТКА +' + over + 'px' : ''}${errors}`);
    await page.close();
  }
} finally {
  await browser.close();
}
