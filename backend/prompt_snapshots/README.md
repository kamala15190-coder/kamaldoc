# Prompt-Snapshots (Phase J — KI-Prompt-Verifikation)

Erzeugt von `backend/verify_prompts.py` gegen das **Live-Mistral-Backend**
(`mistral-small-latest`) mit realistischen deutschen Beispiel-Dokumenten
(Strafverfügung, MRT-Befund, Elektriker-Rechnung, Phishing-Mail).

Neu erzeugen:

```bash
cd /opt/kamaldoc/app/backend && set -a && . ./.env && set +a \
    && /opt/kamaldoc/venv/bin/python verify_prompts.py
```

## Ergebnis (30.05.2026)

| Prompt | Snapshot | Bewertung |
|---|---|---|
| ANALYSE_PROMPT | `analyse_bescheid`, `analyse_rechnung` | ✅ Schema-konformes JSON, korrekte Kategorie/Datum/Betrag/Sprache |
| EXPENSE_ITEMS_PROMPT | `expense_items_rechnung` | ✅ Alle 4 Positionen mit Preis + Kategorie extrahiert |
| BEFUND_SIMPLIFY_PROMPT | `befund_simplify` | ✅ Einfache Sprache, Fachbegriffe in Klammern, 3-Struktur, Disclaimer |
| BEFUND_TRANSLATE_PROMPT | `befund_translate_en` | ⚠️→✅ Body sauber EN; erste Überschrift blieb DE → Prompt geschärft (Überschriften explizit) |
| BEHOERDE_PROMPT | `behoerde_explain` | ✅ Verständliche Erklärung, korrekte AT-Bezüge |
| LEGAL_ASSESSMENT_PROMPT | `legal_assessment` | ✅ Korrekte Jurisdiktion (§24 StVO, VStG 1991), strukturiert, Disclaimer |
| CONTESTABLE_ELEMENTS_PROMPT | `contestable_elements` | ✅ Strukturiertes JSON (12 anfechtbare Punkte) |
| ANTWORT_PROMPT_TEMPLATE | `antwort_reply` | ✅ Briefform, korrekte Absenderdaten, passender Ton |
| OBJECTION_LETTER_PROMPT | `objection_letter` | ✅ Saubere Briefform, §-Bezüge (§10/§49 StVO), gewählte Elemente berücksichtigt |
| PHISHING_PROMPT | `phishing_de`, `phishing_en` | ✅ Score 95 + verdict, rot/grün-Flags, Sprache (de/en) korrekt respektiert |

**Fazit:** Alle Agent-Prompts liefern schema-/formatkonforme, jurisdiktions- und
sprachkorrekte Ausgaben. Einziger Befund (untranslated Überschrift in
BEFUND_TRANSLATE) wurde im Prompt behoben. Keine Few-Shots nötig.

**Offen:** Doka-System-Prompt (Tool-Loop) ist hier nicht als Snapshot enthalten —
er wird live über die Doka-UI/SSE getestet (echte Treffer erfordern verbundene
Konten/Dokumente).
