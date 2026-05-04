# kdoc · Click-Prototyp

Reines Design-Prototyp. Keine Funktionalität, kein Backend — nur die visuelle Sprache und die Mikro-Interaktionen einer komplett neu gedachten kdoc-App für mobile Nutzung.

## Öffnen

`index.html` im Browser öffnen. Auf dem Desktop wird ein iPhone-Mockup gerendert (zur Vorschau), auf dem Handy ist es vollflächig.

## Design-Sprache: „Onyx & Amber"

Bewusst weg vom Indigo-Glassmorphism. Stattdessen:

| Layer        | Farbe        | Rolle                                |
|--------------|--------------|--------------------------------------|
| Onyx         | `#0E0F12`    | Hintergrund — wie poliertes Schwarzgranit |
| Surface      | `#16181D`    | Karten, leicht angehoben             |
| Pearl        | `#F1ECE3`    | Schrift, warmweiß (nicht knallweiß)  |
| Amber/Kupfer | `#E89A52`    | Akzent — warm, edel, freudvoll       |
| Petrol       | `#6FA7B8`    | Sekundär (Behörde/Sektoren)          |
| Rose         | `#D87E78`    | Sekundär (Medizin/Warnung)           |

Keine harten Indigo-Tags, keine bonbon-bunten Status-Badges. Alle Sekundärfarben gedämpft, sodass das Kupfer immer der einzige optische Anker bleibt — wie der kupferne Akzent bei Cupra oder das rote Spoiler-Detail bei einem Tesla Model S Plaid.

## Typographie

- **Display:** `Instrument Serif` — eine moderne, subtile Serif. Verleiht Headlines redaktionelle Qualität (denke *Monocle* oder *Apple Newsroom*), nicht Software-Standard.
- **Body:** `Inter` — neutraler, ruhiger Workhorse.
- **Italic-Akzent:** Headlines verwenden ein einzelnes kursives Wort als optischen Anker (`Guten Abend, *Kamal.*`) — der gleiche Trick, den High-End-Magazine seit Jahrzehnten nutzen.

Größenleiter ist auf 6 Stufen reduziert (Display 44/34, Title, Body, Sub, Caption). Jede Größe hat einen Job.

## Intro-Animation (My Cupra Style)

Choreographie über ~2,7 Sekunden, dann Crossfade ins Dashboard:

1. **0–0,4 s** — Onyx-Hintergrund mit feinem Filmkorn-Overlay fadet ein, radialer Glow von oben.
2. **0,1–1,5 s** — Der Kupfer-Ring um den Logomark zeichnet sich (SVG `stroke-dasharray`-Animation).
3. **0,4–1,4 s** — Die drei Striche des „K"-Monogramms zeichnen sich nacheinander, jeder Strich ~450 ms.
4. **1,0–2,6 s** — Ein einzelner Kupfer-Lichtsweep zieht diagonal über den Screen (`mix-blend-mode: screen`).
5. **1,3–1,9 s** — Das Wordmark `kdoc.` taucht buchstabenweise auf (Stagger 100 ms), Punkt in Kupfer.
6. **1,95–2,7 s** — Tagline „Dein Postfach. / Endlich aufgeräumt." steigt in zwei Zeilen auf.
7. **2,7 s** — Splash skaliert leicht hoch (1.05) und blendet weich aus, Dashboard reveal-staggert herein.

Tippen während des Splash überspringt direkt.

## Hauptscreens

| Screen      | Zweck                                                        |
|-------------|--------------------------------------------------------------|
| **Home**    | Editoriale Begrüßung, Hero-Karte „Heute fällig", Stats, Aufgaben-Liste, Sektoren-Grid |
| **Detail**  | Dokument-Hero mit Papier-Vorschau + Kupferstempel, Editoriale Beträge, KI-Zusammenfassungs-Karte, Action-Stack |
| **Tasks**   | Vollansicht aller Aufgaben mit Filter-Pills                  |
| **Sector**  | Behörden/Medizin/Ausgaben-Untersicht mit Quick-Actions       |
| **Scan**    | Kamera-Sucher mit Eckmarkierungen, animierter Scan-Laser, Kupfer-Auslöser |
| **Profile** | Konto, Erscheinungsbild-Wahl, Mehr-Liste                     |

## Interaktions-Details

- **Bottom-FAB:** Scan-Icon (kein Plus). Pulsierender Außen-Ring suggeriert „bereit". Translate-Y-Hover, gedämpfter Active-State.
- **Hero-Pulse:** Der Heute-fällig-Indikator pulsiert mit Schein, nicht mit knalliger Farbänderung — wie ein „LFP läuft"-Lämpchen.
- **Reveal-Stagger:** Jeder Screen hat 4–7 Reveal-Elemente mit `--d` als Delay-Variable (`80ms`-Steps). So wirkt jeder Screen-Wechsel gewollt komponiert, nicht zufällig.
- **Task-Check:** Klick auf den Kreis-Check setzt einen Kupfer-Fill mit `<polyline>`-Hook und blendet die Zeile auf 40% Opacity aus → Toast „Erledigt · ins Archiv verschoben".
- **Shutter:** Cooler Kupfer-Core mit Glow. Klick triggert Toast „Aufnahme erfasst · Analyse läuft" und springt nach 700 ms in die Detailansicht.
- **Glassmorphism nur dort, wo nötig:** Top-Bar und Bottom-Nav haben einen subtilen `backdrop-filter`-Blur — der Rest ist solides Surface, damit es nicht „Web-3.0-überall" wird.

## Was bewusst FEHLT

- Keine Hamburger-Menüs. Alle Sekundärrouten leben in `Profil` oder `Sektoren`.
- Keine Volltext-Bezeichnungen für Aktionen, wo Kontext + Icon reichen.
- Keine Confetti, kein Skeumorph, keine Emoji-Badges.
- Keine Kachel-Inflation auf der Startseite — drei Sektor-Karten + Hero + Aufgaben sind genug Information.

## Nächste Schritte (wenn das Design freigegeben ist)

1. SVG-Logomark als Asset extrahieren, an Designer für Pixel-Politur weiterreichen.
2. Komponenten in das React-Projekt übersetzen (Hero-Card, Task-Item, Sector-Tile, AI-Card).
3. Bestehende Tailwind-Tokens durch das Onyx-&-Amber-Token-Set ersetzen (`--bg-primary`, `--accent-solid`, etc.).
4. Capacitor-Splash mit der gleichen Logomark-Animation als natives MP4 oder Lottie-File rendern, damit der Übergang App-Start → Dashboard nahtlos ist.
