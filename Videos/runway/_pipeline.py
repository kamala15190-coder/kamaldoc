#!/usr/bin/env python3
"""
kdoc Runway Gen-4 Marketing Reel Pipeline
Generates 7 cinematic clips via Runway gen4_turbo, adds text overlays,
records ElevenLabs VO (stability=0.80), mixes background music, and
outputs kdoc_reel_runway_final.mp4.

Usage:
  py _pipeline.py all
  py _pipeline.py runway|overlay|concat|vo|bg|mix|merge|verify
"""

import os, sys, time, json, math, subprocess, struct, wave, io
from pathlib import Path
import urllib.request, urllib.error, urllib.parse

# -- Paths ---------------------------------------------------------------------
ROOT      = Path(__file__).parent
CLIPS_DIR = ROOT / "clips"
COMP_DIR  = ROOT / "composited"
AUDIO_DIR = ROOT / "audio"
FINAL_DIR = ROOT.parent

for d in [CLIPS_DIR, COMP_DIR, AUDIO_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# -- Load API Keys -------------------------------------------------------------
ENV_FILE = ROOT.parent.parent / "backend" / ".env"
keys = {}
for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, _, v = line.partition("=")
        keys[k.strip()] = v.strip()

RUNWAY_KEY  = keys["RUNWAY_API_KEY"]
ELEVEN_KEY  = keys["ELEVENLABS_API_KEY"]

# -- Scene Definitions ---------------------------------------------------------
SCENES = [
    {
        "id": "s1_hook",
        "seed": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=720&h=1280&fit=crop&q=80",
        "motion": "ultra-slow cinematic push-in, cluttered office desk at night, warm lamp glow, official letters and bills piling up, soft bokeh, 8K film grain, no text",
        "title": "BRIEFE. RECHNUNGEN.",
        "subtitle": "Alles auf einmal?",
        "vo_line": "Dein Briefkasten. Dein Chaos. keydoc macht Schluss damit.",
    },
    {
        "id": "s2_scan",
        "seed": "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=720&h=1280&fit=crop&q=80",
        "motion": "close-up of smartphone camera pointing down at official paper document, glowing blue scan line sweeps slowly across paper, shallow depth of field, cinematic product shot",
        "title": "EINFACH SCANNEN",
        "subtitle": "KI erkennt sofort.",
        "vo_line": "Einfach Scannen — keydoc erkennt jedes Dokument sofort.",
    },
    {
        "id": "s3_befund",
        "seed": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=720&h=1280&fit=crop&q=80",
        "motion": "sleek dark UI overlay materializes on medical document, purple glowing annotations highlight key terms, cinematic slow reveal, futuristic HUD",
        "title": "KI ERKLÄRT DEINEN",
        "subtitle": "BEFUND.",
        "vo_line": "KI liest deinen Befund und erklärt ihn auf einen Blick.",
    },
    {
        "id": "s4_fristen",
        "seed": "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=720&h=1280&fit=crop&q=80",
        "motion": "desk calendar with highlighted deadline date, gentle dolly forward, soft red glow pulses on circled date, dark moody atmosphere, cinematic",
        "title": "KEINE FRIST",
        "subtitle": "MEHR VERPASSEN.",
        "vo_line": "Keine Fristen mehr verpassen — keydoc erinnert dich rechtzeitig.",
    },
    {
        "id": "s5_brief",
        "seed": "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=720&h=1280&fit=crop&q=80",
        "motion": "dark laptop screen at night, German letter text types itself automatically, purple blinking cursor, ambient purple glow, cinematic close-up",
        "title": "KI SCHREIBT",
        "subtitle": "DEINEN BRIEF.",
        "vo_line": "Antworten schreiben? keydoc formuliert den Brief für dich.",
    },
    {
        "id": "s6_mcp",
        "seed": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=720&h=1280&fit=crop&q=80",
        "motion": "abstract purple and blue data particles connecting nodes in network, slow orbital camera move, dark background, futuristic holographic feel, cinematic",
        "title": "BEHÖRDEN",
        "subtitle": "ASSISTENT.",
        "vo_line": "Verbinde dich direkt mit Behörden — alles in einer App.",
    },
    {
        "id": "s7_cta",
        "seed": "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=720&h=1280&fit=crop&q=80",
        "motion": "modern smartphone floating in dark void, glowing purple app icon on screen, gentle aurora light swirls around device, cinematic hero product shot",
        "title": "KDOC",
        "subtitle": "Jetzt kostenlos testen.",
        "vo_line": "keydoc. Deine Dokumente, intelligent organisiert. Jetzt kostenlos testen.",
    },
]

CLIP_DURATION  = 5        # seconds per Runway clip
XFADE_DURATION = 0.4      # seconds crossfade
TOTAL_DURATION = len(SCENES) * CLIP_DURATION - (len(SCENES) - 1) * XFADE_DURATION  # 32.6s

# Windows font path (Arial Bold)
FONT_PATH = r"C:/Windows/Fonts/arialbd.ttf"

# -- Utilities -----------------------------------------------------------------
def run(cmd, check=True, capture=False):
    print(f"  $ {' '.join(str(c) for c in cmd)[:120]}")
    if capture:
        r = subprocess.run(cmd, capture_output=True, text=True)
        return r
    subprocess.run(cmd, check=check)

def http_post(url, payload, headers):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read()), resp.status
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        raise RuntimeError(f"HTTP {e.code} {url}: {body}")

