"""
Audio pipeline for kdoc_reel_v2_final.mp4
- Step 1: ElevenLabs voiceover (7 timed German lines)
- Step 2: Pixabay background music
- Step 3: Pixabay SFX set (+ ffmpeg synth fallback)
- Step 4: ffmpeg mix
- Step 5: ffmpeg merge with video
"""
from __future__ import annotations
import os
import sys
import json
import subprocess
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path

ROOT = Path(r"D:\Projekte\KamalDoc")
VIDEOS = ROOT / "Videos"
AUDIO = VIDEOS / "audio"
SFX = AUDIO / "sfx"
SFX.mkdir(parents=True, exist_ok=True)

VIDEO_IN = VIDEOS / "kdoc_reel_v2.mp4"
VIDEO_OUT = VIDEOS / "kdoc_reel_v2_final.mp4"
VO = AUDIO / "voiceover.mp3"
BG = AUDIO / "background.mp3"
FINAL_AUDIO = AUDIO / "final_audio.mp3"

# Load env
ENV = {}
for line in (ROOT / "backend" / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.lstrip().startswith("#"):
        k, _, v = line.partition("=")
        ENV[k.strip()] = v.strip()

ELEVEN = ENV["ELEVENLABS_API_KEY"]
PIXABAY = ENV["PIXABAY_API_KEY"]

# ---------------------------------------------------------------------------
# VO script — (timestamp_seconds, german_line)
# ---------------------------------------------------------------------------
VO_LINES = [
    (0.5,  "Papierstapel war gestern."),
    (4.2,  "kdoc scannt, erkennt und archiviert deine Dokumente — vollautomatisch."),
    (9.2,  "Der Befundassistent erklärt medizinische Befunde einfach und verständlich — in über fünfzig Sprachen."),
    (15.2, "Fristen für Behörden, Verträge und Rechnungen — kdoc erinnert dich automatisch."),
    (20.2, "Eingehende Briefe? kdoc antwortet für dich — per KI, in Sekunden."),
    (26.2, "Verbinde deine E-Mail-Konten. Eine Suche. Alle Quellen."),
    (36.5, "kdoc. Jetzt kostenlos im Google Play Store."),
]
TOTAL_DURATION = 50.0  # seconds — matches kdoc_reel_v2.mp4

SCENE_TRANSITIONS = [4.0, 9.0, 15.0, 20.0, 26.0, 35.0]
SFX_CUES = {
    "sfx_whoosh":       [(t, 0.60) for t in SCENE_TRANSITIONS],
    "sfx_scan":         [(5.0, 0.50)],
    "sfx_heartbeat":    [(10.0, 0.45)],
    "sfx_notification": [(16.0, 0.50)],
    "sfx_typewriter":   [(22.0, 0.45)],
    "sfx_connect":      [(28.0, 0.55)],
    "sfx_rise":         [(33.0, 0.55)],
}


def run(cmd: list[str], *, check: bool = True) -> subprocess.CompletedProcess:
    print(">>", " ".join(str(c) for c in cmd))
    return subprocess.run(cmd, check=check, capture_output=True, text=True)


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
# STEP 1: ElevenLabs voiceover
# ---------------------------------------------------------------------------
def eleven_pick_voice() -> str:
    """Pick 'Daniel' if available, otherwise fall back to first German male voice."""
    known_daniel = "onwK4e9ZLuTAKqWW03F9"  # ElevenLabs public preset "Daniel"
    try:
        data = json.loads(http_get("https://api.elevenlabs.io/v1/voices", {"xi-api-key": ELEVEN}).decode())
        for v in data.get("voices", []):
            if v.get("name", "").lower() == "daniel":
                print(f"[VO] Daniel found in account voices: {v['voice_id']}")
                return v["voice_id"]
    except Exception as e:
        print(f"[VO] voices endpoint inaccessible ({e}) — using public Daniel preset")
    print(f"[VO] using known Daniel preset {known_daniel}")
    return known_daniel


def eleven_tts(text: str, voice_id: str, out: Path) -> None:
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128"
    body = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.4,
            "similarity_boost": 0.85,
            "style": 0.3,
            "use_speaker_boost": True,
        },
    }
    data = http_post_json(url, body, {"xi-api-key": ELEVEN, "Accept": "audio/mpeg"})
    out.write_bytes(data)


