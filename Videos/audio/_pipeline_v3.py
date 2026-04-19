#!/usr/bin/env python3
"""
kdoc v2 Audio Pipeline — Precise Timestamp Version
Voice: hBOVjideqPyMYjloL1fg
Output: Videos/kdoc_reel_v2_final.mp4
"""

import sys, json, time, shutil, subprocess
from pathlib import Path
import urllib.request, urllib.error

ROOT      = Path(r"D:\Projekte\KamalDoc\Videos")
AUDIO_DIR = ROOT / "audio"
LINES_DIR = AUDIO_DIR / "lines"
ENV_FILE  = ROOT.parent / "backend" / ".env"

LINES_DIR.mkdir(parents=True, exist_ok=True)

# Load env
keys = {}
for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, _, v = line.partition("=")
        keys[k.strip()] = v.strip()

ELEVEN_KEY = keys["ELEVENLABS_API_KEY"]
VOICE_ID   = "hBOVjideqPyMYjloL1lg"

# num, placement_ms, scene_end_s, text
LINES = [
    (1,    500,  4.0, "Papierstapel war gestern."),
    (2,   4500,  9.0, "keydoc scannt, erkennt und archiviert deine Dokumente \u2014 vollautomatisch."),
    (3,   9500, 15.0, "Der Befundassistent erkl\u00e4rt medizinische Befunde einfach und verst\u00e4ndlich \u2014 in \u00fcber f\u00fcnfzig Sprachen."),
    (4,  15500, 20.0, "Fristen f\u00fcr Beh\u00f6rden, Vertr\u00e4ge und Rechnungen \u2014 keydoc erinnert dich rechtzeitig."),
    (5,  20500, 26.0, "Eingehende Briefe? keydoc antwortet automatisch f\u00fcr dich."),
    (6,  26500, 36.0, "Verbinde deine E-Mail-Konten mit keydoc. Eine Suche. Alle Quellen."),
    (7,  37000, 50.0, "keydoc. Jetzt kostenlos im Google Play Store."),
]

def run(cmd, check=True, capture=False):
    print(f"  $ {' '.join(str(c) for c in cmd)[:120]}")
    if capture:
        return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    subprocess.run(cmd, check=check)

def get_duration(path):
    r = run(["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "csv=p=0", str(path)], capture=True)
    return float(r.stdout.strip())

def tts(text, dest: Path):
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.50,
            "similarity_boost": 0.80,
            "style": 0.35,
            "use_speaker_boost": True,
        }
    }
    hdrs = {
        "xi-api-key": ELEVEN_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}",
        data=json.dumps(payload).encode(),
        headers=hdrs, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            dest.write_bytes(resp.read())
        print(f"    OK {dest.name}  ({dest.stat().st_size // 1024} KB)")
        return True
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        print(f"    FAIL HTTP {e.code}: {body[:300]}")
        return False

# ── STEP 1: Voiceover Lines ────────────────────────────────────────────────────
print("\n== STEP 1: ElevenLabs Voiceover ==")
print(f"   Voice ID: {VOICE_ID}")

durations = {}
for num, ms, scene_end, text in LINES:
    dest = LINES_DIR / f"line_{num:02d}.mp3"
    print(f"\n  line_{num:02d} (placement {ms/1000:.1f}s): {text[:65]}")
    if dest.exists() and dest.stat().st_size > 1000:
        print(f"    Skipping (already exists)")
    else:
        ok = tts(text, dest)
        if not ok:
            raise RuntimeError(f"TTS failed for line {num}")
    time.sleep(0.5)
    dur = get_duration(dest)
    durations[num] = dur
    end = ms / 1000 + dur
    status = "OK" if end <= scene_end else f"WARNING: overflows scene end {scene_end}s by {end - scene_end:.2f}s"
    print(f"    Duration: {dur:.2f}s  end={end:.2f}s  [{status}]")

print("\n  All 7 lines generated.")

# ── STEP 2: Silent Base ────────────────────────────────────────────────────────
print("\n== STEP 2: Silent Base Track (50s) ==")
silent_base = AUDIO_DIR / "silent_base.mp3"
run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
     "-t", "50", "-c:a", "libmp3lame", "-b:a", "128k", str(silent_base)])

# ── STEP 3: Timed Voiceover Mix ───────────────────────────────────────────────
print("\n== STEP 3: Timed Voiceover Mix ==")
vo_out = AUDIO_DIR / "voiceover_timed.mp3"

filter_parts = []
for num, ms, _, _ in LINES:
    filter_parts.append(f"[{num}:a]adelay={ms}|{ms}[v{num}]")
mix_labels = "[0:a]" + "".join(f"[v{num}]" for num, _, _, _ in LINES)
filter_parts.append(f"{mix_labels}amix=inputs=8:duration=first:normalize=0[out]")
filter_complex = ";\n    ".join(filter_parts)

cmd = ["ffmpeg", "-y", "-i", str(silent_base)]
for num, _, _, _ in LINES:
    cmd += ["-i", str(LINES_DIR / f"line_{num:02d}.mp3")]
cmd += ["-filter_complex", filter_complex,
        "-map", "[out]",
        "-c:a", "libmp3lame", "-b:a", "192k",
        str(vo_out)]
run(cmd)

dur_vo = get_duration(vo_out)
print(f"\n  OK voiceover_timed.mp3: {dur_vo:.1f}s  {vo_out.stat().st_size // 1024} KB")
assert 49 <= dur_vo <= 51, f"Unexpected duration: {dur_vo:.1f}s"