def http_get(url, headers):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())

def download(url, dest: Path):
    print(f"  v {url[:80]} -> {dest.name}")
    urllib.request.urlretrieve(url, dest)

# -- STEP 1: Runway Gen-4 Clip Generation -------------------------------------
def step_runway():
    print("\n-- STEP 1: Runway Gen-4 Clip Generation --")
    runway_headers = {
        "Authorization": f"Bearer {RUNWAY_KEY}",
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06",
    }

    task_ids = {}

    # Submit all tasks first (parallel submission)
    for sc in SCENES:
        out = CLIPS_DIR / f"{sc['id']}.mp4"
        if out.exists():
            print(f"  OK {sc['id']} already exists, skipping")
            continue

        print(f"\n  -> Submitting {sc['id']}...")
        payload = {
            "model": "gen4_turbo",
            "promptImage": sc["seed"],
            "promptText": sc["motion"],
            "ratio": "720:1280",
            "duration": CLIP_DURATION,
        }
        result, _ = http_post(
            "https://api.dev.runwayml.com/v1/image_to_video",
            payload, runway_headers
        )
        task_id = result.get("id") or result.get("taskId")
        print(f"    task_id: {task_id}")
        task_ids[sc["id"]] = task_id

    if not task_ids:
        print("  All clips already generated.")
        return

    # Poll all pending tasks
    print(f"\n  Polling {len(task_ids)} tasks...")
    pending = dict(task_ids)
    failed = {}
    max_wait = 600  # 10 minutes
    start = time.time()

    while pending and (time.time() - start) < max_wait:
        time.sleep(12)
        done = []
        for scene_id, task_id in pending.items():
            try:
                status = http_get(
                    f"https://api.dev.runwayml.com/v1/tasks/{task_id}",
                    runway_headers
                )
                s = status.get("status", "UNKNOWN")
                prog = status.get("progress", 0)
                print(f"    {scene_id}: {s} ({prog:.0%})")

                if s == "SUCCEEDED":
                    outputs = status.get("output", [])
                    if not outputs:
                        raise RuntimeError(f"No output URL in {status}")
                    video_url = outputs[0]
                    out = CLIPS_DIR / f"{scene_id}.mp4"
                    download(video_url, out)
                    print(f"    OK saved {out.name} ({out.stat().st_size//1024} KB)")
                    done.append(scene_id)

                elif s in ("FAILED", "CANCELLED"):
                    err = status.get("failure", status.get("error", s))
                    print(f"    FAIL {scene_id} FAILED: {err}")
                    failed[scene_id] = err
                    done.append(scene_id)

            except Exception as e:
                print(f"    ! poll error for {scene_id}: {e}")

        for sid in done:
            del pending[sid]

    if pending:
        raise RuntimeError(f"Timed out waiting for: {list(pending.keys())}")
    if failed:
        raise RuntimeError(f"Failed clips: {failed}")

    print("\n  OK All Runway clips generated.")


