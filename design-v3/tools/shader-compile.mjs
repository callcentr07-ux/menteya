// Сколько времени браузер собирает шейдеры мозга и как это зависит от версии GLSL и формы цикла (Chrome/Edge через CDP, холодный кеш).
//   node tools/shader-compile.mjs http://localhost:8765/design-v3/index.html
// Исходники шейдеров страница отдаёт через window.MenteyaLight.shaders. Нонс в каждом варианте — чтобы кеш программ не отдал готовую сборку.
import { pathToFileURL } from 'node:url';

const lib = pathToFileURL('C:/Users/Сергей/.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs').href;
const { Browser } = await import(lib);
const url = process.argv[2];
if (!url) { console.log('нужен адрес страницы'); process.exit(1); }
const browser = await Browser.launch({ width: 1440, height: 900, extraArgs: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.goto(url, { settleMs: 3000 });
  const out = await page.eval(() => {
    const S = window.MenteyaLight.shaders;
    const NL = String.fromCharCode(10);
    function variant(src, kind, n) {
      let s = src;
      if (kind === 'es3') {
        s = s.replace('uniform vec2 uRes;', 'uniform float uSteps; uniform vec2 uRes;')
          .replace(/for\(int i = 0; i < 110; i\+\+\)\{/g, 'for(int i = 0; i < int(uSteps); i++){');
        s = '#version 300 es' + NL + s.replace('#endif' + NL, '#endif' + NL + 'out vec4 fragColor;' + NL).replace(/gl_FragColor/g, 'fragColor');
      }
      s = s.replace('uniform vec2 uRes;', 'uniform float uN' + n + '; uniform vec2 uRes;')
        .replace(/(gl_FragColor|fragColor) = vec4\(col, 1\.\);/, '$1 = vec4(col + uN' + n + ' * .0001, 1.);')
        .replace(/(gl_FragColor|fragColor) = vec4\(col, a\);/, '$1 = vec4(col + uN' + n + ' * .0001, a);');
      return s;
    }
    function timeCompile(src, ctx) {
      const c = document.createElement('canvas'); c.width = 64; c.height = 64;
      const gl = c.getContext(ctx, { powerPreference: 'low-power' });
      if (!gl) return { ms: -1, log: 'нет контекста ' + ctx };
      const t0 = performance.now();
      const vsrc = src.startsWith('#version 300 es') ? '#version 300 es' + NL + 'in vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }' : S.vs;
      const vs = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vs, vsrc); gl.compileShader(vs);
      const fs = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fs, src); gl.compileShader(fs);
      const p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
      const ok = gl.getProgramParameter(p, gl.LINK_STATUS);
      const ms = Math.round(performance.now() - t0);
      const log = ok ? '' : (gl.getShaderInfoLog(fs) || gl.getProgramInfoLog(p) || gl.getShaderInfoLog(vs) || '').slice(0, 240);
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      return { ms, ok: !!ok, log };
    }
    const res = {};
    let n = 1;
    for (const [name, src] of [['brain', S.brain], ['map', S.map], ['lens', S.lens]]) {
      res[name] = {};
      res[name]['es1 webgl1'] = timeCompile(variant(src, 'orig', n++), 'webgl');
      res[name]['es3 webgl2'] = timeCompile(variant(src, 'es3', n++), 'webgl2');
      res[name]['es3 webgl2 again'] = timeCompile(variant(src, 'es3', n++), 'webgl2');
    }
    return res;
  });
  for (const [name, v] of Object.entries(out)) {
    console.log('== ' + name + ' ==');
    for (const [k, r] of Object.entries(v)) console.log('  ' + k.padEnd(18) + (r.ms + ' мс').padStart(9) + (r.ok ? '' : '  ОШИБКА: ' + r.log));
  }
  await page.close();
} finally {
  await browser.close();
}
