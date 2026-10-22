// Замер плавности страницы на этой машине: видеокарта, длинные задачи на старте, вес, кадры в покое и при прокрутке колесом
// (Chrome/Edge через CDP, тот же helper, что у sec-shot.mjs). На сайт не попадает.
//   node tools/perf-check.mjs <url> [ширины, по умолчанию 1440 390]
// Пример: node tools/perf-check.mjs http://localhost:8765/design-v3/index.html 1440 390
// Читать так: avg — средний интервал между кадрами (16,7 мс = 60 к/с), p95 — 95% кадров короче, over33 — кадров дольше 33 мс (рывок виден),
// over50 — дольше 50 мс (заметный рывок). heroBuf — разрешение холста первого экрана: если оно упало — видеокарта не успевала.
import { pathToFileURL } from 'node:url';

const lib = pathToFileURL('C:/Users/Сергей/.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs').href;
const { Browser, sleep } = await import(lib);
const [url, ...ws] = process.argv.slice(2);
if (!url) { console.log('нужен адрес страницы'); process.exit(1); }
const widths = (ws.length ? ws : ['1440', '390']).map(Number);

function stats(g) {
  g = g.slice(1);
  if (!g.length) return null;
  g.sort((a, b) => a - b);
  const sum = g.reduce((a, b) => a + b, 0);
  return { frames: g.length, avg: +(sum / g.length).toFixed(1), p95: +g[Math.floor(g.length * .95)].toFixed(1), max: Math.round(g[g.length - 1]),
    over33: g.filter((x) => x > 33).length, over50: g.filter((x) => x > 50).length };
}

const browser = await Browser.launch({ width: 1440, height: 900, extraArgs: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
try {
  for (const w of widths) {
    const h = w < 700 ? 844 : 900;
    const page = await browser.newPage({ width: w, height: h, dsf: 1, mobile: w < 700 });
    await page.goto(url, { settleMs: 3500 });
    const info = await page.eval(async () => {
      const lt = await new Promise((res) => {
        const out = [];
        try {
          const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => out.push(Math.round(e.duration))));
          po.observe({ type: 'longtask', buffered: true });
          setTimeout(() => { po.disconnect(); res(out); }, 200);
        } catch (e) { res([]); }
      });
      const res = performance.getEntriesByType('resource');
      const bytes = res.reduce((s, r) => s + (r.transferSize || r.encodedBodySize || 0), 0);
      const nav = performance.getEntriesByType('navigation')[0];
      const c = document.querySelector('.scene-gl');
      let renderer = '?';
      let parallel = false;
      try { const gl = c.getContext('webgl'); const d = gl.getExtension('WEBGL_debug_renderer_info'); renderer = gl.getParameter(d.UNMASKED_RENDERER_WEBGL); parallel = !!gl.getExtension('KHR_parallel_shader_compile'); } catch (e) {}
      return { renderer, parallel, dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), requests: res.length, kb: Math.round(bytes / 1024),
        longTasks: lt, longMs: lt.reduce((a, b) => a + b, 0), heroBuf: c ? c.width + 'x' + c.height : '-', heroCss: c ? c.clientWidth + 'x' + c.clientHeight : '-', html: document.documentElement.className };
    });
    // Кадры в покое на первом экране (мозг рисуется)
    const idle = await page.eval(() => new Promise((resolve) => {
      const gaps = []; let last = performance.now(); const t0 = last;
      requestAnimationFrame(function f(t) { gaps.push(t - last); last = t; if (t - t0 < 3000) requestAnimationFrame(f); else resolve(gaps); });
    }));
    // Кадры при прокрутке: сэмплер внутри страницы, колесо — снаружи, как у посетителя
    await page.eval(() => { window.__s = []; let last = performance.now(); const t0 = last; requestAnimationFrame(function f(t) { window.__s.push(t - last); last = t; if (t - t0 < 12000) requestAnimationFrame(f); }); });
    await page.wheel(6000, { step: 120, pauseMs: 40 }); await sleep(700);
    await page.wheel(6000, { step: 120, pauseMs: 40 }); await sleep(700);
    await page.wheel(-4000, { step: 120, pauseMs: 40 }); await sleep(1000);
    const scroll = await page.eval(() => window.__s);
    const after = await page.eval(() => ({ y: Math.round(scrollY), heroBuf: (document.querySelector('.scene-gl') || {}).width }));
    console.log(`\n== ${w}px ==`);
    console.log(info);
    console.log('покой    ', stats(idle));
    console.log('прокрутка', stats(scroll));
    console.log('после    ', after, '| ошибки JS:', page.consoleErrors.length ? page.consoleErrors.join(' / ') : 'нет');
    await page.close();
  }
} finally {
  await browser.close();
}