# -- STEP 2: FFmpeg Text Overlays (glassmorphism card + animated text) ---------
def step_overlay():
    print("\n-- STEP 2: Text Overlays --")

    def esc(t):
        # Escape backslash first, then colon (FFmpeg option separator)
        return t.replace("\\", "\\\\").replace(":", "\\:")

    for sc in SCENES:
        src  = CLIPS_DIR / f"{sc['id']}.mp4"
        dest = COMP_DIR / f"{sc['id']}_text.mp4"

        if not src.exists():
            raise FileNotFoundError(f"Missing clip: {src}")
        if dest.exists():
            print(f"  OK {dest.name} already exists")
            continue

        title    = esc(sc["title"])
        subtitle = esc(sc["subtitle"])
        d        = float(CLIP_DURATION)

        # Fade alpha expression — commas inside expressions must be escaped as \,
        # so FFmpeg doesn't split them as filter-chain separators.
        C = "\\,"  # escaped comma for FFmpeg filter string (\\, in Python = \, sent to FFmpeg)
        fade_d = f"{d - 0.4:.1f}"
        alpha_expr = (
            f"if(lt(t{C}0.4){C}t/0.4{C}"
            f"if(gt(t{C}{fade_d}){C}({d}-t)/0.4{C}1))"
        )

        # 720×1280 frame; card covers bottom ~30% from y=880
        vf = (
            f"drawbox=x=0:y=880:w=720:h=400:color=black@0.68:t=fill"
            f",drawtext=text={title}"
            f":fontsize=64:fontcolor=white"
            f":x=(w-text_w)/2:y=900:alpha={alpha_expr}"
            f",drawtext=text={subtitle}"
            f":fontsize=46:fontcolor=0x9B8FFF"
            f":x=(w-text_w)/2:y=992:alpha={alpha_expr}"
            f",drawtext=text=kdoc"
            f":fontsize=40:fontcolor=0x7065FF"
            f":x=w-text_w-28:y=44:alpha={alpha_expr}"
        )

        run([
            "ffmpeg", "-y",
            "-i", str(src),
            "-vf", vf,
            "-c:v", "libx264", "-crf", "20", "-preset", "fast",
            "-c:a", "copy",
            str(dest)
        ])
        print(f"  OK {dest.name}")

    print("  OK All overlays rendered.")


# -- STEP 3: Concat 7 clips with xfade transitions ----------------------------
def step_concat():
    print("\n-- STEP 3: Concat with Crossfades --")
    out = ROOT / "kdoc_reel_runway_raw.mp4"
    if out.exists():
        print(f"  OK {out.name} already exists ({out.stat().st_size//1024} KB)")
        return

    clips = [COMP_DIR / f"{sc['id']}_text.mp4" for sc in SCENES]
    for c in clips:
        if not c.exists():
            raise FileNotFoundError(f"Missing composited clip: {c}")

    n = len(clips)
    xd = XFADE_DURATION
    cd = float(CLIP_DURATION)

    # Build filtergraph for N clips with xfade
    inputs  = []
    for c in clips:
        inputs += ["-i", str(c)]

    # Build complex filter
    filt_parts = []
    # label each video stream
    prev = "[0:v]"
    for i in range(1, n):
        offset = cd * i - xd * i
        cur  = f"[{i}:v]"
        out_label = "[vout]" if i == n - 1 else f"[vt{i}]"
        filt_parts.append(
            f"{prev}{cur}xfade=transition=fade:duration={xd}:offset={offset:.3f}{out_label}"
        )
        prev = f"[vt{i}]"

    # Runway clips have no audio — video-only output; audio added in merge step
    filtergraph = ";".join(filt_parts)

    run([
        "ffmpeg", "-y",
        *inputs,
        "-filter_complex", filtergraph,
        "-map", "[vout]",
        "-c:v", "libx264", "-crf", "19", "-preset", "fast",
        "-an",
        str(out)
    ])
    print(f"  OK {out.name} ({out.stat().st_size//1024} KB)")


# -- STEP 4: ElevenLabs Voiceover ----------------------------------------------
VOICE_ID = "FGY2WhTYpPnrIDTdsKH5"   # Laura — free-tier German female
VOICE_FALLBACKS = [
    "XB0fDUnXU5powFXDhCwa",  # Charlotte
    "XrExE9yKIg1WjnnlVkGX",  # Matilda
]

def _tts(text, dest: Path, attempt=0):
    vid = VOICE_ID if attempt == 0 else VOICE_FALLBACKS[attempt - 1]
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.80,
            "similarity_boost": 0.70,
            "style": 0.05,
            "use_speaker_boost": False,
        }
    }
    headers = {
        "xi-api-key": ELEVEN_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{vid}"
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            dest.write_bytes(resp.read())
        print(f"    OK {dest.name} ({dest.stat().st_size//1024} KB)")
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        if e.code in (401, 402) and attempt < len(VOICE_FALLBACKS):
            print(f"    ! voice {vid} blocked ({e.code}), trying fallback...")
            _tts(text, dest, attempt + 1)
        else:
            raise RuntimeError(f"ElevenLabs {e.code}: {body[:200]}")


def _silence_mp3(duration_s: float, dest: Path):
    """Generate silence as MP3 via FFmpeg."""
    run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"anullsrc=r=44100:cl=mono",
        "-t", str(duration_s),
        "-c:a", "libmp3lame", "-b:a", "128k",
        str(dest)
    ])


