// Замер плавности страницы на этой машине: видеокарта, длинные задачи на старте, вес, кадры в покое и при прокрутке колесом,
// длинные задачи во время прокрутки с привязкой к разделу (Chrome/Edge через CDP, тот же helper, что у sec-shot.mjs). На сайт не попадает.
//   node tools/perf-check.mjs <url> [--calm] [--headful] [ширины, по умолчанию 1440 390]
//   --calm    — как при выключенной анимации (кнопка в подвале): видно, сколько стоит само движение
//   --headful — в обычном окне браузера, а не headless: настоящая синхронизация с экраном (60 к/с) и аппаратный растр, окно видно на экране
//   --css "правило" — добавить CSS на страницу, чтобы проверить гипотезу (например, отключить слой)
//   --profile <папка> — хранить профиль браузера между запусками: второй запуск идёт с дисковым кешем шейдеров
//             видеокарты, как у настоящего посетителя, у которого его прогрели другие сайты; без флага профиль каждый раз пустой
// Читать так: avg — средний интервал между кадрами (в headless без ограничения 60 к/с он меньше 16,7 мс), p95 — 95% кадров короче,
// over33 — кадров дольше 33 мс (рывок виден), over50 — дольше 50 мс (заметный рывок). heroBuf — разрешение холста первого экрана:
// если оно упало — видеокарта не успевала. Длинные задачи при прокрутке — с разделом, который был у верха экрана в этот момент.
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const lib = pathToFileURL('C:/Users/Сергей/.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs').href;
const { Browser, findChrome, sleep } = await import(lib);
const argv = process.argv.slice(2);
const calm = argv.includes('--calm');
const headful = argv.includes('--headful');
const cssIdx = argv.indexOf('--css');
const extraCss = cssIdx >= 0 ? argv[cssIdx + 1] : '';   // --css "правило" — проверить гипотезу, отключив что-то на странице
const profIdx = argv.indexOf('--profile');
const profile = profIdx >= 0 ? argv[profIdx + 1] : '';
const [url, ...ws] = argv.filter((a, i) => !a.startsWith('--') && (cssIdx < 0 || i !== cssIdx + 1) && (profIdx < 0 || i !== profIdx + 1));
if (!url) { console.log('нужен адрес страницы'); process.exit(1); }
const widths = (ws.length ? ws : ['1440', '390']).map(Number);
const GPU = ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];

// Свой запуск Chrome: как Browser.launch из helper'а, но с выбором окно/headless и своим профилем (helper'у нельзя подменить
// --user-data-dir: Chrome берёт первое значение ключа). CalculateNativeWinOcclusion выключен: иначе окно, перекрытое другим
// приложением, Chrome считает скрытым и перестаёт рисовать кадры — замер зависает или пустой
async function launchChrome(headless) {
  const exe = findChrome();
  if (!exe) throw new Error('Chrome/Edge не найден');
  const tmp = mkdtempSync(join(tmpdir(), 'perf-chrome-'));
  const dir = profile || tmp;   // close() helper'а удаляет b.dir — поэтому b.dir всегда временная папка, а не профиль владельца замера
  const mode = headless ? ['--headless=new', '--hide-scrollbars', '--force-color-profile=srgb', '--enable-unsafe-swiftshader', '--window-size=1440,900']
    : ['--window-size=1460,1040', '--window-position=40,40'];
  const args = [...mode, '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--no-first-run', '--no-default-browser-check', '--mute-audio',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--disable-features=Translate,MediaRouter,CalculateNativeWinOcclusion', ...GPU, 'about:blank'];
  const proc = spawn(exe, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = '';
    const t = setTimeout(() => reject(new Error('Chrome не запустился за 20 с')), 20000);
    proc.stderr.on('data', (d) => { buf += d.toString(); const m = buf.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) { clearTimeout(t); resolve(m[1]); } });
    proc.on('exit', (code) => { clearTimeout(t); reject(new Error('Chrome завершился, код ' + code)); });
  });
  const b = new Browser();
  b.proc = proc; b.dir = tmp; b.nextId = 1; b.pending = new Map(); b.listeners = new Map();
  b.ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { b.ws.onopen = res; b.ws.onerror = () => rej(new Error('CDP socket failed')); });
  b.ws.onmessage = (ev) => {
    const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString());
    if (msg.id && b.pending.has(msg.id)) {
      const { resolve, reject, timer } = b.pending.get(msg.id);
      clearTimeout(timer); b.pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
    } else if (msg.method) {
      const fns = b.listeners.get((msg.sessionId || '') + '|' + msg.method);
      if (fns) for (const fn of [...fns]) fn(msg.params);
    }
  };
  return b;
}

function stats(g) {
  g = g.slice(1);
  if (!g.length) return null;
  g.sort((a, b) => a - b);
  const sum = g.reduce((a, b) => a + b, 0);
  return { frames: g.length, avg: +(sum / g.length).toFixed(1), p95: +g[Math.floor(g.length * .95)].toFixed(1), max: Math.round(g[g.length - 1]),
    over33: g.filter((x) => x > 33).length, over50: g.filter((x) => x > 50).length };
}