def build_voiceover(voice_id: str) -> None:
    """Render each line + assemble a 50s track with silence pads."""
    segments_dir = AUDIO / "_vo_parts"
    segments_dir.mkdir(exist_ok=True)

    # 1. render individual segments
    parts: list[tuple[float, Path, float]] = []  # (start_time, path, duration)
    for i, (ts, text) in enumerate(VO_LINES):
        p = segments_dir / f"line_{i:02d}.mp3"
        if not p.exists():
            print(f"[VO] render line {i} @{ts}s: {text[:60]}…")
            eleven_tts(text, voice_id, p)
        # probe duration
        r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                 "-of", "default=noprint_wrappers=1:nokey=1", str(p)])
        dur = float(r.stdout.strip())
        parts.append((ts, p, dur))

    # 2. build an ffmpeg filter graph to sequence them on a single track
    #    use adelay per segment, then amix with sum
    inputs: list[str] = []
    filters: list[str] = []
    for i, (start, path, dur) in enumerate(parts):
        inputs += ["-i", str(path)]
        delay_ms = int(start * 1000)
        filters.append(f"[{i}:a]adelay={delay_ms}|{delay_ms},apad,atrim=0:{TOTAL_DURATION}[a{i}]")
    mix_inputs = "".join(f"[a{i}]" for i in range(len(parts)))
    filters.append(f"{mix_inputs}amix=inputs={len(parts)}:normalize=0:duration=first[mix]")
    filters.append(f"[mix]atrim=0:{TOTAL_DURATION},aresample=44100[out]")

    run([
        "ffmpeg", "-y", *inputs,
        "-filter_complex", ";".join(filters),
        "-map", "[out]", "-c:a", "libmp3lame", "-b:a", "192k",
        str(VO)
    ])


# ---------------------------------------------------------------------------
# STEP 2: Pixabay background music
# ---------------------------------------------------------------------------
def pixabay_search_audio(query: str, min_duration: int = 40) -> dict | None:
    url = f"https://pixabay.com/api/?key={PIXABAY}&q={urllib.parse.quote(query)}"
    try:
        data = json.loads(http_get(url).decode())
    except urllib.error.HTTPError as e:
        print(f"[PIXABAY] image search failed: {e}")

    # Music endpoint — different. Pixabay music API uses a distinct host.
    music_url = f"https://pixabay.com/api/audio/?key={PIXABAY}&q={urllib.parse.quote(query)}&safesearch=true"
    try:
        data = json.loads(http_get(music_url).decode())
        hits = [h for h in data.get("hits", []) if h.get("duration", 0) >= min_duration]
        hits.sort(key=lambda h: h.get("likes", 0), reverse=True)
        return hits[0] if hits else None
    except Exception as e:
        print(f"[PIXABAY] audio search '{query}' failed: {e}")
        return None


def pixabay_download(hit: dict, out: Path) -> None:
    """Pixabay returns the audio file path in `audio` or a signed CDN URL in the JSON."""
    url = hit.get("audio") or hit.get("url") or hit.get("previewURL")
    if not url:
        # pixabay may require constructing download URL
        raise RuntimeError(f"Could not find download URL in hit: {hit}")
    print(f"[PIXABAY] download {url} → {out.name}")
    data = http_get(url, {"User-Agent": "Mozilla/5.0 kdoc-pipeline"})
    out.write_bytes(data)


def fetch_background() -> None:
    for query in ["cinematic corporate epic ambient", "epic technology ambient", "cinematic corporate", "epic ambient"]:
        hit = pixabay_search_audio(query, min_duration=40)
        if hit:
            print(f"[BG] using hit: {hit.get('user')} · {hit.get('duration')}s · likes {hit.get('likes')}")
            try:
                pixabay_download(hit, BG)
                return
            except Exception as e:
                print(f"[BG] download failed: {e}")
                continue
    # Fallback: synthesize a calm drone
    print("[BG] fallback — synthesize ambient drone")
    synth_drone(BG, duration=TOTAL_DURATION + 5)