def step_vo():
    print("\n-- STEP 4: ElevenLabs Voiceover --")
    lines_dir = AUDIO_DIR / "lines"
    lines_dir.mkdir(exist_ok=True)

    # Generate each line
    for i, sc in enumerate(SCENES, 1):
        dest = lines_dir / f"line_{i:02d}.mp3"
        if dest.exists():
            print(f"  OK line_{i:02d}.mp3 already exists")
            continue
        print(f"  -> line_{i:02d}: {sc['vo_line'][:60]}...")
        _tts(sc["vo_line"], dest)

    # Concatenate lines with 0.5s silence gaps
    concat_list = AUDIO_DIR / "vo_concat.txt"
    silence = AUDIO_DIR / "silence_500ms.mp3"
    if not silence.exists():
        _silence_mp3(0.5, silence)

    lines = []
    for i in range(1, len(SCENES) + 1):
        lines.append(str(lines_dir / f"line_{i:02d}.mp3"))
        if i < len(SCENES):
            lines.append(str(silence))

    with open(concat_list, "w") as f:
        for l in lines:
            f.write(f"file '{l}'\n")

    vo_out = AUDIO_DIR / "voiceover.mp3"
    run([
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", str(concat_list),
        "-c:a", "libmp3lame", "-b:a", "128k",
        str(vo_out)
    ])

    # Check duration
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(vo_out)],
            capture=True)
    dur = float(r.stdout.strip())
    print(f"  OK voiceover.mp3 ({dur:.1f}s, {vo_out.stat().st_size//1024} KB)")


# -- STEP 5: Background Music (synthesized cinematic pad) ---------------------
def step_bg():
    print("\n-- STEP 5: Background Music --")
    bg_out = AUDIO_DIR / "bg_music.mp3"
    if bg_out.exists():
        print(f"  OK bg_music.mp3 already exists ({bg_out.stat().st_size//1024} KB)")
        return

    total = TOTAL_DURATION + 8  # extra room for fades

    # Build a single filter_complex with 4 layered sines (Am7 chord: A3+C4+E4+G4)
    # Then apply echo/reverb + fades inside the same filter_complex to avoid
    # mixing -filter_complex with -af (which FFmpeg forbids).
    freqs = [220.0, 261.6, 329.6, 392.0]   # Am7 = A3 C4 E4 G4
    n = len(freqs)

    # Each sine source → labelled [s0]..[s3], mixed → [mixed] → effects → [aout]
    src_labels = "".join(f"[s{i}]" for i in range(n))
    fc_parts = []
    for i, f in enumerate(freqs):
        fc_parts.append(
            f"sine=frequency={f}:sample_rate=44100:duration={total}[s{i}]"
        )
    fc_parts.append(
        f"{src_labels}amix=inputs={n}:duration=first[mixed]"
    )
    fc_parts.append(
        f"[mixed]"
        f"afade=in:st=0:d=3,"
        f"afade=out:st={total - 4:.1f}:d=4,"
        f"aecho=0.6:0.88:60|80:0.4|0.3,"
        f"volume=1.6"
        f"[aout]"
    )

    filtergraph = ";".join(fc_parts)

    run([
        "ffmpeg", "-y",
        "-filter_complex", filtergraph,
        "-map", "[aout]",
        "-c:a", "libmp3lame", "-b:a", "128k",
        str(bg_out)
    ])

    print(f"  OK bg_music.mp3 ({bg_out.stat().st_size//1024} KB)")


