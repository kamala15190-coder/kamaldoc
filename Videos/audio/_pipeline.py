"""
Audio pipeline v2 — warm female VO, cinematic soft piano bg, NO sfx.
Output: D:\\Projekte\\KamalDoc\\Videos\\kdoc_reel_v2_final.mp4
"""
from __future__ import annotations
import json
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(r"D:\Projekte\KamalDoc")
VIDEOS = ROOT / "Videos"
AUDIO = VIDEOS / "audio"
SFX = AUDIO / "sfx"  # kept empty per spec, folder may linger

AUDIO.mkdir(parents=True, exist_ok=True)
SFX.mkdir(parents=True, exist_ok=True)

VIDEO_IN = VIDEOS / "kdoc_reel_v2.mp4"
VIDEO_OUT = VIDEOS / "kdoc_reel_v2_final.mp4"
VO = AUDIO / "voiceover.mp3"
BG = AUDIO / "background.mp3"
FINAL_AUDIO = AUDIO / "final_audio.mp3"

# Env
ENV: dict[str, str] = {}
for line in (ROOT / "backend" / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.lstrip().startswith("#"):
        k, _, v = line.partition("=")
        ENV[k.strip()] = v.strip()
ELEVEN = ENV["ELEVENLABS_API_KEY"]
PIXABAY = ENV["PIXABAY_API_KEY"]

# ElevenLabs public preset voice IDs (warm female German-capable).
FEMALE_VOICES: list[tuple[str, str]] = [
    ("Sarah",     "EXAVITQu4vr4xnSDxMaL"),
    ("Charlotte", "XB0fDUnXU5powFXDhCwa"),
    ("Matilda",   "XrExE9yKIg1WjnnlVkGX"),
    # Bella – legacy preset; these IDs rotate. Try both historical values.
    ("Bella v1",  "EXAVITQu4vr4xnSDxMaL"),
    ("Bella v2",  "pMsXgVXv3BLzUgSXRplE"),
]

# VO script — German, "keydoc" phonetic, SSML <break> tags.
VO_LINES: list[tuple[float, str]] = [
    (0.3,  'Papierstapel war gestern.'),
    (4.0,  'keydoc scannt, erkennt und archiviert deine Dokumente <break time="300ms"/> vollautomatisch.'),
    (9.0,  'Der Befundassistent erklärt medizinische Befunde <break time="300ms"/> einfach und verständlich. <break time="400ms"/> In über fünfzig Sprachen.'),
    (15.0, 'Fristen für Behörden, Verträge und Rechnungen. <break time="400ms"/> keydoc erinnert dich rechtzeitig.'),
    (20.0, 'Eingehende Briefe? <break time="400ms"/> keydoc antwortet für dich. <break time="300ms"/> Per KI <break time="200ms"/> in Sekunden.'),
    (26.0, 'Verbinde deine E-Mail-Konten. <break time="400ms"/> Eine Suche. <break time="300ms"/> Alle Quellen.'),
    (35.6, '<break time="600ms"/>keydoc. <break time="400ms"/> Jetzt kostenlos im Google Play Store.'),
]
TOTAL_DURATION = 50.0

VOICE_SETTINGS = {
    "stability": 0.55,
    "similarity_boost": 0.80,
    "style": 0.20,
    "use_speaker_boost": True,
}


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    print(">>", " ".join(str(c) for c in cmd))
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def http_get(url: str, headers: dict | None = None) -> bytes:
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def http_post_json(url: str, body: dict, headers: dict) -> bytes:
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={**headers, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()


# ---------------------------------------------------------------------------
# STEP 1 — ElevenLabs female voiceover
# ---------------------------------------------------------------------------
def try_eleven_voices() -> list[tuple[str, str]]:
    """Try the API first; fall back to preset list."""
    try:
        data = json.loads(http_get("https://api.elevenlabs.io/v1/voices", {"xi-api-key": ELEVEN}).decode())
        lookup = {v.get("name", "").lower(): v["voice_id"] for v in data.get("voices", [])}
        ordered: list[tuple[str, str]] = []
        for name in ("Sarah", "Charlotte", "Matilda", "Bella"):
            vid = lookup.get(name.lower())
            if vid:
                ordered.append((name, vid))
        if ordered:
            print(f"[VO] account has: {[n for n, _ in ordered]}")
            return ordered
    except Exception as e:
        print(f"[VO] /voices unavailable ({e}) — using public presets")
    return FEMALE_VOICES


def eleven_tts(text: str, voice_id: str, out: Path) -> bool:
    """Attempt TTS; return True on success."""
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128"
    body = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": VOICE_SETTINGS,
    }
    try:
        data = http_post_json(url, body, {"xi-api-key": ELEVEN, "Accept": "audio/mpeg"})
        out.write_bytes(data)
        return True
    except urllib.error.HTTPError as e:
        msg = e.read().decode(errors="replace")[:200] if hasattr(e, "read") else str(e)
        print(f"[VO] voice {voice_id} failed: HTTP {e.code} — {msg}")
        return False


def pick_and_render_vo() -> None:
    voices = try_eleven_voices()

    # Pick the first voice that successfully renders the first line.
    test_line = VO_LINES[0][1]
    chosen_name, chosen_id = "", ""
    for name, vid in voices:
        probe = AUDIO / "_vo_probe.mp3"
        if eleven_tts(test_line, vid, probe):
            chosen_name, chosen_id = name, vid
            probe.unlink(missing_ok=True)
            print(f"[VO] using {name} ({vid})")
            break
    if not chosen_id:
        raise RuntimeError("All voice presets failed")

    parts_dir = AUDIO / "_vo_parts"
    parts_dir.mkdir(exist_ok=True)

    parts: list[tuple[float, Path]] = []
    for i, (start, text) in enumerate(VO_LINES):
        p = parts_dir / f"line_{i:02d}.mp3"
        ok = eleven_tts(text, chosen_id, p)
        if not ok:
            raise RuntimeError(f"line {i} render failed")
        parts.append((start, p))

    # Assemble 50-second track with adelay + amix
    inputs: list[str] = []
    filters: list[str] = []
    for i, (start, path) in enumerate(parts):
        inputs += ["-i", str(path)]
        delay_ms = int(start * 1000)
        filters.append(
            f"[{i}:a]adelay={delay_ms}|{delay_ms},apad,atrim=0:{TOTAL_DURATION}[a{i}]"
        )
    mix_chain = "".join(f"[a{i}]" for i in range(len(parts)))
    filters.append(f"{mix_chain}amix=inputs={len(parts)}:normalize=0:duration=first[mix]")
    # Slight atempo=0.96 slows speech ~4% for a calmer, warmer cadence
    filters.append(
        f"[mix]atrim=0:{TOTAL_DURATION},atempo=0.96,"
        "aformat=channel_layouts=mono,aresample=44100[out]"
    )
    run([
        "ffmpeg", "-y", *inputs,
        "-filter_complex", ";".join(filters),
        "-map", "[out]",
        "-c:a", "libmp3lame", "-b:a", "192k",
        str(VO),
    ])
    print(f"[VO] done — voice: {chosen_name}")


# ---------------------------------------------------------------------------
# STEP 2 — Pixabay (or synth fallback) cinematic piano pad
# ---------------------------------------------------------------------------
def pixabay_search(query: str, min_dur: int) -> dict | None:
    url = f"https://pixabay.com/api/audio/?key={PIXABAY}&q={urllib.parse.quote(query)}&safesearch=true"
    try:
        data = json.loads(http_get(url).decode())
        hits = [h for h in data.get("hits", []) if h.get("duration", 0) >= min_dur]
        hits.sort(key=lambda h: h.get("likes", 0), reverse=True)
        return hits[0] if hits else None
    except Exception as e:
        print(f"[BG] '{query}' — {e}")
        return None


def pixabay_download(hit: dict, out: Path) -> bool:
    url = hit.get("audio") or hit.get("url") or hit.get("previewURL")
    if not url:
        return False
    try:
        data = http_get(url, {"User-Agent": "Mozilla/5.0 kdoc-pipeline"})
        out.write_bytes(data)
        print(f"[BG] downloaded {len(data)/1024:.0f} KB")
        return True
    except Exception as e:
        print(f"[BG] dl failed: {e}")
        return False


def synth_piano_pad(out: Path, duration: float) -> None:
    """Soft piano-pad score — Am7 → Fmaj7 → Cmaj9 → G progression with long
    release, gentle arpeggio, shimmer reverb. Warm and emotional, Apple-ad-tier.
    """
    # Four chords, each ~13s, extended voicings (maj7 / add9) for that
    # cinematic-pop sound.  Frequencies correspond to (bass, ch1, ch2, ch3, ch4).
    chords = [
        # Am7  : A2, E3, A3, C4, G4
        (110.00, 164.81, 220.00, 261.63, 392.00),
        # Fmaj7: F2, C3, F3, A3, E4
        (87.31,  130.81, 174.61, 220.00, 329.63),
        # Cmaj9: C3, G3, C4, E4, D5
        (130.81, 196.00, 261.63, 329.63, 587.33),
        # G    : G2, D3, G3, B3, D4
        (98.00,  146.83, 196.00, 246.94, 293.66),
    ]
    chord_dur = duration / len(chords)
    tmp_parts: list[Path] = []

    for i, (f1, f2, f3, f4, f5) in enumerate(chords):
        p = AUDIO / f"_pad_{i}.wav"
        run([
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", f"sine=frequency={f1}:duration={chord_dur}",
            "-f", "lavfi", "-i", f"sine=frequency={f2}:duration={chord_dur}",
            "-f", "lavfi", "-i", f"sine=frequency={f3}:duration={chord_dur}",
            "-f", "lavfi", "-i", f"sine=frequency={f4}:duration={chord_dur}",
            "-f", "lavfi", "-i", f"sine=frequency={f5}:duration={chord_dur}",
            "-filter_complex",
            "[0:a]volume=0.40,lowpass=f=320[bass];"
            "[1:a]volume=0.28[v1];"
            "[2:a]volume=0.24[v2];"
            "[3:a]volume=0.22[v3];"
            "[4:a]volume=0.18[v4];"
            "[bass][v1][v2][v3][v4]amix=inputs=5:normalize=0,"
            # Slow attack/release per chord so they overlap smoothly
            "afade=t=in:st=0:d=2.0,"
            f"afade=t=out:st={chord_dur - 2.5}:d=2.5",
            "-c:a", "pcm_s16le",
            str(p),
        ])
        tmp_parts.append(p)

    # Concat with small crossfade via acrossfade would need pairs; we just overlap via concat + reverb
    concat_inputs: list[str] = []
    for p in tmp_parts:
        concat_inputs += ["-i", str(p)]
    n = len(tmp_parts)
    filt = (
        "".join(f"[{i}:a]" for i in range(n))
        + f"concat=n={n}:v=0:a=1[seq];"
        "[seq]"
        "highpass=f=50,"
        "lowpass=f=2600,"
        # Soft tape-like saturation + shimmer reverb
        "aecho=0.55:0.55:600|1200|2200:0.35|0.25|0.15,"
        # Very gentle tremolo for breathing
        "tremolo=f=0.15:d=0.06,"
        "volume=0.90"
        "[out]"
    )
    run([
        "ffmpeg", "-y", *concat_inputs,
        "-filter_complex", filt,
        "-map", "[out]",
        "-c:a", "libmp3lame", "-b:a", "192k",
        str(out),
    ])
    for p in tmp_parts:
        try: p.unlink()
        except Exception: pass


def fetch_background() -> None:
    queries = [
        "epic cinematic soft piano ambient",
        "emotional cinematic background",
        "soft orchestral inspiring",
        "gentle epic motivational",
        "cinematic piano emotional",
        "inspirational ambient piano",
    ]
    for q in queries:
        hit = pixabay_search(q, min_dur=45)
        if not hit:
            continue
        print(f"[BG] '{q}' → {hit.get('user')} · {hit.get('duration')}s · likes {hit.get('likes')}")
        if pixabay_download(hit, BG):
            return
    print("[BG] Pixabay unavailable — synthesize cinematic pad")
    synth_piano_pad(BG, duration=TOTAL_DURATION + 5)


# ---------------------------------------------------------------------------
# STEP 4 — Mix (VO + BG only; no SFX)
# ---------------------------------------------------------------------------
def mix_final() -> None:
    filters = [
        # BG: loop in case shorter than 50s, trim to 50s, 9% vol, 2s fade-in, 3s fade-out
        f"[0:a]aloop=loop=-1:size=2e9,atrim=0:{TOTAL_DURATION},"
        f"volume=0.09,"
        f"afade=t=in:st=0:d=2,"
        f"afade=t=out:st={TOTAL_DURATION - 3}:d=3"
        "[bg]",
        # VO: pad to 50s at 100% (already offset inside VO file)
        f"[1:a]volume=1.0,apad,atrim=0:{TOTAL_DURATION}[vo]",
        # Mix, stereo, limit
        "[bg][vo]amix=inputs=2:normalize=0:duration=first[mix]",
        f"[mix]atrim=0:{TOTAL_DURATION},"
        "aformat=channel_layouts=stereo,aresample=44100,"
        "alimiter=limit=0.95[out]",
    ]
    run([
        "ffmpeg", "-y",
        "-i", str(BG),
        "-i", str(VO),
        "-filter_complex", ";".join(filters),
        "-map", "[out]",
        "-ac", "2",
        "-c:a", "libmp3lame", "-b:a", "192k",
        str(FINAL_AUDIO),
    ])


# ---------------------------------------------------------------------------
# STEP 5 — Merge video + audio
# ---------------------------------------------------------------------------
def merge_av() -> None:
    run([
        "ffmpeg", "-y",
        "-i", str(VIDEO_IN),
        "-i", str(FINAL_AUDIO),
        "-map", "0:v:0", "-map", "1:a:0",
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "256k",
        "-shortest",
        str(VIDEO_OUT),
    ])


# ---------------------------------------------------------------------------
# STEP 6 — Verify
# ---------------------------------------------------------------------------
def qa() -> None:
    assert VIDEO_OUT.exists(), "no output file"
    size_mb = VIDEO_OUT.stat().st_size / (1024 * 1024)
    r = run([
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(VIDEO_OUT),
    ])
    duration = float(r.stdout.strip())
    r2 = run([
        "ffprobe", "-v", "error", "-select_streams", "a:0",
        "-show_entries", "stream=codec_name,channels,sample_rate,bit_rate",
        "-of", "default=nw=1",
        str(VIDEO_OUT),
    ])
    print("\n" + "=" * 60)
    print(f"[OK] Final video ready - Duration: {duration:.1f}s - Size: {size_mb:.1f}MB")
    print(r2.stdout.strip())
    print("=" * 60)


def main() -> int:
    step = sys.argv[1] if len(sys.argv) > 1 else "all"
    if step in ("all", "vo"):
        print("### STEP 1: voiceover")
        pick_and_render_vo()
    if step in ("all", "bg"):
        print("### STEP 2: background")
        fetch_background()
    if step in ("all", "mix"):
        print("### STEP 4: mix")
        mix_final()
    if step in ("all", "merge"):
        print("### STEP 5: merge")
        merge_av()
    if step in ("all", "qa"):
        print("### STEP 6: QA")
        qa()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
