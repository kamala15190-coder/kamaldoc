#!/usr/bin/env python3
"""
kdoc v2 Reel Audio Pipeline
Voice: Michael - hBOVjideqPyMYjloL1lg (stability=0.50, boost=true)
Input:  Videos/kdoc_reel_v2.mp4
Output: Videos/kdoc_reel_v2_final.mp4
"""

import sys, json, time, subprocess
from pathlib import Path
import urllib.request, urllib.error

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT      = Path(__file__).parent.parent        # Videos/
AUDIO_DIR = ROOT / "audio"
LINES_DIR = AUDIO_DIR / "lines"
ENV_FILE  = ROOT.parent / "backend" / ".env"

LINES_DIR.mkdir(parents=True, exist_ok=True)

# ── Keys ──────────────────────────────────────────────────────────────────────
keys = {}
for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, _, v = line.partition("=")
        keys[k.strip()] = v.strip()

ELEVEN_KEY = keys["ELEVENLABS_API_KEY"]

# ── Voice ─────────────────────────────────────────────────────────────────────
VOICE_ID   = "pNInz6obpgDQGcFmaJgB"   # Adam - free-tier male (Michael requires paid plan)
VOICE_NAME = "Adam (Michael requires paid plan)"

# ── VO Script ─────────────────────────────────────────────────────────────────
LINES = [
    (1, "Papierstapel war gestern."),
    (2, "keydoc scannt, erkennt und archiviert deine Dokumente \u2014 vollautomatisch."),
    (3, "Der Befundassistent erkl\u00e4rt medizinische Befunde einfach und verst\u00e4ndlich \u2014 in \u00fcber f\u00fcnfzig Sprachen."),
    (4, "Fristen f\u00fcr Beh\u00f6rden, Vertr\u00e4ge und Rechnungen \u2014 keydoc erinnert dich rechtzeitig."),
    (5, "Eingehende Briefe? keydoc antwortet automatisch f\u00fcr dich."),
    (6, "Verbinde deine E-Mail-Konten mit keydoc. Eine Suche. Alle Quellen."),
    (7, "keydoc. Jetzt kostenlos im Google Play Store."),
]

# Silence after each line (ms)
GAPS_MS = {1: 1200, 2: 1000, 3: 1000, 4: 1000, 5: 1000, 6: 1000, 7: 800}

# ── Utilities ─────────────────────────────────────────────────────────────────
def run(cmd, check=True, capture=False):
    print(f"  $ {' '.join(str(c) for c in cmd)[:110]}")
    if capture:
        return subprocess.run(cmd, capture_output=True, text=True)
    subprocess.run(cmd, check=check)

def get_duration(path):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(path)], capture=True)
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
        print(f"    OK {dest.name}  ({dest.stat().st_size//1024} KB)")
        return True
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        print(f"    FAIL HTTP {e.code}: {body[:200]}")
        return False

def silence_mp3(ms: int, dest: Path):
    if dest.exists():
        return
    run(["ffmpeg", "-y", "-f", "lavfi",
         "-i", f"anullsrc=r=44100:cl=stereo",
         "-t", f"{ms/1000:.3f}",
         "-c:a", "libmp3lame", "-b:a", "128k", str(dest)])

# ── STEP 1: Voiceover ─────────────────────────────────────────────────────────
def step_vo():
    print("\n== STEP 1: ElevenLabs Voiceover ==")
    print(f"   Voice: {VOICE_NAME} ({VOICE_ID})")

    # Delete old lines (different voice/text)
    for f in LINES_DIR.glob("line_*.mp3"):
        f.unlink()
        print(f"   Removed old {f.name}")

    for num, text in LINES:
        dest = LINES_DIR / f"line_{num:02d}.mp3"
        print(f"\n  line_{num:02d}: {text[:60]}...")
        ok = tts(text, dest)
        if not ok:
            raise RuntimeError(f"TTS failed for line {num}")
        time.sleep(0.5)  # be gentle with rate limits

    # Verify all lines
    for num, _ in LINES:
        p = LINES_DIR / f"line_{num:02d}.mp3"
        assert p.exists() and p.stat().st_size > 1000, f"Line {num} missing or empty"
    print("\n  All 7 lines verified.")

    # Build concat with silence gaps
    print("\n  Building voiceover.mp3...")
    sil_files = {}
    for gap_ms in set(GAPS_MS.values()):
        sil = AUDIO_DIR / f"_sil_{gap_ms}ms.mp3"
        silence_mp3(gap_ms, sil)
        sil_files[gap_ms] = sil

    concat_txt = AUDIO_DIR / "_concat_vo.txt"
    entries = []
    for num, _ in LINES:
        entries.append(str(LINES_DIR / f"line_{num:02d}.mp3"))
        entries.append(str(sil_files[GAPS_MS[num]]))

    with open(concat_txt, "w", encoding="utf-8") as f:
        for p in entries:
            f.write(f"file '{p}'\n")

    vo_out = AUDIO_DIR / "voiceover.mp3"
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0",
         "-i", str(concat_txt),
         "-c:a", "libmp3lame", "-b:a", "128k", str(vo_out)])

    dur = get_duration(vo_out)
    assert dur > 20, f"voiceover.mp3 only {dur:.1f}s — too short"
    print(f"\n  OK voiceover.mp3: {dur:.1f}s, {vo_out.stat().st_size//1024} KB")
    return dur


# ── STEP 2: Background Music ──────────────────────────────────────────────────
BG_URLS = [
    ("Thinking Music",       "https://freepd.com/music/Thinking%20Music.mp3"),
    ("Somewhere Sunny",      "https://freepd.com/music/Somewhere%20Sunny.mp3"),
    ("Digital Lemonade",     "https://freepd.com/music/Digital%20Lemonade.mp3"),
    ("Airport Lounge",       "https://freepd.com/music/Airport%20Lounge.mp3"),
    ("Ambient Meditation",   "https://freepd.com/music/Ambient%20Meditation.mp3"),
]

