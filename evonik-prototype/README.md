# SEPURAN® Green — Evonik Konzeptstudie

Eine cinematische, scroll-gescrubbte Prototyp-Website für das **SEPURAN® Green**
Biogas-Membranmodul — gleiches Prinzip wie die Aurum-&-Noir-Eclipse-Site, in
Evonik Deep Purple / Weiß / Grau.

> **Hinweis:** Inoffizielle Konzeptstudie. Kein Angebot der Evonik Industries AG.
> SEPURAN® ist eine eingetragene Marke der Evonik Industries AG.

## Starten

```bash
node scripts/serve.mjs          # → http://localhost:4488
```

## Verifizieren

```bash
node test/verify.mjs --shots /tmp/sepuran-shots
```

Fährt echtes Scrollen in headless Chromium und prüft jede Scroll-Animation
(Orbit-Scrubbing vor/zurück, aufsteigenden Nebel, Explainer-Reveals,
Montage-Callouts, Impact-Sektion, Footer).

## Aufbau

- **Scroll:** Lenis Smooth Scroll → GSAP ScrollTrigger. Sektionen sind hoch
  (`340–460vh`) mit `position: sticky` 100vh-Stage; ScrollTrigger treibt den
  Fortschritt 0→1 je Sektion.
- **Scrubbing:** vorgerenderte webp-Frame-Sequenzen (`assets/frames/{orbit,assembly}`)
  auf Canvas gezeichnet, Frame-Index = Scroll-Fortschritt. Orbit 160 Frames,
  Montage 160 Frames.
- **Nebel:** canvas-basiert, steigt beim Orbit von unten auf und sinkt/fadet am
  Sequenzende weg — direkt an den Scroll-Fortschritt gekoppelt.
- **Sektionen:** Hero-Orbit (Wortmarke fährt ein, Nebel) → *Was ist ein
  Biogasmodul?* (gepinnte Zeilen-Reveals) → Montage (Hohlfaserbündel →
  Kartuschenrohr → O-Ringe/Platten → Retentatkappen → Klammern/Schrauben mit
  Callouts) → Nachhaltigkeit (Impact-Video oder Aurora-Fallback + Kennzahlen)
  → Footer.

## Bildmaterial

Die Sequenzen stammen aktuell aus **einem gemeinsamen 3D-Modell** des Moduls
(`render/scene.html`, Three.js: Hohlfaserbündel mit Epoxid-Verguss/Tube-Sheet,
grünes Kartuschenrohr mit SEPURAN-Label, O-Ringe, perforierte
Gasverteilungsplatten, Retentatkappen mit Ports, Edelstahlklammern und
Sechskantschrauben):

```bash
node render/render.mjs           # alle Sequenzen + Poster neu rendern
node render/preview.mjs          # schnelle Probe-Frames
```

### Higgsfield-Pipeline

Die finalen Clips entstehen wie beim Eclipse-Projekt über den
**Higgsfield-MCP-Connector**: Hero-Bild mit Cinema Studio Image 2.5, daraus alle
Clips mit **Cinema Studio Video 3.0** animiert (Orbit, Montage — je 10 s, 16:9,
720p, ohne Audio; plus ein Nachhaltigkeits-Clip als reines Text-zu-Video).
Prompts und Parameter stehen in `higgsfield-assets.json`. Nach dem Download die
Frames extrahieren (`scripts/extract-frames.mjs` aus dem Eclipse-Projekt,
`ffmpeg` erforderlich), `assets/impact.mp4` für die Nachhaltigkeitssektion
ablegen, `node scripts/build-artifact.mjs`, verifizieren, Artifact neu
publizieren.
