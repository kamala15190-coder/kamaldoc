/* End-to-end verification of the SEPURAN prototype: real scrolling in Chromium,
   asserting every scroll-driven animation responds.
   Usage: node test/verify.mjs [--shots <dir>] [--root <serveRoot>] */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4599;
const shotsIdx = process.argv.indexOf('--shots');
const SHOTS = shotsIdx > -1 ? process.argv[shotsIdx + 1] : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const rootIdx = process.argv.indexOf('--root');
const SERVE_ROOT = rootIdx > -1 ? process.argv[rootIdx + 1] : ROOT;

const server = spawn(process.execPath, [path.join(ROOT, 'scripts/serve.mjs'), String(PORT), SERVE_ROOT], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

let pass = 0, fail = 0; const results = [];
const check = (name, ok, detail = '') => {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
  ok ? pass++ : fail++;
};
const S = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${n}.jpg`), quality: 80, type: 'jpeg' }); };
const go = async y => {
  await page.evaluate(y => window.__evonik.lenis.scrollTo(y, { immediate: true }), y);
  await page.waitForTimeout(400);
};
// scroll to a given ScrollTrigger progress (0..1) within a pinned section,
// accounting for the sticky pin: scrollable distance = sectionH - viewportH.
const goProg = async (id, p) => {
  const y = await page.evaluate(([id, p]) => {
    const el = document.getElementById(id);
    return el.offsetTop + p * (el.offsetHeight - innerHeight);
  }, [id, p]);
  await go(y);
};

await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !document.getElementById('loader') ||
  document.getElementById('loader').classList.contains('done'), null, { timeout: 60000 });
check('preloader finishes after orbit frames load', true);
await page.waitForTimeout(2600);

const L = await page.evaluate(() => ({
  hero: document.getElementById('hero').offsetTop,
  heroH: document.getElementById('hero').offsetHeight,
  ex: document.getElementById('explainer').offsetTop,
  exH: document.getElementById('explainer').offsetHeight,
  as: document.getElementById('assembly').offsetTop,
  asH: document.getElementById('assembly').offsetHeight,
  im: document.getElementById('impact').offsetTop,
  max: document.body.scrollHeight - innerHeight,
}));

// intro + hero scrub
const wm = await page.$eval('#wordmark', el => +getComputedStyle(el).opacity);
check('wordmark intro plays', wm > 0.9, `opacity=${wm}`);
await S('01-hero-top');
const i0 = await page.evaluate(() => window.__evonik.orbit.index);
await go(L.hero + L.heroH * 0.45);
const i1 = await page.evaluate(() => window.__evonik.orbit.index);
const cnt = await page.evaluate(() => window.__evonik.orbit.count);
check('hero orbit scrubs forward', i1 > i0 + cnt * 0.2, `idx ${i0} -> ${i1} of ${cnt}`);
const mistMid = await page.evaluate(() => window.__evonik.mistLevel());
check('mist risen mid-sequence', mistMid > 0.4, `level=${mistMid.toFixed(2)}`);
const line1 = await page.$eval('#heroLine1', el => +getComputedStyle(el).opacity);
await S('02-hero-mid');
await go(L.hero + L.heroH * 0.34);
const line1b = await page.$eval('#heroLine1', el => +getComputedStyle(el).opacity);
check('hero copy waypoint appears', Math.max(line1, line1b) > 0.5, `opacity=${Math.max(line1, line1b)}`);
await go(L.hero + L.heroH * 0.2);
const iBack = await page.evaluate(() => window.__evonik.orbit.index);
check('hero orbit scrubs backwards', iBack < i1, `idx ${i1} -> ${iBack}`);
await go(L.hero + L.heroH * 0.97);
await page.waitForTimeout(1200); // mist eases toward target
const mistEnd = await page.evaluate(() => window.__evonik.mistLevel());
check('mist sinks and fades out after the sequence', mistEnd < 0.25, `level=${mistEnd.toFixed(2)}`);
await S('03-hero-end');

// explainer
await go(L.ex + L.exH * 0.55);
const exH2 = await page.$eval('.explainer-copy h2', el => +getComputedStyle(el).opacity);
const exLast = await page.$eval('.ex-line:last-of-type', el => +getComputedStyle(el).opacity);
const exPinned = await page.$eval('.explainer-stage', el => Math.abs(el.getBoundingClientRect().top) < 2);
check('explainer pinned at viewport top', exPinned);
check('explainer heading revealed', exH2 > 0.9, `opacity=${exH2}`);
check('explainer last line revealed by 55%', exLast > 0.5, `opacity=${exLast}`);
await S('04-explainer');

// assembly (progress-based to account for the sticky pin)
await goProg('assembly', 0.06);
const a0 = await page.evaluate(() => window.__evonik.assembly.index);
const co1 = await page.$eval('#co1', el => +getComputedStyle(el).opacity);
await S('05-assembly-fibers');
await goProg('assembly', 0.43);
const co3 = await page.$eval('#co3', el => +getComputedStyle(el).opacity);
await goProg('assembly', 0.64);
const co4 = await page.$eval('#co4', el => +getComputedStyle(el).opacity);
await goProg('assembly', 0.83);
const co5 = await page.$eval('#co5', el => +getComputedStyle(el).opacity);
await goProg('assembly', 0.99);
const a1 = await page.evaluate(() => window.__evonik.assembly.index);
const aCnt = await page.evaluate(() => window.__evonik.assembly.count);
check('assembly scrubs (module builds itself)', a1 > a0 + aCnt * 0.5, `idx ${a0} -> ${a1} of ${aCnt}`);
check('callout Hohlfaserbündel at waypoint', co1 > 0.5, `opacity=${co1}`);
check('callout O-Ringe/Platten at waypoint', co3 > 0.5, `opacity=${co3}`);
check('callout Retentatkappen at waypoint', co4 > 0.5, `opacity=${co4}`);
check('callout Klammern/Schrauben at waypoint', co5 > 0.5, `opacity=${co5}`);
await S('06-assembly-clamps');
await go(L.as + L.asH * 0.97);
const endLine = await page.$eval('#assemblyEnd', el => +getComputedStyle(el).opacity);
check('assembly closing line appears', endLine > 0.5, `opacity=${endLine}`);
await S('07-assembly-done');

// impact
await go(L.im - 250);
await page.waitForTimeout(1500);
const imH2 = await page.$eval('.impact-copy h2', el => +getComputedStyle(el).opacity);
const media = await page.evaluate(() => {
  const v = document.getElementById('impactVideo');
  if (v.style.display !== 'none' && v.readyState >= 2 && !v.paused) return 'video';
  const c = document.getElementById('auroraCanvas');
  return c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some(px => px > 0) ? 'aurora' : 'none';
});
check('impact copy reveals', imH2 > 0.8, `opacity=${imH2}`);
check('impact background media running', media !== 'none', media);
await S('08-impact');

// footer
await go(L.max);
const footerOk = await page.$eval('.footer-bottom', el => el.textContent.includes('Konzeptstudie'));
check('footer with disclaimer present', footerOk);
const prog = await page.$eval('#progressBar', el => getComputedStyle(el).transform);
check('progress bar full at page end', !/matrix\(0[,.]/.test(prog), prog);
await S('09-footer');

check('no page/console errors', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log('\n' + results.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
server.kill();
process.exit(fail ? 1 : 0);
