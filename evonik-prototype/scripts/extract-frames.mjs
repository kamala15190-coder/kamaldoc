/* Extract an evenly-sampled webp frame sequence from a video.
   Usage: node scripts/extract-frames.mjs <video.mp4> <outDir> <frameCount> [width]
   Uses $FFMPEG, PATH ffmpeg, or Playwright's bundled build. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const [video, outDir, countArg, widthArg] = process.argv.slice(2);
if (!video || !outDir || !countArg) {
  console.error('usage: node scripts/extract-frames.mjs <video> <outDir> <count> [width=1600]');
  process.exit(1);
}
const count = Number(countArg), width = Number(widthArg || 1600);

function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try { execFileSync('ffmpeg', ['-version']); return 'ffmpeg'; } catch { /* not on PATH */ }
  const pw = '/opt/pw-browsers';
  if (fs.existsSync(pw)) {
    const hit = fs.readdirSync(pw).find(d => d.startsWith('ffmpeg'));
    if (hit) return path.join(pw, hit, 'ffmpeg-linux');
  }
  throw new Error('no ffmpeg found');
}
const ffmpeg = findFfmpeg();

// probe duration via ffmpeg (no ffprobe in the playwright bundle)
let dur = 0;
try { execFileSync(ffmpeg, ['-i', video], { stderr: 'pipe' }); } catch (e) {
  const m = String(e.stderr).match(/Duration: (\d+):(\d+):([\d.]+)/);
  if (m) dur = (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]);
}
if (!dur) throw new Error('could not probe video duration');

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
execFileSync(ffmpeg, [
  '-i', video,
  '-vf', `fps=${count}/${dur},scale=${width}:-2`,
  '-frames:v', String(count),
  '-c:v', 'libwebp', '-quality', '80', '-start_number', '0',
  path.join(outDir, 'frame_%03d.webp'),
], { stdio: 'inherit' });
console.log(`${count} frames -> ${outDir} (source ${dur.toFixed(1)}s)`);
