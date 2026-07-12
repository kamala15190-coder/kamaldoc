# AURUM & NOIR — *Eclipse*

A cinematic, scroll-scrubbed launch site for the Eclipse, a (fictional) Swiss
tourbillon chronograph. Off-black, gold, very few words.

## Run it

```bash
cd eclipse
node scripts/serve.mjs          # → http://localhost:4488
```

## Verify it

Drives real scrolling in headless Chromium and asserts every scroll animation
responds (canvas frame indices, pinned text reveals, spec waypoints, smoke,
form):

```bash
node test/verify.mjs --shots /tmp/eclipse-shots
```

## How it works

- **Scroll**: [Lenis](https://lenis.darkroom.engineering) smooth scroll feeding
  GSAP ScrollTrigger. Sections are tall (`320–420vh`) with a `position: sticky`
  100vh stage inside; ScrollTrigger drives progress 0→1 across each section.
- **"Apple-style" scrubbing**: three pre-rendered webp frame sequences
  (`assets/frames/{orbit,macro,exploded}`) drawn to full-screen canvases,
  frame index = scroll progress. 160 frames for the hero 360° orbit, 120 each
  for the macro fly-through and the exploded assembly.
- **Sections**: hero orbit (wordmark tracks in, copy waypoints along the turn)
  → *Crafted in Darkness* story (pinned line-by-line reveal) → macro details
  (three captions keyed to the glide) → engineering (exploded assembly with
  42 mm / 72 h / 217-component callouts) → *Edition of 88 — $48,000* on black
  marble with live canvas smoke through a spotlight → private waitlist.

## Where the imagery comes from

Every sequence is rendered from **one shared 3D model** of the Eclipse
(`render/scene.html`, Three.js: brushed-titanium case, gold indices and
dauphine hands, working tourbillon cage with balance wheel and hairspring,
movement gears for the exploded view), captured headlessly:

```bash
node render/render.mjs           # re-render all sequences + stills
node render/preview.mjs          # quick probe frames for look-dev
```

### fal.ai pipeline (currently blocked in this environment)

The brief asked for fal.ai-generated clips. This Claude Code environment's
egress policy denies `fal.run`, `queue.fal.run`, `fal.ai` and `fal.media`
(the proxy answers CONNECT with a policy 403), so generation could not run
here. A complete, ready-to-run pipeline is included:

```bash
export FAL_KEY="<your fal.ai key>"
node scripts/generate-fal-assets.mjs --frames
```

It generates a hero image of the watch (flux-pro v1.1-ultra), animates it into
the four clips (kling v2.1 master image-to-video: orbit / macro / exploded /
atmosphere, 16:9, 5–10 s, no audio) so every clip shares the same watch design,
then re-extracts the frame sequences the site scrubs. Allowlist the fal hosts
in the environment's network policy (or run it locally) and the site picks up
the new frames without code changes.
