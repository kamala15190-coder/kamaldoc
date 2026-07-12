/* Headless renderer: drives render/scene.html frame-by-frame and writes
   webp sequences into assets/frames/. Usage: node render/render.mjs [seq ...] */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SEQUENCES = {
  orbit:    { frames: 160, w: 1600, h: 900,  q: 0.80 },
  macro:    { frames: 120, w: 1600, h: 900,  q: 0.80 },
  exploded: { frames: 120, w: 1600, h: 900,  q: 0.80 },
};
const STILLS = {
  atmosphere: { seq: 'atmosphere', t: 0.5, w: 1920, h: 1080, q: 0.86 },
  poster:     { seq: 'orbit',      t: 0.0, w: 1920, h: 1080, q: 0.86 },
};

const MIME = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || !fs.statSync(p).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });
page.on('pageerror', e => { console.error('PAGE ERROR:', e.message); });
page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE:', m.text()); });

await page.goto(`http://127.0.0.1:${port}/render/scene.html`);
await page.waitForFunction('window.SCENE_READY === true', null, { timeout: 30000 });
console.log('WebGL renderer:', await page.evaluate('window.SCENE.webglInfo()'));

async function capture(seq, t, w, h, q) {
  return page.evaluate(([seq, t, w, h, q]) => {
    window.SCENE.setSize(w, h);
    window.SCENE.renderFrame(seq, t);
    return window.SCENE.snapshot('image/webp', q);
  }, [seq, t, w, h, q]);
}

const only = process.argv.slice(2);
const t0 = Date.now();

for (const [name, cfg] of Object.entries(SEQUENCES)) {
  if (only.length && !only.includes(name)) continue;
  const dir = path.join(ROOT, 'assets/frames', name);
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < cfg.frames; i++) {
    const t = i / (cfg.frames - 1);
    const url = await capture(name, t, cfg.w, cfg.h, cfg.q);
    fs.writeFileSync(path.join(dir, `frame_${String(i).padStart(3, '0')}.webp`),
      Buffer.from(url.split(',')[1], 'base64'));
    if (i % 20 === 0) console.log(`${name} ${i}/${cfg.frames}  (${((Date.now()-t0)/1000)|0}s)`);
  }
  console.log(`${name} done: ${cfg.frames} frames`);
}

for (const [name, cfg] of Object.entries(STILLS)) {
  if (only.length && !only.includes(name) && !only.includes('stills')) continue;
  const url = await capture(cfg.seq, cfg.t, cfg.w, cfg.h, cfg.q);
  const out = path.join(ROOT, 'assets/stills', `${name}.webp`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`still ${name} -> ${out}`);
}

await browser.close();
server.close();
console.log(`All done in ${((Date.now()-t0)/1000)|0}s`);