const browser = (headful || profile) ? await launchChrome(!headful) : await Browser.launch({ width: 1440, height: 900, extraArgs: GPU });
try {
  for (const w of widths) {
    const h = w < 700 ? 844 : 900;
    const page = await browser.newPage({ width: w, height: h, dsf: 1, mobile: w < 700 });
    if (calm) await page.send('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('menteya-motion','off')}catch(e){}" });
    if (extraCss) await page.send('Page.addScriptToEvaluateOnNewDocument', { source: 'document.addEventListener("DOMContentLoaded",function(){var s=document.createElement("style");s.textContent=' + JSON.stringify(extraCss) + ';document.head.appendChild(s)})' });
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
      let renderer = '?', parallel = false;
      try { const gl = c.getContext('webgl'); const d = gl.getExtension('WEBGL_debug_renderer_info'); renderer = gl.getParameter(d.UNMASKED_RENDERER_WEBGL); parallel = !!gl.getExtension('KHR_parallel_shader_compile'); } catch (e) {}
      return { renderer, parallel, dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), requests: res.length, kb: Math.round(bytes / 1024),
        longTasks: lt.join(' '), longMs: lt.reduce((a, b) => a + b, 0), heroBuf: c ? c.width + 'x' + c.height : '-', heroCss: c ? c.clientWidth + 'x' + c.clientHeight : '-', html: document.documentElement.className };
    });
    // Кадры в покое на первом экране (мозг рисуется)
    // Страховка: в обычном окне, перекрытом другим приложением, кадры могут не идти вовсе — тогда не висим, а отдаём что есть
    const idle = await page.eval(() => new Promise((resolve) => {
      const gaps = []; let last = performance.now(); const t0 = last;
      setTimeout(() => resolve(gaps), 4500);
      requestAnimationFrame(function f(t) { gaps.push(t - last); last = t; if (t - t0 < 3000) requestAnimationFrame(f); else resolve(gaps); });
    }));
    if (idle.length < 30) console.log('ВНИМАНИЕ: окно браузера не рисует кадры (перекрыто или свёрнуто) — замер прокрутки недостоверен');
    // Кадры при прокрутке: сэмплер внутри страницы, колесо — снаружи, как у посетителя; длинные задачи — с положением прокрутки
    await page.eval(() => {
      window.__s = []; window.__lt = []; window.__y = [];
      let last = performance.now(); const t0 = last;
      requestAnimationFrame(function f(t) { window.__s.push(t - last); window.__y.push([t, scrollY]); last = t; if (t - t0 < 12000) requestAnimationFrame(f); });
      try { const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([e.startTime, Math.round(e.duration)]))); po.observe({ type: 'longtask' }); } catch (e) {}
    });
    await page.wheel(6000, { step: 120, pauseMs: 40 }); await sleep(700);
    await page.wheel(6000, { step: 120, pauseMs: 40 }); await sleep(700);
    await page.wheel(-4000, { step: 120, pauseMs: 40 }); await sleep(1000);
    const scroll = await page.eval(() => window.__s);
    // Второй проход по тем же местам: что осталось после разогрева (сборка шейдеров растра, декодирование картинок)
    await page.eval(() => { window.__s2 = []; let last = performance.now(); const t0 = last; requestAnimationFrame(function f(t) { window.__s2.push(t - last); last = t; if (t - t0 < 12000) requestAnimationFrame(f); }); });
    await page.wheel(-9000, { step: 120, pauseMs: 40 }); await sleep(700);
    await page.wheel(12000, { step: 120, pauseMs: 40 }); await sleep(700);
    await page.wheel(-6000, { step: 120, pauseMs: 40 }); await sleep(1000);
    const scroll2 = await page.eval(() => window.__s2);
    const tasks = await page.eval(() => {
      const secs = [...document.querySelectorAll('main > section, main > div.sec, main section[id], footer')].map((s) => ({ id: s.id || s.className.split(' ').slice(0, 2).join('.'), top: s.getBoundingClientRect().top + scrollY }));
      return window.__lt.map(([t, d]) => {
        let y = 0; for (const [ft, fy] of window.__y) { if (ft <= t) y = fy; else break; }
        let where = '?'; for (const s of secs) if (s.top <= y + innerHeight * .5) where = s.id;
        return d + 'мс@' + where;
      }).join(', ');
    });
    // Где именно были рывки первого прохода: кадр дольше 50 мс → раздел у верха экрана в этот момент
    const spikes = await page.eval(() => {
      const secs = [...document.querySelectorAll('main > section, main > div.sec, main section[id], footer')].map((s) => ({ id: s.id || s.className.split(' ').slice(0, 2).join('.'), top: s.getBoundingClientRect().top + scrollY }));
      const out = [];
      for (let i = 1; i < window.__s.length; i++) if (window.__s[i] > 50) { const y = window.__y[i][1]; let where = '?'; for (const s of secs) if (s.top <= y + innerHeight * .5) where = s.id; out.push(Math.round(window.__s[i]) + 'мс@' + where + '(' + Math.round(y) + ')'); }
      return out.join(', ');
    });
    const after = await page.eval(() => ({ y: Math.round(scrollY), heroBuf: (document.querySelector('.scene-gl') || {}).width }));
    console.log(`\n== ${w}px${calm ? ' (без движения)' : ''}${headful ? ' (окно)' : ''} ==`);
    console.log(info);
    console.log('покой    ', stats(idle));
    console.log('прокрутка', stats(scroll));
    console.log('2-й проход', stats(scroll2));
    console.log('задачи при прокрутке:', tasks || 'нет');
    console.log('рывки 1-го прохода:', spikes || 'нет');
    console.log('после    ', after, '| ошибки JS:', page.consoleErrors.length ? page.consoleErrors.join(' / ') : 'нет');
    await page.close();
  }
} finally {
  await browser.close();
}
