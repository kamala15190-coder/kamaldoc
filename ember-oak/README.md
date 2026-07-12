# EMBER & OAK

A cinematic single-page site for a (fictional) wood-fire steakhouse in
Vöcklamarkt, Austria. Near-black, warm cream, ember orange; film grain;
a scroll-scrubbed fire hero; six dishes, one fire.

## Run it

```bash
cd ember-oak
node scripts/serve.mjs 4173
# → http://localhost:4173
```

Any static server with **HTTP Range support** also works (nginx, `npx serve`,
`npx http-server`). Avoid `python -m http.server` — it serves without Range
headers, which makes browsers treat the hero clip as unseekable and the
scroll-scrub will not move.

## The video clips

`assets/video/{hero,room,craft}.mp4` currently contain **procedurally
rendered placeholder clips** (canvas-rendered embers / candlelit room /
plating steam, encoded with a 4-frame GOP so the hero scrubs smoothly).
They exist because the network this site was built on blocks `*.fal.ai` /
`*.fal.run` egress.

To replace them with the real Seedance 2.0 shots (ribeye searing over
flame, dolly through the dining room, overhead plating):

```bash
export FAL_KEY="<your fal.ai key>"   # keep it out of git
./scripts/generate-videos.sh
```

The script submits the three prompts to `bytedance/seedance-2.0/text-to-video`
(std tier, 1080p → falls back to 720p if the tier rejects it, 16:9, 8 s,
no audio), polls the fal queue, downloads the results, re-encodes them
scrub-friendly (`-g 4 -movflags +faststart`) and refreshes the poster
frames. No HTML/CSS/JS changes are needed afterwards.

## Layout

- `index.html` — the whole page (hero, story, menu, private dining, visit/reserve)
- `css/style.css` — design system + film grain overlay + mobile pass + reduced-motion pass
- `js/main.js` — hero scroll-scrub, section parallax, reveals, reservation form logic
- `assets/fonts/` — Cormorant Garamond & Jost (variable TTFs, OFL-licensed, self-hosted)
