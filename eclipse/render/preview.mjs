/* Quick look: renders a handful of probe frames to the scratchpad for review. */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.PREVIEW_OUT || '/tmp/preview';
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html':'text/html', '.js':'text/javascript' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || !fs.statSync(p).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });
page.on('pageerror', e => console.error('PAGE ERROR:', e.message));
page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE:', m.text()); });
await page.goto(`http://127.0.0.1:${server.address().port}/render/scene.html`);
await page.waitForFunction('window.SCENE_READY === true', null, { timeout: 30000 });
console.log('WebGL:', await page.evaluate('window.SCENE.webglInfo()'));

const probes = [
  ['orbit', 0], ['orbit', 0.25], ['orbit', 0.5],
  ['macro', 0], ['macro', 0.55], ['macro', 1],
  ['exploded', 0], ['exploded', 0.5], ['exploded', 1],
  ['atmosphere', 0.5],
];
for (const [seq, t] of probes) {
  const url = await page.evaluate(([seq, t]) => {
    window.SCENE.setSize(1280, 720);
    window.SCENE.renderFrame(seq, t);
    return window.SCENE.snapshot('image/jpeg', 0.85);
  }, [seq, t]);
  const f = path.join(OUT, `${seq}_${String(t).replace('.', '_')}.jpg`);
  fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote', f);
}
await browser.close();
server.close();