# -- STEP 6: Mix VO + Background -----------------------------------------------
def step_mix():
    print("\n-- STEP 6: Audio Mix --")
    vo  = AUDIO_DIR / "voiceover.mp3"
    bg  = AUDIO_DIR / "bg_music.mp3"
    out = AUDIO_DIR / "final_audio.mp3"

    if out.exists():
        print(f"  OK final_audio.mp3 already exists ({out.stat().st_size//1024} KB)")
        return

    for f in [vo, bg]:
        if not f.exists():
            raise FileNotFoundError(f"Missing audio: {f}")

    # Get video duration to trim audio
    video = ROOT / "kdoc_reel_runway_raw.mp4"
    if video.exists():
        r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                 "-of", "default=noprint_wrappers=1:nokey=1", str(video)], capture=True)
        vid_dur = float(r.stdout.strip())
    else:
        vid_dur = TOTAL_DURATION

    # Mix: VO at 100%, BG at 8%, trim to video length + 0.5s
    mix_dur = vid_dur + 0.5
    run([
        "ffmpeg", "-y",
        "-i", str(vo),
        "-i", str(bg),
        "-filter_complex",
        (
            f"[0:a]volume=1.0,apad=pad_dur={mix_dur}[a0];"
            f"[1:a]volume=0.08,aloop=loop=-1:size=2e+09,atrim=duration={mix_dur}[a1];"
            f"[a0][a1]amix=inputs=2:duration=first:dropout_transition=3[aout];"
            f"[aout]afade=in:st=0:d=0.5,"
            f"afade=out:st={mix_dur-0.8}:d=0.8[afinal]"
        ),
        "-map", "[afinal]",
        "-c:a", "libmp3lame", "-b:a", "192k",
        "-t", str(mix_dur),
        str(out)
    ])
    print(f"  OK final_audio.mp3 ({out.stat().st_size//1024} KB)")


# -- STEP 7: Merge Video + Audio -----------------------------------------------
def step_merge():
    print("\n-- STEP 7: Merge Video + Audio --")
    video = ROOT / "kdoc_reel_runway_raw.mp4"
    audio = AUDIO_DIR / "final_audio.mp3"
    out   = FINAL_DIR / "kdoc_reel_runway_final.mp4"

    for f in [video, audio]:
        if not f.exists():
            raise FileNotFoundError(f"Missing: {f}")

    run([
        "ffmpeg", "-y",
        "-i", str(video),
        "-i", str(audio),
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        str(out)
    ])
    print(f"  OK {out.name} ({out.stat().st_size//1024} KB)")


# -- STEP 8: Verify ------------------------------------------------------------
def step_verify():
    print("\n-- STEP 8: Verify --")
    final = FINAL_DIR / "kdoc_reel_runway_final.mp4"
    if not final.exists():
        print("  FAIL Output file missing!")
        return False

    r = run([
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration,size,bit_rate",
        "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate",
        "-of", "json", str(final)
    ], capture=True)

    info = json.loads(r.stdout)
    fmt = info.get("format", {})
    streams = info.get("streams", [])

    duration = float(fmt.get("duration", 0))
    size_mb  = int(fmt.get("size", 0)) / 1e6
    bit_kbps = int(fmt.get("bit_rate", 0)) / 1000

    print(f"\n  +- Output: {final.name}")
    print(f"  |  Duration : {duration:.1f}s")
    print(f"  |  File size: {size_mb:.1f} MB")
    print(f"  |  Bitrate  : {bit_kbps:.0f} kbps")

    for s in streams:
        if s.get("codec_type") == "video":
            fps_str = s.get("r_frame_rate", "?")
            print(f"  |  Video    : {s.get('codec_name')} {s.get('width')}×{s.get('height')} @ {fps_str}")
        elif s.get("codec_type") == "audio":
            print(f"  |  Audio    : {s.get('codec_name')}")

    ok = size_mb > 2 and duration > 20
    print(f"  +- {'OK PASS' if ok else 'FAIL FAIL'}")

    if ok:
        print(f"\n  Final output: {final}")
    return ok


# -- Main ----------------------------------------------------------------------
STEPS = {
    "runway":  step_runway,
    "overlay": step_overlay,
    "concat":  step_concat,
    "vo":      step_vo,
    "bg":      step_bg,
    "mix":     step_mix,
    "merge":   step_merge,
    "verify":  step_verify,
}

ALL_ORDER = ["runway", "overlay", "concat", "vo", "bg", "mix", "merge", "verify"]

if __name__ == "__main__":
    args = sys.argv[1:]
    if not args or args[0] == "all":
        steps = ALL_ORDER
    else:
        steps = args

    for step in steps:
        if step not in STEPS:
            print(f"Unknown step '{step}'. Available: {', '.join(STEPS)}")
            sys.exit(1)
        STEPS[step]()

    print("\n--------------------------------------")
    print("  Pipeline complete.")
    print("--------------------------------------\n")
