# KI-Prompt-Review (Phase J)

Review aller festen Prompts der Agents in `llm_service.py` und `doka_service.py`
gemäß Implementierungsplan §7a. Bewertung + Empfehlungen. **Empirische
Verifikation** (2–3 reale Dokumente je Prompt, Output auf Sprache/Format/
Korrektheit prüfen, Snapshots ablegen) steht noch aus — sie braucht einen
Live-`MISTRAL_API_KEY` und ist deshalb erst nach Deployment/mit Key durchführbar
(siehe „Offen").

## Querschnitt (umgesetzt)
- **Prompt-Injection-Abgrenzung (H6):** `_build_system_msg()` und die JSON-System-
  Message tragen jetzt `INJECTION_GUARD` — Dokument-/OCR-/Nutzertext zwischen
  `---` gilt als Daten, nie als Anweisung. Doka hat den Guard im eigenen
  System-Prompt.
- **Sprache:** Nutzer-gewählte Zielsprache wird in allen mehrsprachigen Prompts
  per starkem Override erzwungen (`explain`, `legal_assessment`,
  `contestable_elements`, `objection`, `translate`, Phishing, Doka).
- **Markdown-Regeln:** Sachtext-Prompts (Befund, Behörde, Briefe) erzwingen
  reinen Klartext (`NO_MARKDOWN_RULE`); Doka nutzt bewusst Markdown (Chat-UI
  rendert es).
- **Timeouts (H5):** Klassifikation/Analyse 30 s, Briefe 60 s, Chat-Stream 90 s.

## Prompt-für-Prompt

| Prompt | Zweck | Bewertung | Empfehlung |
|---|---|---|---|
| **OCR** (`mistral-ocr-latest`) | Layouttreue Texterkennung | Dediziertes OCR-Modell, kein Text-Prompt; robust mit Bild-Normalisierung | Keine Änderung; bei Mehrseiten-PDF perspektivisch alle Seiten statt nur Seite 1 für Doka-Attachments |
| **`ANALYSE_PROMPT`** | JSON-Extraktion + Kategorisierung | Sehr ausführlich, klare Prioritätsregeln, JSON-only; robustes `extract_json_from_llm_response` | Gut. Beispiel-Few-Shots könnten Fehlklassifikation „brief vs. rechnung" weiter senken |
| **`BEFUND_SIMPLIFY_PROMPT`** | Befund in einfache Sprache | 3-Struktur, Fachbegriffe in Klammern, kein Markdown; bewusst immer Deutsch (Übersetzung als 2. Schritt) | Disclaimer „keine Diagnose/ärztliche Beratung" explizit ergänzen |
| **`BEFUND_TRANSLATE_PROMPT`** | Treue Übersetzung | Struktur-/Tonerhalt, kein Markdown | Gut |
| **`ANTWORT_PROMPT` / `generate_reply`** | Antwortbrief | Absenderdaten, Ton, Briefform; User-`hints` als Priorität | `hints` als Nutzerwunsch sind legitim, aber dürfen Sicherheits-/Formatregeln nicht überschreiben — Guard beibehalten |
| **`OBJECTION_LETTER_PROMPT`** | Widerspruchsschreiben | Förmlicher Aufbau, AT/DE/CH, endet an Unterschrift | Gut |
| **`BEHOERDE_PROMPT`** | Behördenschreiben erklären | Verständlich, Jurisdiktion | Gesetzesbezug + Disclaimer „keine Rechtsberatung" stärker betonen |
| **`LEGAL_ASSESSMENT_PROMPT`** | Rechtliche Einschätzung | Jurisdiktion AT/DE/CH | Disclaimer „keine Rechtsberatung" verpflichtend ans Ende |
| **`CONTESTABLE_ELEMENTS_PROMPT`** | Anfechtbare Elemente (JSON) | Klares JSON-Array-Schema | Gut |
| **`EXPENSE_ITEMS_PROMPT`** | Positions-Extraktion | Präzise | Gut |
| **`PHISHING_PROMPT`** (neu) | Risiko-Score + Verdict + Flags | Klare Heuristiken, JSON-Schema, Score wird geclamped/validiert | Gut; Few-Shots für Grenzfälle (legitime Mahnung vs. Fake) erwägen |
| **Doka-System-Prompt** (neu) | Persona, Tools, Quellen, Markdown | Persona, Quellen-Zitat (Absender+Datum), Sprache, Injection-Guard, Lawyer-Erweiterung mit Disclaimer | Gut |

## Offen (vor Produktiv-Freigabe)
- **Empirische Verifikation** je Prompt mit 2–3 echten Dokumenten gegen den Live-
  Mistral; Outputs auf Sprache/Format/Korrektheit prüfen und als Snapshots
  ablegen (`backend/prompt_snapshots/`).
- Optionale Few-Shot-Beispiele in `ANALYSE_PROMPT` und `PHISHING_PROMPT` nach
  Auswertung realer Fehlklassifikationen.
