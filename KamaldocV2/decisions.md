# kdoc V2 — Architekturentscheidungen

Bestätigt am 2026-05-05.

| Frage | Entscheidung |
|---|---|
| LLM-Provider | **Mistral** für alle Tasks (Analyse, Texte, Übersetzung). Kein lokales LLM in V1. Kein Wechsel zu Claude. |
| OCR | **Mistral OCR** (`mistral-ocr-latest`) für Bild-/PDF-Erkennung |
| Object-Storage | **Cloudflare R2** (S3-kompatibel, EU-Region) |
| Hosting | **Hetzner Server** (selbst gemanagt, Docker-Compose) — kein Fly.io / Render |
| Mobile-Plattformen | **Android + iOS in V1** (parallel) |
| Lokales LLM | Verschoben auf späteres Release. Kein Pro-Feature in V1. |
| Apple Sign-In | Erforderlich für iOS-App-Store |
| Rechtshilfe AT | **RIS.bka.gv.at-API** integrieren (kostenlos, öffentlich) |
| Rechtshilfe DE/CH | Custom Prompt mit Mistral; Datenquellen-Anbindung v1.5 |
| Phishing | **Eigener ausführlicher Prompt** mit Mistral (siehe `backend/kdoc/llm/prompts/phishing.md`) |
| Marketing-Site | **Separater Ordner / Repo** (nicht Teil dieses Projekts) |
| Datenschutz/AGB | Vor Launch mit Anwalt prüfen lassen (nicht Teil V2-Scope) |