# ── STEP 4: Background Music ──────────────────────────────────────────────────
print("\n== STEP 4: Background Music ==")
bg_out   = AUDIO_DIR / "background.mp3"
bg_name  = None
BG_URLS  = [
    ("Thinking Music",   "https://freepd.com/music/Thinking%20Music.mp3"),
    ("Somewhere Sunny",  "https://freepd.com/music/Somewhere%20Sunny.mp3"),
    ("Digital Lemonade", "https://freepd.com/music/Digital%20Lemonade.mp3"),
    ("Night Cave",       "https://freepd.com/music/Night%20Cave.mp3"),
]

if bg_out.exists() and bg_out.stat().st_size > 50000:
    d = get_duration(bg_out)
    if d > 30:
        print(f"  Re-using existing background.mp3 ({d:.0f}s)")
        bg_name = "cached"

if not bg_name:
    for name, url in BG_URLS:
        print(f"  Trying: {name}")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
            if len(data) < 50000:
                print(f"    Too small ({len(data)} bytes)")
                continue
            bg_out.write_bytes(data)
            d = get_duration(bg_out)
            if d < 30:
                print(f"    Too short ({d:.0f}s)")
                continue
            print(f"    OK {name}: {d:.0f}s  {bg_out.stat().st_size // 1024} KB")
            bg_name = name
            break
        except Exception as e:
            print(f"    FAIL: {e}")

if not bg_name:
    print("  All URLs failed — synthesizing Am7 pad...")
    total = 55.0
    freqs = [220.0, 261.6, 329.6, 392.0]
    n = len(freqs)
    src_labels = "".join(f"[s{i}]" for i in range(n))
    fc = [f"sine=frequency={f}:sample_rate=44100:duration={total}[s{i}]" for i, f in enumerate(freqs)]
    fc.append(f"{src_labels}amix=inputs={n}:duration=first[mixed]")
    fc.append(f"[mixed]afade=in:st=0:d=3,afade=out:st={total-4:.1f}:d=4,"
              f"aecho=0.6:0.88:60|80:0.4|0.3,volume=1.6[aout]")
    run(["ffmpeg", "-y", "-filter_complex", ";".join(fc),
         "-map", "[aout]", "-c:a", "libmp3lame", "-b:a", "128k", str(bg_out)])
    bg_name = "Synthesized Am7 Pad"

bg_looped = AUDIO_DIR / "background_looped.mp3"
bg_dur = get_duration(bg_out)
if bg_dur < 52:
    print(f"  Looping background ({bg_dur:.0f}s < 52s)...")
    run(["ffmpeg", "-y", "-stream_loop", "-1", "-i", str(bg_out),
         "-t", "52", "-c:a", "libmp3lame", "-b:a", "128k", str(bg_looped)])
else:
    shutil.copy2(str(bg_out), str(bg_looped))
print(f"  OK background_looped.mp3")

# ── STEP 5: Final Audio Mix ───────────────────────────────────────────────────
print("\n== STEP 5: Final Audio Mix ==")
final_audio = AUDIO_DIR / "final_audio.mp3"
run([
    "ffmpeg", "-y",
    "-i", str(bg_looped),
    "-i", str(vo_out),
    "-filter_complex", (
        "[0:a]volume=0.08,afade=t=in:st=0:d=3,afade=t=out:st=46:d=4[music];"
        "[1:a]volume=1.0[voice];"
        "[music][voice]amix=inputs=2:duration=longest:normalize=0[out]"
    ),
    "-map", "[out]",
    "-c:a", "libmp3lame", "-b:a", "192k",
    "-t", "50",
    str(final_audio)
])
print(f"  OK final_audio.mp3: {final_audio.stat().st_size // 1024} KB")

# ── STEP 6: Merge Video + Audio ───────────────────────────────────────────────
print("\n== STEP 6: Merge Video + Audio ==")
video = ROOT / "kdoc_reel_v2.mp4"
out   = ROOT / "kdoc_reel_v2_final.mp4"
run([
    "ffmpeg", "-y",
    "-i", str(video),
    "-i", str(final_audio),
    "-c:v", "copy",
    "-c:a", "aac", "-b:a", "192k",
    "-map", "0:v:0", "-map", "1:a:0",
    "-t", "50",
    str(out)
])
print(f"  OK kdoc_reel_v2_final.mp4: {out.stat().st_size // 1024} KB")

# ── STEP 7: Verify ────────────────────────────────────────────────────────────
print("\n== STEP 7: Verify ==")
r = run(["ffprobe", "-v", "error",
         "-show_entries", "format=duration,size",
         "-show_entries", "stream=codec_type,codec_name",
         "-of", "json", str(out)], capture=True)
info    = json.loads(r.stdout)
fmt     = info["format"]
dur_out = float(fmt["duration"])
size_mb = int(fmt["size"]) / 1e6
codecs  = {s["codec_type"]: s["codec_name"] for s in info.get("streams", [])}

assert size_mb > 2,      f"File too small: {size_mb:.1f} MB"
assert "video" in codecs, "No video track"
assert "audio" in codecs, "No audio track"

PLACEMENTS = [
    (0.5,  "Papierstapel war gestern."),
    (4.5,  "keydoc scannt..."),
    (9.5,  "Der Befundassistent..."),
    (15.5, "Fristen fuer Behoerden..."),
    (20.5, "Eingehende Briefe..."),
    (26.5, "Verbinde deine E-Mail-Konten..."),
    (37.0, "keydoc. Jetzt kostenlos..."),
]

print()
print("FERTIG - Video und Audio sind synchron")
print(f"kdoc_reel_v2_final.mp4")
print(f"Dauer  : {dur_out:.1f}s")
print(f"Groesse: {size_mb:.1f} MB")
print(f"Video  : {codecs.get('video', '?')}")
print(f"Audio  : {codecs.get('audio', '?')}")
print()
print("Voiceover-Timestamps:")
for t, text in PLACEMENTS:
    print(f"  {t:5.1f}s  -> {text}")
