# Ahmed Kamal Solutions — AI Hub

A futuristic, **3D-driven** company site built with **Three.js** + **GSAP**. A glowing
AI head sits at the centre and *navigates the site for you*.

![Three.js](https://img.shields.io/badge/Three.js-r169-black) ![GSAP](https://img.shields.io/badge/GSAP-3.12-88CE02) ![Vite](https://img.shields.io/badge/Vite-5-646CFF)

## ✨ The experience

- **Central AI head** — a procedural neural orb (wireframe skull, glowing synapse
  nodes, pulsing core, gyroscope rings, eyes + visor) that represents the AI.
- **Orbiting menu** — the menu items float in a ring around the head.
- **Gaze tracking** — hover a menu item and the head physically *turns to look at it*.
  Idle, it follows your cursor.
- **AI-chat navigation** — click an item and the head dissolves into particles while
  an AI chat types **„Navigiere zu X"**, presses **Enter**, …
- **3D page fold** — …then the whole stage folds away in 3D and the chosen sub-page
  unfolds toward you. A back button reverses the whole sequence and rebuilds the head.
- **Lots of motion** — particle nebula, floating geometry, camera parallax, breathing
  core, flickering synapses.

## 🚀 Getting started

```bash
npm install
npm run dev               # dev server at http://localhost:5173
npm run build             # production build (dist/) + regenerates standalone.html
npm run build:standalone  # just regenerate the single-file build
```

## 📱 Single-file build (no hosting needed)

`standalone.html` is an auto-generated, fully self-contained version (CSS inlined,
JS inlined, Three.js + GSAP loaded from a CDN via an import map). It renders directly
from a raw file URL — e.g. open it through `raw.githack.com`:

```
https://raw.githack.com/kamala15190-coder/kamaldoc/claude/threejs-landing-page-x3qaF/threejs-landing-page/standalone.html
```

> ⚠️ Don't edit `standalone.html` by hand — it's generated from `src/`. Run
> `npm run build:standalone` after changing the sources.

## 🗂️ Structure

```
threejs-landing-page/
├── index.html                 # markup, menu host, sub-pages
├── standalone.html            # AUTO-GENERATED single-file build
├── scripts/build-standalone.mjs
├── src/
│   ├── css/style.css          # neon-glass dark theme
│   └── js/app.js              # AI head, gaze, chat-nav, 3D page folding
```

## License

MIT