def step_bg():
    print("\n== STEP 2: Background Music ==")
    bg_out = AUDIO_DIR / "background.mp3"
    if bg_out.exists() and bg_out.stat().st_size > 50000:
        dur = get_duration(bg_out)
        if dur > 30:
            print(f"  OK background.mp3 already exists ({dur:.0f}s, {bg_out.stat().st_size//1024} KB)")
            return bg_out.name

    for name, url in BG_URLS:
        print(f"  Trying: {name}")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
            if len(data) < 50000:
                print(f"    Too small ({len(data)} bytes), skipping")
                continue
            bg_out.write_bytes(data)
            dur = get_duration(bg_out)
            if dur < 30:
                print(f"    Too short ({dur:.0f}s), skipping")
                continue
            print(f"    OK {name}: {dur:.0f}s, {bg_out.stat().st_size//1024} KB")
            return name
        except Exception as e:
            print(f"    FAIL: {e}")

    # Fallback: synthesize Am7 pad
    print("  All URLs failed — synthesizing piano pad...")
    total = 65.0
    freqs = [220.0, 261.6, 329.6, 392.0]
    n = len(freqs)
    src_labels = "".join(f"[s{i}]" for i in range(n))
    fc_parts = [f"sine=frequency={f}:sample_rate=44100:duration={total}[s{i}]"
                for i, f in enumerate(freqs)]
    fc_parts.append(f"{src_labels}amix=inputs={n}:duration=first[mixed]")
    fc_parts.append(
        f"[mixed]afade=in:st=0:d=3,afade=out:st={total-4:.1f}:d=4,"
        f"aecho=0.6:0.88:60|80:0.4|0.3,volume=1.6[aout]"
    )
    run(["ffmpeg", "-y", "-filter_complex", ";".join(fc_parts),
         "-map", "[aout]", "-c:a", "libmp3lame", "-b:a", "128k", str(bg_out)])
    print(f"  OK synthesized pad: {bg_out.stat().st_size//1024} KB")
    return "Synthesized Am7 Pad"


# ── STEP 3: Audio Mix ─────────────────────────────────────────────────────────
def step_mix(video_dur: float):
    print("\n== STEP 3: Audio Mix ==")
    vo  = AUDIO_DIR / "voiceover.mp3"
    bg  = AUDIO_DIR / "background.mp3"
    out = AUDIO_DIR / "final_audio.mp3"

    fade_out_start = video_dur - 4.0

    run([
        "ffmpeg", "-y",
        "-stream_loop", "-1", "-i", str(bg),
        "-i", str(vo),
        "-filter_complex", (
            f"[0:a]volume=0.08,"
            f"afade=t=in:st=0:d=3,"
            f"afade=t=out:st={fade_out_start:.3f}:d=4[music];"
            f"[1:a]volume=1.0,adelay=1000|1000[voice];"
            f"[music][voice]amix=inputs=2:duration=longest[out]"
        ),
        "-map", "[out]",
        "-c:a", "libmp3lame", "-b:a", "192k",
        "-t", str(video_dur + 1),
        str(out)
    ])
    print(f"  OK final_audio.mp3: {out.stat().st_size//1024} KB")


# ── STEP 4: Merge ─────────────────────────────────────────────────────────────
def step_merge():
    print("\n== STEP 4: Merge Video + Audio ==")
    video   = ROOT / "kdoc_reel_v2.mp4"
    audio   = AUDIO_DIR / "final_audio.mp3"
    out     = ROOT / "kdoc_reel_v2_final.mp4"

    run([
        "ffmpeg", "-y",
        "-i", str(video),
        "-i", str(audio),
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        "-map", "0:v:0", "-map", "1:a:0",
        "-shortest",
        str(out)
    ])
    print(f"  OK kdoc_reel_v2_final.mp4: {out.stat().st_size//1024} KB")


# ── STEP 5: Verify ────────────────────────────────────────────────────────────
def step_verify(bg_name):
    print("\n== STEP 5: Verify ==")
    out = ROOT / "kdoc_reel_v2_final.mp4"
    assert out.exists(), "Output file missing!"

    r = run(["ffprobe", "-v", "error",
             "-show_entries", "format=duration,size",
             "-show_entries", "stream=codec_type,codec_name",
             "-of", "json", str(out)], capture=True)
    info = json.loads(r.stdout)
    fmt  = info["format"]
    dur  = float(fmt["duration"])
    size = int(fmt["size"]) / 1e6

    codecs = {s["codec_type"]: s["codec_name"] for s in info.get("streams", [])}
    assert size > 2,   f"File too small: {size:.1f} MB"
    assert "video" in codecs, "No video track"
    assert "audio" in codecs, "No audio track"

    print()
    print("FERTIG")
    print(f"  kdoc_reel_v2_final.mp4")
    print(f"  Dauer  : {dur:.1f}s")
    print(f"  Groesse: {size:.1f} MB")
    print(f"  Video  : {codecs.get('video','?')}")
    print(f"  Audio  : {codecs.get('audio','?')}")
    print(f"  Stimme : {VOICE_NAME} ({VOICE_ID})")
    print(f"  Musik  : {bg_name}")
    print()


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    video_dur = get_duration(ROOT / "kdoc_reel_v2.mp4")
    print(f"Input video: kdoc_reel_v2.mp4  ({video_dur:.2f}s)")

    step_vo()
    bg_name = step_bg()
    step_mix(video_dur)
    step_merge()
    step_verify(bg_name)
