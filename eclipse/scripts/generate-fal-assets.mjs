/*
 * fal.ai asset pipeline for the Eclipse site.
 *
 * NOTE: this environment's egress policy currently blocks *.fal.run / *.fal.ai /
 * *.fal.media (the proxy answers CONNECT with a policy 403), so this script
 * cannot run here yet. Allowlist those hosts in the Claude Code environment's
 * network policy (or run it on your own machine), then:
 *
 *   export FAL_KEY="<your fal.ai key id:secret>"
 *   node scripts/generate-fal-assets.mjs            # generate hero image + 4 clips
 *   node scripts/generate-fal-assets.mjs --frames   # also re-extract frame sequences
 *
 * Flow (all clips share the same watch design):
 *   1. text-to-image hero of the Eclipse (16:9, high res)
 *   2. image-to-video x4 from that hero image: orbit / macro / exploded / atmosphere
 *   3. download the mp4s, extract webp frame sequences for the scroll scrubbers
 *
 * ffmpeg: uses $FFMPEG if set, else `ffmpeg` on PATH, else Playwright's bundled
 * build (/opt/pw-browsers/ffmpeg-*/ffmpeg-linux) when present.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets/generated');
const KEY = process.env.FAL_KEY;
if (!KEY) { console.error('Set FAL_KEY (fal.ai API key "id:secret") first.'); process.exit(1); }

const QUEUE = 'https://queue.fal.run';

// The most cinematic image + video models on fal.ai as of mid-2026.
// Swap MODEL_VIDEO for 'fal-ai/veo3/image-to-video' if your account has access.
const MODEL_IMAGE = 'fal-ai/flux-pro/v1.1-ultra';
const MODEL_VIDEO = 'fal-ai/kling-video/v2.1/master/image-to-video';

const STYLE = 'Cinematic 4K product film still, epic noir genre, luxury watch commercial, ' +
  'off-black void, dramatic rim lighting, volumetric light, faint gold dust particles, ' +
  'photorealistic, shallow depth of field, no text, no watermark';

const HERO_PROMPT =
  `Ultra-detailed studio photograph of "AURUM & NOIR ECLIPSE", a Swiss luxury tourbillon chronograph ` +
  `floating in a pure black void: brushed black grade-5 titanium case, black sunburst dial, applied gold ` +
  `baton indices, gold dauphine hands, an exposed gold tourbillon cage at 6 o'clock behind domed sapphire ` +
  `glass, two recessed chronograph subdials, black leather strap with gold pin buckle. ${STYLE}`;

const CLIPS = {
  orbit: {
    duration: '10',
    prompt: `Slow, perfectly smooth 360-degree studio turntable rotation of this exact watch floating ` +
      `upright in a black void. Constant speed, camera locked, seamless loop, dramatic rim light tracing ` +
      `the titanium case, gold tourbillon glinting through the sapphire, faint gold dust drifting. ${STYLE}`,
  },
  macro: {
    duration: '10',
    prompt: `Extreme macro close-up glide across this watch dial: engraved indices sweeping past, the gold ` +
      `tourbillon cage spinning once per minute, light rippling across the brushed black metal as the camera ` +
      `slides from 12 o'clock down to the tourbillon at 6. Slow, buttery camera motion. ${STYLE}`,
  },
  exploded: {
    duration: '10',
    prompt: `The watch assembling itself in mid-air from exploded floating components: gears, mainspring, ` +
      `bezel, sapphire glass, crown, dial and strap drift inward and converge precisely into the finished ` +
      `watch. Elegant slow motion, black void, gold parts catching rim light. ${STYLE}`,
  },
  atmosphere: {
    duration: '5',
    prompt: `This watch resting on a black marble slab, thin smoke drifting slowly through a single ` +
      `overhead spotlight, everything else falling to black. Almost still, meditative. ${STYLE}`,
  },
};

async function falQueue(model, input) {
  const submit = await fetch(`${QUEUE}/${model}`, {
    method: 'POST',
    headers: { Authorization: `Key ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!submit.ok) throw new Error(`${model} submit ${submit.status}: ${await submit.text()}`);
  const { status_url, response_url } = await submit.json();
  for (;;) {
    await new Promise(r => setTimeout(r, 4000));
    const s = await (await fetch(status_url, { headers: { Authorization: `Key ${KEY}` } })).json();
    if (s.status === 'COMPLETED') break;
    if (s.status === 'FAILED' || s.error) throw new Error(`${model} failed: ${JSON.stringify(s)}`);
    process.stdout.write('.');
  }
  return (await (await fetch(response_url, { headers: { Authorization: `Key ${KEY}` } })).json());
}

async function download(url, file) {
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  console.log(`\n  saved ${file} (${(buf.length / 1e6).toFixed(1)} MB)`);
}

function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try { execFileSync('ffmpeg', ['-version']); return 'ffmpeg'; } catch { /* not on PATH */ }
  const pw = '/opt/pw-browsers';
  if (fs.existsSync(pw)) {
    const hit = fs.readdirSync(pw).find(d => d.startsWith('ffmpeg'));
    if (hit) return path.join(pw, hit, 'ffmpeg-linux');
  }
  return null;
}

function extractFrames(video, dir, count) {
  const ffmpeg = findFfmpeg();
  if (!ffmpeg) { console.warn('  no ffmpeg found — skipping frame extraction'); return; }
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  // sample `count` evenly spaced frames, scaled to 1600px wide webp
  execFileSync(ffmpeg, [
    '-i', video, '-vf', `fps=${count}/10,scale=1600:-2`, '-frames:v', String(count),
    '-c:v', 'libwebp', '-quality', '80', '-start_number', '0',
    path.join(dir, 'frame_%03d.webp'),
  ], { stdio: 'inherit' });
}

const FRAME_COUNTS = { orbit: 160, macro: 120, exploded: 120 };

console.log('1/3 hero image —', MODEL_IMAGE);
const hero = await falQueue(MODEL_IMAGE, {
  prompt: HERO_PROMPT, aspect_ratio: '16:9', output_format: 'jpeg',
  safety_tolerance: '2', enable_safety_checker: true,
});
const heroUrl = hero.images[0].url;
await download(heroUrl, path.join(OUT, 'hero.jpg'));

console.log('2/3 clips —', MODEL_VIDEO);
for (const [name, clip] of Object.entries(CLIPS)) {
  console.log(`  ${name} (${clip.duration}s)`);
  const res = await falQueue(MODEL_VIDEO, {
    prompt: clip.prompt, image_url: heroUrl, duration: clip.duration,
    aspect_ratio: '16:9', negative_prompt: 'blur, distort, low quality, text, watermark, audio',
  });
  await download(res.video.url, path.join(OUT, `${name}.mp4`));
}

if (process.argv.includes('--frames')) {
  console.log('3/3 extracting frame sequences');
  for (const [name, count] of Object.entries(FRAME_COUNTS)) {
    extractFrames(path.join(OUT, `${name}.mp4`), path.join(ROOT, 'assets/frames', name), count);
  }
  console.log('Replace assets/stills/atmosphere.webp with a frame from atmosphere.mp4 if desired.');
}
console.log('done.');
