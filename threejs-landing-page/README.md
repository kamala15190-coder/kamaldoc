# NOVA — Three.js Landing Page

An immersive, dark-themed landing page built with **Three.js**, **GSAP** and **Vite**.

![Three.js](https://img.shields.io/badge/Three.js-r169-black) ![GSAP](https://img.shields.io/badge/GSAP-3.12-88CE02) ![Vite](https://img.shields.io/badge/Vite-5-646CFF)

## ✨ Features

- **Dark background with floating 3D geometry** — icosahedrons, torus knots, cones and more drift and spin independently in a `MeshStandardMaterial` lit scene.
- **Mouse parallax** — the camera leans toward your cursor with inertia smoothing for a tangible sense of depth.
- **Smooth scroll with GSAP** — `ScrollTrigger` reveals each section on enter, `ScrollToPlugin` powers smooth anchor navigation, and scroll progress drives the 3D camera.
- **Glassmorphism UI overlay** — frosted-glass nav, cards and panels using `backdrop-filter`.
- **WebGL particle system** — ~3,500 GPU-rendered points in a custom `ShaderMaterial` form a slowly swirling, twinkling nebula.

## 🚀 Getting started

```bash
npm install
npm run dev      # start the dev server at http://localhost:5173
npm run build    # production build into dist/
npm run preview  # preview the production build
```

## 🗂️ Project structure

```
threejs-landing-page/
├── index.html              # markup + glassmorphism overlay
├── vite.config.js
├── src/
│   ├── css/style.css       # dark theme + glass styling
│   └── js/
│       ├── main.js         # entry point, loader, wiring
│       ├── scene.js        # renderer, camera, lights, floating shapes, parallax
│       ├── particles.js    # custom-shader WebGL particle field
│       └── scroll.js       # GSAP ScrollTrigger reveals + smooth scroll
```

## 🛠️ Tech

| Concern        | Tool                                   |
| -------------- | -------------------------------------- |
| 3D / WebGL     | [three](https://threejs.org)           |
| Animation      | [gsap](https://gsap.com) + ScrollTrigger |
| Build / dev    | [vite](https://vitejs.dev)             |

## ♿ Accessibility

Honours `prefers-reduced-motion`: scroll animations and the scroll-hint pulse are disabled when the user requests reduced motion.

## License

MIT
