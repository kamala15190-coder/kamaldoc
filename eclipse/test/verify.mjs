/* End-to-end verification: serves the site, drives real scrolling in Chromium,
   and asserts that every scroll-driven animation actually responds.
   Usage: node test/verify.mjs [--shots <dir>] */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4499;
const shotsIdx = process.argv.indexOf('--shots');
const SHOTS = shotsIdx > -1 ? process.argv[shotsIdx + 1] : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const server = spawn(process.execPath, [path.join(ROOT, 'scripts/serve.mjs'), String(PORT)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

let pass = 0, fail = 0;
const results = [];
function check(name, ok, detail = '') {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
  ok ? pass++ : fail++;
}

await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });

// 1. preloader completes (all 160 orbit frames load) and reveals the page
await page.waitForFunction(() => document.getElementById('loader')?.classList.contains('done') ||
  !document.getElementById('loader'), null, { timeout: 60000 });
check('preloader finishes after orbit frames load', true);
await page.waitForTimeout(3200); // let the wordmark tracking-in intro play

const S = async (name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}.jpg`), quality: 80, type: 'jpeg' }); };

// helper: scroll to absolute y through Lenis and settle
async function go(y) {
  await page.evaluate(y => window.__eclipse.lenis.scrollTo(y, { immediate: true }), y);
  await page.waitForTimeout(350); // ScrollTrigger + canvas redraw
}
const layout = await page.evaluate(() => {
  const at = id => { const el = document.getElementById(id); return el.offsetTop; };
  return { hero: at('hero'), story: at('story'), macro: at('macro'),
    engineering: at('engineering'), edition: at('edition'), waitlist: at('waitlist'),
    heroH: document.getElementById('hero').offsetHeight,
    storyH: document.getElementById('story').offsetHeight,
    macroH: document.getElementById('macro').offsetHeight,
    engineeringH: document.getElementById('engineering').offsetHeight,
    max: document.body.scrollHeight - innerHeight };
});

// 2. intro state
const wmOpacity = await page.$eval('#wordmark', el => +getComputedStyle(el).opacity);
check('wordmark tracked in on load', wmOpacity > 0.9, `opacity=${wmOpacity}`);
await S('01-hero-top');

// 3. hero orbit scrub: canvas frame index follows scroll, pixels change
const idx0 = await page.evaluate(() => window.__eclipse.orbit.index);
const px0 = await page.evaluate(() => document.getElementById('orbitCanvas').toDataURL('image/png').length);
await go(layout.hero + (layout.heroH - 900) * 0.5);
const idxMid = await page.evaluate(() => window.__eclipse.orbit.index);
const pxMid = await page.evaluate(() => document.getElementById('orbitCanvas').toDataURL('image/png').length);
check('orbit scrubs with scroll (frame index advances)', idxMid > idx0 + 40, `idx ${idx0} -> ${idxMid}`);
check('orbit canvas pixels actually change', px0 !== pxMid, `png bytes ${px0} vs ${pxMid}`);
await S('02-hero-mid');

// wordmark released, mid-hero line present at its waypoint
const wmGone = await page.$eval('#wordmark', el => +getComputedStyle(el).opacity);
check('wordmark releases as orbit begins', wmGone < 0.15, `opacity=${wmGone}`);
await go(layout.hero + (layout.heroH - 900) * 0.40);
const line1 = await page.$eval('#heroLine1', el => +getComputedStyle(el).opacity);
check('hero copy waypoint 1 visible at 40%', line1 > 0.5, `opacity=${line1}`);
await go(layout.hero + (layout.heroH - 900) * 0.82);
const line2 = await page.$eval('#heroLine2', el => +getComputedStyle(el).opacity);
check('hero copy waypoint 2 visible at 82%', line2 > 0.5, `opacity=${line2}`);
await S('03-hero-line2');

// 4. orbit scrub direction reverses correctly (scroll back)
await go(layout.hero + (layout.heroH - 900) * 0.2);
const idxBack = await page.evaluate(() => window.__eclipse.orbit.index);
check('orbit scrubs backwards on scroll up', idxBack < idxMid, `idx ${idxMid} -> ${idxBack}`);

// 5. story pinned reveals
await go(layout.story + (layout.storyH - 900) * 0.10);
const s1 = await page.$eval('.story-copy h2', el => +getComputedStyle(el).opacity);
await go(layout.story + (layout.storyH - 900) * 0.55);
const s2 = await page.$eval('.story-copy h2', el => +getComputedStyle(el).opacity);
check('story heading reveals while pinned', s2 > 0.9 && s2 > s1, `${s1} -> ${s2}`);
await go(layout.story + (layout.storyH - 900) * 0.80);
const lastLine = await page.$eval('.story-line:last-of-type', el => +getComputedStyle(el).opacity);
check('story last line revealed by 80%', lastLine > 0.6, `opacity=${lastLine}`);
const pinned = await page.$eval('.story-stage', el => Math.abs(el.getBoundingClientRect().top) < 2);
check('story stage is pinned (sticky at viewport top)', pinned);
await S('04-story');

// 6. macro scrub + captions
await go(layout.macro + (layout.macroH - 900) * 0.15);
const mIdx1 = await page.evaluate(() => window.__eclipse.macro.index);
const cap1 = await page.$eval('#cap1', el => +getComputedStyle(el).opacity);
await S('05-macro-cap1');
await go(layout.macro + (layout.macroH - 900) * 0.5);
const mIdx2 = await page.evaluate(() => window.__eclipse.macro.index);
const cap2 = await page.$eval('#cap2', el => +getComputedStyle(el).opacity);
await go(layout.macro + (layout.macroH - 900) * 0.85);
const cap3 = await page.$eval('#cap3', el => +getComputedStyle(el).opacity);
const cap1gone = await page.$eval('#cap1', el => +getComputedStyle(el).opacity);
check('macro sequence scrubs with scroll', mIdx2 > mIdx1 + 20, `idx ${mIdx1} -> ${mIdx2}`);
check('macro caption 1 at its waypoint', cap1 > 0.5, `opacity=${cap1}`);
check('macro caption 2 at its waypoint', cap2 > 0.5, `opacity=${cap2}`);
check('macro caption 3 at its waypoint', cap3 > 0.5, `opacity=${cap3}`);
check('macro caption 1 releases after its window', cap1gone < 0.1, `opacity=${cap1gone}`);
await S('06-macro-cap3');

// 7. engineering: exploded scrub + spec callouts
await go(layout.engineering + (layout.engineeringH - 900) * 0.2);
const eIdx1 = await page.evaluate(() => window.__eclipse.exploded.index);
const spec1 = await page.$eval('#spec1', el => +getComputedStyle(el).opacity);
await S('07-exploded-spec1');
await go(layout.engineering + (layout.engineeringH - 900) * 0.5);
const spec2 = await page.$eval('#spec2', el => +getComputedStyle(el).opacity);
await go(layout.engineering + (layout.engineeringH - 900) * 0.72);
const spec3 = await page.$eval('#spec3', el => +getComputedStyle(el).opacity);
await go(layout.engineering + (layout.engineeringH - 900) * 1.0);
const eIdx2 = await page.evaluate(() => window.__eclipse.exploded.index);
const assembly = await page.$eval('#assemblyLine', el => +getComputedStyle(el).opacity);
check('exploded sequence scrubs (assembly progresses)', eIdx2 > eIdx1 + 60, `idx ${eIdx1} -> ${eIdx2}`);
check('spec 42mm titanium at its waypoint', spec1 > 0.5, `opacity=${spec1}`);
check('spec 72h reserve at its waypoint', spec2 > 0.5, `opacity=${spec2}`);
check('spec 217 components at its waypoint', spec3 > 0.5, `opacity=${spec3}`);
check('assembly closing line appears at 95%', assembly > 0.5, `opacity=${assembly}`);
await S('08-exploded-end');

// 8. edition reveal + smoke running
await go(layout.edition - 200);
await page.waitForTimeout(1600);
const edH2 = await page.$eval('.edition-copy h2', el => +getComputedStyle(el).opacity);
const smokeDrawn = await page.evaluate(() => {
  const c = document.getElementById('smokeCanvas');
  return c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some(v => v > 0);
});
check('edition copy reveals on enter', edH2 > 0.8, `opacity=${edH2}`);
check('smoke canvas is animating (non-empty pixels)', smokeDrawn);
await S('09-edition');

// 9. waitlist reveal + form swap
await go(layout.max);
await page.waitForTimeout(1400);
const wlH2 = await page.$eval('.waitlist-copy h2', el => +getComputedStyle(el).opacity);
check('waitlist reveals on enter', wlH2 > 0.8, `opacity=${wlH2}`);
await S('10-waitlist');
await page.fill('#wlEmail', 'collector@example.com');
await page.click('#waitlistForm button');
const done = await page.$eval('#waitlistDone', el => getComputedStyle(el).display !== 'none');
check('waitlist form submits to confirmation', done);
await S('11-waitlist-done');

// 10. progress hairline + no js errors
const prog = await page.$eval('#progressBar', el => getComputedStyle(el).transform);
check('progress hairline at full scale at page end', !/matrix\(0[,.]/.test(prog), prog);
check('no page/console errors', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log('\n' + results.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
server.kill();
process.exit(fail ? 1 : 0);