def synth_drone(out: Path, duration: float) -> None:
    """Cinematic ambient pad: Am → F → C → G progression, each chord ~12s.

    Chord voicing (Hz): 3-note triad + sub bass fifth. Triangle-wave-like
    fundamentals via sine-sum approximation. Slow LFO tremolo + long reverb
    give it a floating cinematic feel suitable for 8% ducked volume.
    """
    # 4 chords × ~12.5s = 50s+
    chords = [
        # Am: A2, A3, C4, E4
        (110.00, 220.00, 261.63, 329.63),
        # F:  F2, A3, C4, F4
        (87.31,  220.00, 261.63, 349.23),
        # C:  C3, E4, G4, C5
        (130.81, 329.63, 392.00, 523.25),
        # G:  G2, B3, D4, G4
        (98.00,  246.94, 293.66, 392.00),
    ]
    chord_dur = (duration + 1) / len(chords)

    # Build each chord clip
    tmp_chords = []
    for i, (f1, f2, f3, f4) in enumerate(chords):
        cpath = out.parent / f"_chord_{i}.wav"
        run([
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", f"sine=frequency={f1}:duration={chord_dur}",
            "-f", "lavfi", "-i", f"sine=frequency={f2}:duration={chord_dur}",
            "-f", "lavfi", "-i", f"sine=frequency={f3}:duration={chord_dur}",
            "-f", "lavfi", "-i", f"sine=frequency={f4}:duration={chord_dur}",
            "-filter_complex",
            "[0:a]volume=0.40[b];"
            "[1:a]volume=0.30[m1];"
            "[2:a]volume=0.28[m2];"
            "[3:a]volume=0.22[m3];"
            "[b][m1][m2][m3]amix=inputs=4:normalize=0",
            "-c:a", "pcm_s16le",
            str(cpath)
        ])
        tmp_chords.append(cpath)

    # Concat chords; add master LFO tremolo + low-pass + faux reverb
    concat_args: list[str] = []
    for cp in tmp_chords:
        concat_args += ["-i", str(cp)]
    n = len(tmp_chords)
    concat_filter = (
        "".join(f"[{i}:a]" for i in range(n)) +
        f"concat=n={n}:v=0:a=1[chain];"
        "[chain]"
        "tremolo=f=0.25:d=0.10,"
        "lowpass=f=2200,"
        "highpass=f=40,"
        "aecho=0.55:0.55:400|780|1200:0.35|0.25|0.15,"
        "volume=0.85"
        "[out]"
    )
    run([
        "ffmpeg", "-y", *concat_args,
        "-filter_complex", concat_filter,
        "-map", "[out]",
        "-c:a", "libmp3lame", "-b:a", "192k",
        str(out)
    ])
    for cp in tmp_chords:
        try: cp.unlink()
        except Exception: pass


# ---------------------------------------------------------------------------
# STEP 3: SFX via Pixabay (with ffmpeg synth fallback)
# ---------------------------------------------------------------------------
SFX_QUERIES = {
    "sfx_whoosh":       "whoosh transition",
    "sfx_scan":         "scan beep digital",
    "sfx_heartbeat":    "heartbeat soft",
    "sfx_notification": "notification chime soft",
    "sfx_typewriter":   "keyboard click",
    "sfx_connect":      "electric connect spark",
    "sfx_rise":         "riser cinematic",
}


def fetch_sfx(name: str, query: str) -> Path:
    target = SFX / f"{name}.mp3"
    if target.exists() and target.stat().st_size > 1024:
        return target
    hit = pixabay_search_audio(query, min_duration=0)
    if hit and (hit.get("audio") or hit.get("url")):
        try:
            pixabay_download(hit, target)
            return target
        except Exception as e:
            print(f"[SFX] {name} download failed: {e}")
    print(f"[SFX] synth fallback for {name}")
    synth_sfx(name, target)
    return target


