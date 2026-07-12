/* Builds dist/eclipse-artifact.html: the whole site as ONE self-contained file
   (frames, stills, fonts, gsap/lenis, css, js inlined as data URIs) so it can be
   hosted where no external requests are allowed.
   Usage: node scripts/build-artifact.mjs */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
fs.mkdirSync(DIST, { recursive: true });

// take every STEPth frame, re-encode smaller for the single-file build
const SEQS = {
  orbit:    { count: 160, step: 2, w: 1280, q: 0.62 },
  assembly: { count: 160, step: 2, w: 1280, q: 0.62 },
};

const server = http.createServer((req, res) => {
  if (req.url === '/canvas.html') {
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end('<canvas id=c></canvas>');
  }
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || !fs.statSync(p).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': 'image/webp' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${port}/canvas.html`);

async function recode(url, w, q) {
  return page.evaluate(async ([url, w, q]) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const h = Math.round(w / (img.naturalWidth / img.naturalHeight));
    const c = document.getElementById('c');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    return c.toDataURL('image/webp', q);
  }, [url, w, q]);
}

const FRAMES = {};
for (const [name, cfg] of Object.entries(SEQS)) {
  FRAMES[name] = [];
  for (let i = 0; i < cfg.count; i += cfg.step) {
    const f = `frame_${String(i).padStart(3, '0')}.webp`;
    FRAMES[name].push(await recode(`http://127.0.0.1:${port}/assets/frames/${name}/${f}`, cfg.w, cfg.q));
  }
  console.log(`${name}: ${FRAMES[name].length} frames, ${(FRAMES[name].join('').length / 1e6).toFixed(1)} MB as data URIs`);
}
await browser.close();
server.close();

const b64 = f => fs.readFileSync(path.join(ROOT, f)).toString('base64');
const fontCss = (fam, weight, style, file) =>
  `@font-face{font-family:'${fam}';font-weight:${weight};font-style:${style};font-display:swap;` +
  `src:url(data:font/woff2;base64,${b64('assets/fonts/' + file)}) format('woff2')}`;

let css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');
// replace file-based @font-face block (everything before :root) with data-URI versions
css = css.slice(css.indexOf(':root'));
css = [
  fontCss('Manrope', 300, 'normal', 'manrope-latin-300-normal.woff2'),
  fontCss('Manrope', 500, 'normal', 'manrope-latin-500-normal.woff2'),
  fontCss('Manrope', 700, 'normal', 'manrope-latin-700-normal.woff2'),
  css,
].join('\n');

let js = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');
// frames come from the embedded arrays instead of the network
js = js.replace("src(i) { return `assets/frames/${this.dir}/frame_${String(i).padStart(3, '0')}.webp`; }",
  'src(i) { return window.__FRAMES[this.dir][i]; }');
js = js.replace("new Scrubber(document.getElementById('orbitCanvas'), 'orbit', 160)",
  "new Scrubber(document.getElementById('orbitCanvas'), 'orbit', window.__FRAMES.orbit.length)");
js = js.replace("new Scrubber(document.getElementById('assemblyCanvas'), 'assembly', 160)",
  "new Scrubber(document.getElementById('assemblyCanvas'), 'assembly', window.__FRAMES.assembly.length)");
if (js.includes('assets/frames/')) throw new Error('frame path not fully replaced');

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
// body content only — the artifact host supplies the document skeleton
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('<script src='));
const out = [
  '<title>SEPURAN® Green — Evonik Konzeptstudie</title>',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  `<style>\n${css}\n</style>`,
  body,
  `<script>window.__FRAMES=${JSON.stringify(FRAMES)};</script>`,
  `<script>${fs.readFileSync(path.join(ROOT, 'vendor/gsap.min.js'), 'utf8')}</script>`,
  `<script>${fs.readFileSync(path.join(ROOT, 'vendor/ScrollTrigger.min.js'), 'utf8')}</script>`,
  `<script>${fs.readFileSync(path.join(ROOT, 'vendor/lenis.min.js'), 'utf8')}</script>`,
  `<script>${js}</script>`,
].join('\n');

const outFile = path.join(DIST, 'sepuran-artifact.html');
fs.writeFileSync(outFile, out);
console.log(`${outFile}: ${(out.length / 1e6).toFixed(1)} MB`);
