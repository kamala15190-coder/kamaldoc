"""
Audio pipeline v3 — slower, warmer female German voice + gentle piano BG.

Layout:
  lines/line_01.mp3 .. line_07.mp3  → individual VO files (ElevenLabs)
  voiceover.mp3                      → concatenated lines with silence gaps
  background.mp3                     → cinematic soft pad
  final_audio.mp3                    → BG 7% + VO 100% @1s offset

Output: kdoc_reel_v2_final.mp4
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
LINES = AUDIO / "lines"
AUDIO.mkdir(parents=True, exist_ok=True)
LINES.mkdir(parents=True, exist_ok=True)

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

# User priority list of preset voice IDs (publicly documented).
# The API key lacks voices_read permission, so we cannot dynamically search
# the voice library; we use these known IDs and fall back on failure.
VOICE_CANDIDATES: list[tuple[str, str]] = [
    ("Freya",     "jsCqWAovK2LkecY7zXl4"),  # user list #3 — expressive, clear, handles German well
    ("Elli",      "MF3mGyEYCl7XYWbV9V6O"),  # user list #2 — emotional, young
    ("Laura",     "FGY2WhTYpPnrIDTdsKH5"),  # user list #5 — young female
    ("Nicole",    "piTKgcLEGmPE4e6mEKli"),  # user list #6 — young female
    ("Domi",      "AZnzlk1XvdvUeBnXmlld"),  # user list #1 — stronger timbre
    # Non-priority fallbacks known to do German well
    ("Charlotte", "XB0fDUnXU5powFXDhCwa"),
    ("Lily",      "pFZP5JQG7iQjIQuC4Bku"),
    ("Matilda",   "XrExE9yKIg1WjnnlVkGX"),
]

# ----------------------------------------------------------------------------
# Script — 7 standalone lines with post-silence gaps in milliseconds
# Using phonetic "keydoc" so ElevenLabs doesn't spell it out.
# ----------------------------------------------------------------------------
SCRIPT: list[tuple[str, int]] = [
    ("Papierstapel war gestern.",                                                                                   1200),
    ("keydoc scannt, erkennt und archiviert deine Dokumente — vollautomatisch.",                                    1000),
    ("Der Befundassistent erklärt medizinische Befunde einfach und verständlich — in über fünfzig Sprachen.",       1000),
    ("Fristen für Behörden, Verträge und Rechnungen — keydoc erinnert dich rechtzeitig.",                          1000),
    ("Eingehende Briefe? keydoc antwortet für dich — per künstlicher Intelligenz, in Sekunden.",                   1000),
    ("Verbinde deine E-Mail-Konten mit keydoc. Eine Suche. Alle Quellen.",                                         1000),
    ("keydoc. Jetzt kostenlos im Google Play Store.",                                                               800),
]

VIDEO_DURATION = 50.0  # measured from kdoc_reel_v2.mp4
VO_START_OFFSET = 1.0  # seconds — music breathes for 1s before speech

VOICE_SETTINGS = {
    "stability": 0.75,          # higher = more consistent, less aggressive
    "similarity_boost": 0.70,
    "style": 0.05,              # nearly zero = pure natural voice
    "use_speaker_boost": False,
}


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    print(">>", " ".join(str(c) for c in cmd))
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def probe_duration(path: Path) -> float:
    r = run([
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(path),
    ])
    return float(r.stdout.strip())


def http_post_json(url: str, body: dict, headers: dict) -> bytes:
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={**headers, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()


def http_get(url: str, headers: dict | None = None) -> bytes:
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


# ---------------------------------------------------------------------------
# STEP 1 — voiceover
# ---------------------------------------------------------------------------
def eleven_tts(text: str, voice_id: str, out: Path) -> bool:
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128"
    body = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": VOICE_SETTINGS,
        "language_code": "de",  # hint — some models respect this
    }
    try:
        data = http_post_json(url, body, {"xi-api-key": ELEVEN, "Accept": "audio/mpeg"})
        out.write_bytes(data)
        return True
    except urllib.error.HTTPError as e:
        msg = e.read().decode(errors="replace")[:200] if hasattr(e, "read") else str(e)
        print(f"[VO] voice {voice_id} failed: HTTP {e.code} — {msg}")
        return False


def pick_voice() -> tuple[str, str]:
    """Return (name, voice_id) of the first voice that renders successfully."""
    test_text = SCRIPT[0][0]
    for name, vid in VOICE_CANDIDATES:
        probe_path = AUDIO / "_voice_probe.mp3"
        if eleven_tts(test_text, vid, probe_path):
            probe_path.unlink(missing_ok=True)
            print(f"[VO] selected voice: {name} ({vid})")
            return name, vid
        # language_code might not be accepted by some voices — retry without
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128"
        body = {"text": test_text, "model_id": "eleven_multilingual_v2", "voice_settings": VOICE_SETTINGS}
        try:
            data = http_post_json(url, body, {"xi-api-key": ELEVEN, "Accept": "audio/mpeg"})
            probe_path.write_bytes(data)
            probe_path.unlink()
            print(f"[VO] selected voice (no lang hint): {name} ({vid})")
            return name, vid
        except Exception as e:
            print(f"[VO] {name} unusable: {e}")
    raise RuntimeError("No voice could render the probe line")


def render_lines(voice_id: str) -> list[Path]:
    rendered: list[Path] = []
    for i, (text, _) in enumerate(SCRIPT, start=1):
        p = LINES / f"line_{i:02d}.mp3"
        # retry with/without language_code
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128"
        body = {"text": text, "model_id": "eleven_multilingual_v2", "voice_settings": VOICE_SETTINGS}
        try:
            body_with_lang = {**body, "language_code": "de"}
            data = http_post_json(url, body_with_lang, {"xi-api-key": ELEVEN, "Accept": "audio/mpeg"})
        except urllib.error.HTTPError:
            data = http_post_json(url, body, {"xi-api-key": ELEVEN, "Accept": "audio/mpeg"})
        p.write_bytes(data)
        print(f"[VO] rendered line {i:02d} ({len(data)/1024:.0f} KB): {text[:60]}…")
        rendered.append(p)
    return rendered


def concat_lines_with_gaps(line_paths: list[Path], target_max: float) -> float:
    """Concat with silence gaps. If total exceeds target, shrink gaps proportionally.
    Returns final duration in seconds.
    """
    # Start with a leading silence of VO_START_OFFSET, then each line + its gap.
    silence_ms: list[int] = [int(VO_START_OFFSET * 1000)]
    line_durs_ms: list[int] = []
    for i, p in enumerate(line_paths):
        dur = probe_duration(p)
        line_durs_ms.append(int(dur * 1000))
        if i < len(line_paths) - 1:
            silence_ms.append(SCRIPT[i][1])
    # Final trailing silence = last line's gap, acts as tail padding
    trailing_ms = SCRIPT[-1][1]

    total_ms = sum(silence_ms) + sum(line_durs_ms) + trailing_ms
    target_ms = int(target_max * 1000)
    if total_ms > target_ms:
        overflow = total_ms - target_ms
        # Shrink interior gaps proportionally (skip leading + trailing for flow)
        interior_sum = sum(silence_ms[1:])
        if interior_sum > 0:
            scale = max(0.0, (interior_sum - overflow) / interior_sum)
            for i in range(1, len(silence_ms)):
                silence_ms[i] = int(silence_ms[i] * scale)
            trailing_ms = int(trailing_ms * scale)
            print(f"[VO] shrank gaps by factor {scale:.2f} (overflow was {overflow} ms)")

    # Build ffmpeg filter: silence → line1 → silence → line2 → … → trailing silence
    filters: list[str] = []
    inputs: list[str] = []
    # We use anullsrc as silence source via -f lavfi -t <dur>
    # Sequence segments by sequential numeric index
    idx = 0
    seg_labels: list[str] = []

    # Leading silence
    inputs += ["-f", "lavfi", "-t", f"{silence_ms[0]/1000:.3f}", "-i", "anullsrc=cl=mono:r=44100"]
    filters.append(f"[{idx}:a]aresample=44100,aformat=channel_layouts=mono[s{idx}]")
    seg_labels.append(f"[s{idx}]")
    idx += 1

    for li, p in enumerate(line_paths):
        inputs += ["-i", str(p)]
        filters.append(f"[{idx}:a]aresample=44100,aformat=channel_layouts=mono[s{idx}]")
        seg_labels.append(f"[s{idx}]")
        idx += 1
        # Between-line silence (not after last line — that's the trailing)
        if li < len(line_paths) - 1:
            gap_s = silence_ms[li + 1] / 1000
            inputs += ["-f", "lavfi", "-t", f"{gap_s:.3f}", "-i", "anullsrc=cl=mono:r=44100"]
            filters.append(f"[{idx}:a]aresample=44100,aformat=channel_layouts=mono[s{idx}]")
            seg_labels.append(f"[s{idx}]")
            idx += 1

    # Trailing silence
    inputs += ["-f", "lavfi", "-t", f"{trailing_ms/1000:.3f}", "-i", "anullsrc=cl=mono:r=44100"]
    filters.append(f"[{idx}:a]aresample=44100,aformat=channel_layouts=mono[s{idx}]")
    seg_labels.append(f"[s{idx}]")
    idx += 1

    concat_chain = "".join(seg_labels) + f"concat=n={idx}:v=0:a=1[out]"
    filters.append(concat_chain)

    run([
        "ffmpeg", "-y", *inputs,
        "-filter_complex", ";".join(filters),
        "-map", "[out]",
        "-c:a", "libmp3lame", "-b:a", "192k",
        str(VO),
    ])
    return probe_duration(VO)


def step_voiceover() -> tuple[str, float]:
    name, vid = pick_voice()
    lines = render_lines(vid)
    vo_dur = concat_lines_with_gaps(lines, target_max=VIDEO_DURATION)
    print(f"[VO] final voiceover duration: {vo_dur:.2f}s (budget {VIDEO_DURATION}s)")
    if vo_dur > VIDEO_DURATION + 0.2:
        raise RuntimeError(f"VO {vo_dur:.2f}s still exceeds video {VIDEO_DURATION}s after shrinking")
    return name, vo_dur


# ---------------------------------------------------------------------------
# STEP 2 — background (Pixabay or synth)
# ---------------------------------------------------------------------------
def pixabay_search(query: str, min_dur: int) -> dict | None:
    url = f"https://pixabay.com/api/audio/?key={PIXABAY}&q={urllib.parse.quote(query)}&safesearch=true"
    try:
        data = json.loads(http_get(url).decode())
        hits = [h for h in data.get("hits", []) if h.get("duration", 0) >= min_dur]
        hits.sort(key=lambda h: h.get("likes", 0), reverse=True)
        return hits[0] if hits else None
    except Exception as e:
        print(f"[BG] search '{query}' — {e}")
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


def synth_soft_piano(out: Path, duration: float) -> str:
    """Very soft cinematic pad — quieter than previous v3, mimics Apple-style score.
    Am7 → Fmaj7 → Cmaj9 → G with long release + multi-tap reverb.
    """
    chords = [
        # Am7 extended
        (110.00, 164.81, 220.00, 261.63, 392.00),
        # Fmaj7
        (87.31,  130.81, 174.61, 220.00, 329.63),
        # Cmaj9
        (130.81, 196.00, 261.63, 329.63, 587.33),
        # G maj
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
            "[0:a]volume=0.35,lowpass=f=280[bass];"
            "[1:a]volume=0.22[v1];"
            "[2:a]volume=0.20[v2];"
            "[3:a]volume=0.18[v3];"
            "[4:a]volume=0.12[v4];"
            "[bass][v1][v2][v3][v4]amix=inputs=5:normalize=0,"
            "afade=t=in:st=0:d=2.5,"
            f"afade=t=out:st={chord_dur - 3.0}:d=3.0",
            "-c:a", "pcm_s16le",
            str(p),
        ])
        tmp_parts.append(p)

    concat_inputs: list[str] = []
    for p in tmp_parts:
        concat_inputs += ["-i", str(p)]
    n = len(tmp_parts)
    filt = (
        "".join(f"[{i}:a]" for i in range(n))
        + f"concat=n={n}:v=0:a=1[seq];"
        "[seq]"
        "highpass=f=60,"
        "lowpass=f=2400,"
        "aecho=0.55:0.6:700|1400|2400:0.3|0.2|0.1,"
        "tremolo=f=0.12:d=0.05,"
        "volume=0.75"
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
    return "Synthesised Soft Piano Pad (Am7-Fmaj7-Cmaj9-G)"


def step_background() -> str:
    queries = [
        "soft cinematic piano emotional",
        "gentle orchestral inspiring calm",
        "warm ambient piano background",
        "cinematic soft emotional background",
    ]
    for q in queries:
        hit = pixabay_search(q, min_dur=45)
        if not hit:
            continue
        title = f"{hit.get('tags') or 'Pixabay'} by {hit.get('user', 'anon')}"
        print(f"[BG] query '{q}' → {title} ({hit.get('duration')}s, likes {hit.get('likes')})")
        if pixabay_download(hit, BG):
            return title
    print("[BG] Pixabay music API unavailable — synthesise cinematic pad")
    return synth_soft_piano(BG, duration=VIDEO_DURATION + 5)


# ---------------------------------------------------------------------------
# STEP 3 — mix
# ---------------------------------------------------------------------------
def step_mix() -> None:
    filters = [
        # BG at 7%, 3s fade-in, 4s fade-out
        f"[0:a]aloop=loop=-1:size=2e9,atrim=0:{VIDEO_DURATION},"
        f"volume=0.07,"
        f"afade=t=in:st=0:d=3,"
        f"afade=t=out:st={VIDEO_DURATION - 4}:d=4"
        "[bg]",
        # VO: already contains its own 1s leading silence in the concat; no extra offset
        f"[1:a]volume=1.0,apad,atrim=0:{VIDEO_DURATION}[vo]",
        "[bg][vo]amix=inputs=2:normalize=0:duration=first[mix]",
        f"[mix]atrim=0:{VIDEO_DURATION},"
        "aformat=channel_layouts=stereo,aresample=44100,"
        "alimiter=limit=0.97[out]",
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
# STEP 4 — merge video + audio
# ---------------------------------------------------------------------------
def step_merge() -> None:
    run([
        "ffmpeg", "-y",
        "-i", str(VIDEO_IN),
        "-i", str(FINAL_AUDIO),
        "-map", "0:v:0", "-map", "1:a:0",
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        str(VIDEO_OUT),
    ])


# ---------------------------------------------------------------------------
# STEP 5 — verify
# ---------------------------------------------------------------------------
def step_verify(voice_name: str, bg_title: str) -> None:
    assert VIDEO_OUT.exists(), "output file missing"
    size_mb = VIDEO_OUT.stat().st_size / (1024 * 1024)
    duration = probe_duration(VIDEO_OUT)
    r = run([
        "ffprobe", "-v", "error", "-select_streams", "a:0",
        "-show_entries", "stream=codec_name,channels,bit_rate",
        "-of", "default=nw=1:nokey=1",
        str(VIDEO_OUT),
    ])
    print("\n" + "=" * 70)
    print(f"[OK] Fertig - Datei: kdoc_reel_v2_final.mp4 | Dauer: {duration:.1f}s | "
          f"Groesse: {size_mb:.1f}MB | Stimme: {voice_name} | Musik: {bg_title}")
    print(f"     Audio: {' / '.join(r.stdout.strip().splitlines())}")
    print("=" * 70)


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------
def main() -> int:
    step = sys.argv[1] if len(sys.argv) > 1 else "all"

    voice_name = "Freya"  # default if stepping mix-only
    bg_title = "Synth Pad"

    if step in ("all", "vo"):
        print("### STEP 1 voiceover")
        voice_name, _ = step_voiceover()

    if step in ("all", "bg"):
        print("### STEP 2 background music")
        bg_title = step_background()

    if step in ("all", "mix"):
        print("### STEP 3 mix")
        step_mix()

    if step in ("all", "merge"):
        print("### STEP 4 merge")
        step_merge()

    if step in ("all", "qa"):
        print("### STEP 5 verify")
        step_verify(voice_name, bg_title)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