def synth_sfx(name: str, out: Path) -> None:
    """Generate a short synthetic sound effect with ffmpeg lavfi filters."""
    if name == "sfx_whoosh":
        # White noise with fast band-pass sweep
        run(["ffmpeg", "-y",
             "-f", "lavfi", "-i", "anoisesrc=d=0.35:c=pink:a=0.5",
             "-af", "highpass=f=200,lowpass=f=3000,afade=t=in:st=0:d=0.05,afade=t=out:st=0.2:d=0.15",
             "-c:a", "libmp3lame", "-b:a", "192k", str(out)])
    elif name == "sfx_scan":
        # Quick rising beep
        run(["ffmpeg", "-y",
             "-f", "lavfi", "-i", "sine=frequency=1200:duration=0.18",
             "-f", "lavfi", "-i", "sine=frequency=1800:duration=0.18",
             "-filter_complex",
             "[0:a][1:a]concat=n=2:v=0:a=1,afade=t=in:st=0:d=0.02,afade=t=out:st=0.3:d=0.06",
             "-c:a", "libmp3lame", "-b:a", "192k", str(out)])
    elif name == "sfx_heartbeat":
        run(["ffmpeg", "-y",
             "-f", "lavfi", "-i", "sine=frequency=70:duration=0.12",
             "-f", "lavfi", "-i", "anullsrc=d=0.12",
             "-f", "lavfi", "-i", "sine=frequency=55:duration=0.18",
             "-filter_complex",
             "[0:a]volume=0.9[a0];[2:a]volume=0.7[a2];[a0][1:a][a2]concat=n=3:v=0:a=1,afade=t=out:st=0.3:d=0.12",
             "-c:a", "libmp3lame", "-b:a", "192k", str(out)])
    elif name == "sfx_notification":
        run(["ffmpeg", "-y",
             "-f", "lavfi", "-i", "sine=frequency=880:duration=0.15",
             "-f", "lavfi", "-i", "sine=frequency=1320:duration=0.25",
             "-filter_complex",
             "[0:a][1:a]concat=n=2:v=0:a=1,afade=t=out:st=0.3:d=0.1",
             "-c:a", "libmp3lame", "-b:a", "192k", str(out)])
    elif name == "sfx_typewriter":
        run(["ffmpeg", "-y",
             "-f", "lavfi", "-i", "anoisesrc=d=0.03:c=white:a=0.8",
             "-f", "lavfi", "-i", "anullsrc=d=0.08",
             "-f", "lavfi", "-i", "anoisesrc=d=0.03:c=white:a=0.8",
             "-filter_complex",
             "[0:a]highpass=f=500,lowpass=f=5000[a0];"
             "[2:a]highpass=f=500,lowpass=f=5000[a2];"
             "[a0][1:a][a2]concat=n=3:v=0:a=1",
             "-c:a", "libmp3lame", "-b:a", "192k", str(out)])
    elif name == "sfx_connect":
        run(["ffmpeg", "-y",
             "-f", "lavfi", "-i", "sine=frequency=440:duration=0.2",
             "-f", "lavfi", "-i", "sine=frequency=660:duration=0.25",
             "-filter_complex",
             "[0:a][1:a]concat=n=2:v=0:a=1,"
             "afade=t=in:st=0:d=0.03,afade=t=out:st=0.35:d=0.08,"
             "aecho=0.5:0.6:60:0.4",
             "-c:a", "libmp3lame", "-b:a", "192k", str(out)])
    elif name == "sfx_rise":
        run(["ffmpeg", "-y",
             "-f", "lavfi", "-i", "sine=frequency=100:duration=2",
             "-af",
             "volume=0.8,"
             "afade=t=in:st=0:d=1.9,"
             "asetrate=44100*1.0,"
             "atempo=1.0",
             "-c:a", "libmp3lame", "-b:a", "192k", str(out)])
    else:
        raise RuntimeError(f"Unknown sfx name {name}")


