#!/usr/bin/env node
/**
 * Legal-Übersetzungs-Generator
 * ------------------------------------------------------------------
 * Übersetzt src/locales/de/legal.json in ALLE übrigen Sprachen via Mistral AI.
 * de und en bleiben unangetastet (handgepflegt). Für jede Zielsprache wird EIN
 * Batch-Call gemacht; Struktur und Keys bleiben erhalten, Eigennamen, Adressen,
 * E-Mails, URLs, IDs und § werden nicht verändert.
 *
 * Voraussetzung:  MISTRAL_API_KEY in der Umgebung.
 * Aufruf:         MISTRAL_API_KEY=... node scripts/gen-legal-locales.cjs
 *                 (optional: nur bestimmte Sprachen)  ... node scripts/gen-legal-locales.cjs fr es it
 *
 * Hinweis: Rechtlich verbindlich bleibt laut "binding"-Hinweis die deutsche Fassung.
 */
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.MISTRAL_API_KEY;
const BASE_URL = process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1';
const MODEL = process.env.MISTRAL_TEXT_MODEL || 'mistral-large-latest';

const LOCALES = path.join(__dirname, '..', 'src', 'locales');
const SKIP = new Set(['de', 'en']); // handgepflegt

const LANGUAGE_NAMES = {
  es: 'Spanish', fr: 'French', ar: 'Arabic', pt: 'Portuguese', tr: 'Turkish', it: 'Italian',
  pl: 'Polish', bs: 'Bosnian', hr: 'Croatian', sr: 'Serbian', cs: 'Czech', sk: 'Slovak',
  sl: 'Slovenian', nl: 'Dutch', ru: 'Russian', uk: 'Ukrainian', ro: 'Romanian', hu: 'Hungarian',
  bg: 'Bulgarian', el: 'Greek', sv: 'Swedish', no: 'Norwegian', da: 'Danish', fi: 'Finnish',
  hi: 'Hindi', zh: 'Chinese (Simplified)', ja: 'Japanese', ko: 'Korean', id: 'Indonesian',
  sw: 'Swahili', vi: 'Vietnamese', th: 'Thai', tl: 'Tagalog', af: 'Afrikaans', ca: 'Catalan',
  eu: 'Basque', gl: 'Galician', et: 'Estonian', lv: 'Latvian', lt: 'Lithuanian', mk: 'Macedonian',
  sq: 'Albanian', be: 'Belarusian', kk: 'Kazakh', az: 'Azerbaijani', ka: 'Georgian',
  hy: 'Armenian', he: 'Hebrew',
};

if (!API_KEY) {
  console.error('FEHLER: MISTRAL_API_KEY ist nicht gesetzt. Abbruch.');
  process.exit(1);
}

const source = JSON.parse(fs.readFileSync(path.join(LOCALES, 'de', 'legal.json'), 'utf8'));

const argLangs = process.argv.slice(2);
const targets = (argLangs.length ? argLangs : fs.readdirSync(LOCALES))
  .filter((l) => fs.existsSync(path.join(LOCALES, l)) && fs.statSync(path.join(LOCALES, l)).isDirectory())
  .filter((l) => !SKIP.has(l) && LANGUAGE_NAMES[l]);

async function translate(langName) {
  const prompt = `You are a professional legal translator. Translate the JSON below from German into ${langName}.
RULES:
- Return ONLY valid JSON with the EXACT same structure and keys. No markdown, no commentary.
- Translate only the string VALUES (text). Never change keys.
- Do NOT translate: proper nouns and company names (Schulbox E.U., kdoc, Mistral AI, Hetzner, Supabase, Stripe, Google, Firebase), personal names, postal addresses, email addresses, URLs, VAT/GISA numbers, law references (e.g. "Art. 6 DSGVO", "§ 18 FAGG", "GewO 1994"), and the section markers like "§ 1".
- Keep \\n line breaks exactly as in the source.
- Use formal, precise legal language appropriate for ${langName}.

JSON:
${JSON.stringify(source, null, 2)}`;

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content = data.choices[0].message.content;
  return JSON.parse(content);
}

(async () => {
  console.log(`Übersetze legal.json in ${targets.length} Sprachen mit ${MODEL} ...`);
  let ok = 0, fail = 0;
  for (const lang of targets) {
    try {
      const translated = await translate(LANGUAGE_NAMES[lang]);
      fs.writeFileSync(path.join(LOCALES, lang, 'legal.json'), JSON.stringify(translated, null, 2) + '\n', 'utf8');
      console.log(`  ✓ ${lang} (${LANGUAGE_NAMES[lang]})`);
      ok++;
    } catch (e) {
      console.error(`  ✗ ${lang}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\nFertig: ${ok} erfolgreich, ${fail} fehlgeschlagen.`);
  if (fail) console.log('Fehlgeschlagene Sprachen behalten die deutsche Fassung (rechtlich verbindlich).');
})();
