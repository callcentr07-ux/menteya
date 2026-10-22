// Трассировка Chrome во время прокрутки: какие именно работы (растр, декодирование картинок, раскладка, GPU) дают долгие кадры.
//   node tools/perf-trace.mjs <url> [--headful]
// Печатает самые долгие события трассы и сумму по типам. На сайт не попадает.
// Категории skia.* не добавлять: поток событий слишком большой, Tracing.end не завершается.
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const lib = pathToFileURL('C:/Users/Сергей/.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs').href;
const { Browser, findChrome, sleep } = await import(lib);
const argv = process.argv.slice(2);
const headful = argv.includes('--headful');
const url = argv.filter((a) => !a.startsWith('--'))[0];
if (!url) { console.log('нужен адрес страницы'); process.exit(1); }
const GPU = ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];

async function launchHeadful() {
  const exe = findChrome();
  const dir = mkdtempSync(join(tmpdir(), 'perf-chrome-'));
  const args = ['--remote-debugging-port=0', `--user-data-dir=${dir}`, '--no-first-run', '--no-default-browser-check', '--mute-audio',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--disable-features=Translate,MediaRouter,CalculateNativeWinOcclusion', '--window-size=1460,1040', '--window-position=40,40', ...GPU, 'about:blank'];
  const proc = spawn(exe, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = '';
    const t = setTimeout(() => reject(new Error('Chrome не запустился за 20 с')), 20000);
    proc.stderr.on('data', (d) => { buf += d.toString(); const m = buf.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) { clearTimeout(t); resolve(m[1]); } });
    proc.on('exit', (code) => { clearTimeout(t); reject(new Error('Chrome завершился, код ' + code)); });
  });
  const b = new Browser();
  b.proc = proc; b.dir = dir; b.nextId = 1; b.pending = new Map(); b.listeners = new Map();
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

const browser = headful ? await launchHeadful() : await Browser.launch({ width: 1440, height: 900, extraArgs: GPU });
try {
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.goto(url, { settleMs: 3500 });
  const events = [];
  browser.on(page.sessionId, 'Tracing.dataCollected', (p) => { for (const e of p.value) events.push(e); });
  const done = new Promise((res) => browser.on(page.sessionId, 'Tracing.tracingComplete', res));
  await page.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,blink,cc,gpu,v8.execute,loading,disabled-by-default-devtools.timeline.frame', transferMode: 'ReportEvents' }, 10000);
  await page.wheel(6000, { step: 120, pauseMs: 40 }); await sleep(700);
  await page.wheel(6000, { step: 120, pauseMs: 40 }); await sleep(700);
  await page.send('Tracing.end');
  await done;
  // Имена процессов и потоков
  const names = {};
  for (const e of events) if (e.ph === 'M' && (e.name === 'thread_name' || e.name === 'process_name')) names[e.pid + ':' + (e.name === 'process_name' ? 'p' : e.tid)] = e.args.name;
  const X = events.filter((e) => e.ph === 'X' && e.dur);
  const top = X.filter((e) => e.dur > 25000).sort((a, b) => b.dur - a.dur).slice(0, 18);
  console.log('событий:', events.length, '| долгих (>25 мс):', X.filter((e) => e.dur > 25000).length);
  for (const e of top) {
    const proc = names[e.pid + ':p'] || e.pid, th = names[e.pid + ':' + e.tid] || e.tid;
    const a = e.args && (e.args.data || e.args) || {};
    const hint = [a.url, a.frame && 'frame', a.layerId !== undefined && 'layer ' + a.layerId, a.imageType, a.tileData && 'tile', a.stackTrace && a.stackTrace[0] && a.stackTrace[0].functionName].filter(Boolean).join(' ');
    console.log(String(Math.round(e.dur / 1000)).padStart(5) + ' мс  ' + e.name.padEnd(34) + ' ' + String(proc).slice(0, 18).padEnd(18) + ' ' + String(th).slice(0, 22).padEnd(22) + ' ' + hint.slice(0, 90));
  }
  // Сумма по типам среди событий дольше 8 мс в основном потоке страницы и в GPU
  const sum = {};
  for (const e of X) if (e.dur > 8000) { const k = e.name; sum[k] = sum[k] || { n: 0, ms: 0, max: 0 }; sum[k].n++; sum[k].ms += e.dur / 1000; sum[k].max = Math.max(sum[k].max, e.dur / 1000); }
  console.log('\nпо типам (события дольше 8 мс):');
  for (const [k, v] of Object.entries(sum).sort((a, b) => b[1].ms - a[1].ms).slice(0, 14)) console.log('  ' + k.padEnd(36) + ' n=' + String(v.n).padStart(3) + '  всего ' + String(Math.round(v.ms)).padStart(5) + ' мс  макс ' + Math.round(v.max) + ' мс');
  await page.close();
} finally {
  await browser.close();
}