# ---------------------------------------------------------------------------
# STEP 4: Mix
# ---------------------------------------------------------------------------
def mix_audio() -> None:
    """Mix voiceover + background music + SFX cues into final_audio.mp3."""
    inputs: list[str] = []
    filters: list[str] = []

    # 0: background, 1: voiceover, 2+: sfx clips per cue
    inputs += ["-i", str(BG)]
    inputs += ["-i", str(VO)]

    # Background music: 8% vol, fade-in 1.5s, fade-out over last 3s, loop-pad
    filters.append(
        f"[0:a]aloop=loop=-1:size=2e9,"
        f"atrim=0:{TOTAL_DURATION},"
        f"volume=0.08,"
        f"afade=t=in:st=0:d=1.5,"
        f"afade=t=out:st={TOTAL_DURATION - 3}:d=3"
        f"[bg]"
    )
    # Voiceover already 50s: just normalise at 100%
    filters.append(f"[1:a]volume=1.0,atrim=0:{TOTAL_DURATION}[vo]")

    sfx_labels: list[str] = []
    idx = 2
    for name, cues in SFX_CUES.items():
        path = SFX / f"{name}.mp3"
        for j, (start, vol) in enumerate(cues):
            inputs += ["-i", str(path)]
            delay_ms = int(start * 1000)
            lbl = f"sfx_{name}_{j}"
            filters.append(
                f"[{idx}:a]volume={vol},adelay={delay_ms}|{delay_ms},"
                f"apad,atrim=0:{TOTAL_DURATION}[{lbl}]"
            )
            sfx_labels.append(f"[{lbl}]")
            idx += 1

    mix_inputs = "[bg][vo]" + "".join(sfx_labels)
    count = 2 + len(sfx_labels)
    filters.append(f"{mix_inputs}amix=inputs={count}:normalize=0:duration=first[mix]")
    filters.append(
        f"[mix]atrim=0:{TOTAL_DURATION},"
        "aformat=channel_layouts=stereo,"
        "aresample=44100,"
        "alimiter=limit=0.95[out]"
    )

    run([
        "ffmpeg", "-y", *inputs,
        "-filter_complex", ";".join(filters),
        "-map", "[out]", "-ac", "2",
        "-c:a", "libmp3lame", "-b:a", "192k",
        str(FINAL_AUDIO)
    ])


# ---------------------------------------------------------------------------
# STEP 5: merge video + audio
# ---------------------------------------------------------------------------
def merge_av() -> None:
    run([
        "ffmpeg", "-y",
        "-i", str(VIDEO_IN),
        "-i", str(FINAL_AUDIO),
        "-map", "0:v:0", "-map", "1:a:0",
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        str(VIDEO_OUT)
    ])


# ---------------------------------------------------------------------------
# STEP 6: QA
# ---------------------------------------------------------------------------
def qa() -> None:
    if not VIDEO_OUT.exists():
        raise RuntimeError("final video not produced")
    size_mb = VIDEO_OUT.stat().st_size / (1024 * 1024)
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(VIDEO_OUT)])
    duration = float(r.stdout.strip())
    r2 = run(["ffprobe", "-v", "error", "-select_streams", "a:0",
              "-show_entries", "stream=codec_name,channels,sample_rate,bit_rate",
              "-of", "default=nw=1", str(VIDEO_OUT)])
    print("\n" + "=" * 60)
    # ASCII-only print for Windows cp1252 console
    print(f"[OK] kdoc_reel_v2_final.mp4 - Duration: {duration:.1f}s - Size: {size_mb:.1f}MB - Audio: OK")
    print(r2.stdout.strip())
    print("=" * 60)


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------
def main() -> int:
    step = sys.argv[1] if len(sys.argv) > 1 else "all"

    if step in ("all", "vo"):
        print("\n### STEP 1: voiceover")
        vid = eleven_pick_voice()
        build_voiceover(vid)

    if step in ("all", "bg"):
        print("\n### STEP 2: background music")
        if not BG.exists() or BG.stat().st_size < 2048:
            fetch_background()

    if step in ("all", "sfx"):
        print("\n### STEP 3: sfx")
        for name, q in SFX_QUERIES.items():
            fetch_sfx(name, q)

    if step in ("all", "mix"):
        print("\n### STEP 4: mix")
        mix_audio()

    if step in ("all", "merge"):
        print("\n### STEP 5: merge A/V")
        merge_av()

    if step in ("all", "qa"):
        print("\n### STEP 6: QA")
        qa()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
