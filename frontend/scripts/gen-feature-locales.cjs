#!/usr/bin/env node
/**
 * UI-Übersetzungs-Generator (translation.json)
 * ------------------------------------------------------------------
 * Füllt in jeder Ziel-Locale GENAU die Strings, die noch reiner
 * Englisch-Fallback sind (Wert === en-Wert), übersetzt aus dem deutschen
 * Quelltext (de/translation.json) via Mistral AI. Bereits übersetzte Strings
 * bleiben unangetastet → idempotent, beliebig oft wiederholbar.
 *
 * Damit werden u. a. die noch englischen Feature-Namespaces (doka, phishing,
 * splash, intro, email) und alle frisch ergänzten Keys (search, pwa, settings …)
 * abgedeckt — ohne die handgepflegten de/en-Dateien zu verändern.
 *
 * Voraussetzung:  MISTRAL_API_KEY in der Umgebung.
 * Aufruf:         MISTRAL_API_KEY=... node scripts/gen-feature-locales.cjs
 *                 (optional: nur bestimmte Sprachen)  ... node scripts/gen-feature-locales.cjs fr es it
 *                 (optional: --dry  → zeigt nur, was übersetzt würde, kein API-Call)
 *
 * Danach immer: node scripts/check-i18n.cjs   (muss grün bleiben — Keys ändern sich nie).
 */
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.MISTRAL_API_KEY;
const BASE_URL = process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1';
const MODEL = process.env.MISTRAL_TEXT_MODEL || 'mistral-large-latest';

const LOCALES = path.join(__dirname, '..', 'src', 'locales');
const SKIP = new Set(['de', 'en']); // handgepflegte Referenzsprachen

// Gleiche Sprachtabelle wie gen-legal-locales.cjs.
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

const DRY = process.argv.includes('--dry');
const argLangs = process.argv.slice(2).filter((a) => !a.startsWith('--'));

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

function setDotted(obj, dotted, value) {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

const read = (lang) => JSON.parse(fs.readFileSync(path.join(LOCALES, lang, 'translation.json'), 'utf8'));
const enFlat = flatten(read('en'));
const deFlat = flatten(read('de'));

/** Keys in `lang`, die noch Englisch-Fallback sind und einen deutschen Quelltext haben. */
function pendingFor(lang) {
  const locFlat = flatten(read(lang));
  const pending = {};
  for (const key of Object.keys(enFlat)) {
    const loc = locFlat[key];
    const en = enFlat[key];
    const de = deFlat[key];
    if (typeof loc !== 'string') continue;
    if (loc !== en) continue;             // bereits übersetzt → unangetastet
    if (typeof de !== 'string' || !de) continue;
    pending[key] = de;                    // deutscher Quelltext
  }
  return pending;
}

async function translate(langName, batch) {
  const prompt = `You are a professional UI/UX translator for a mobile app called "kdoc" (KamalDoc) that helps people understand letters, invoices, medical reports and emails. Translate the JSON below from German into ${langName}.
RULES:
- Return ONLY valid JSON with the EXACT same keys. No markdown, no commentary.
- Translate only the string VALUES. Never change, add or remove keys.
- Keep it short, natural and idiomatic for app UI (buttons, labels, hints). Match the informal-but-respectful tone of the German source.
- Do NOT translate: brand/product names (kdoc, KamalDoc, Doka, Gmail, Outlook, IMAP, GMX, iCloud, Yahoo, Apple, BSI, APWG, PDF, SMS), and interpolation placeholders like {{reason}} or {{name}} (keep them verbatim, including the double braces).
- Preserve leading/trailing spaces, the ellipsis character "…", "\\n" line breaks and punctuation style.
- For ${langName}, use the script/writing system native to that language.

JSON:
${JSON.stringify(batch, null, 2)}`;

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
  return JSON.parse(data.choices[0].message.content);
}

(async () => {
  const targets = (argLangs.length ? argLangs : fs.readdirSync(LOCALES))
    .filter((l) => fs.existsSync(path.join(LOCALES, l)) && fs.statSync(path.join(LOCALES, l)).isDirectory())
    .filter((l) => !SKIP.has(l) && LANGUAGE_NAMES[l]);

  if (DRY) {
    let grand = 0;
    for (const lang of targets) {
      const n = Object.keys(pendingFor(lang)).length;
      grand += n;
      console.log(`  ${lang} (${LANGUAGE_NAMES[lang]}): ${n} pending`);
    }
    console.log(`\n[dry] ${grand} strings would be translated across ${targets.length} languages.`);
    return;
  }

  if (!API_KEY) {
    console.error('FEHLER: MISTRAL_API_KEY ist nicht gesetzt. Abbruch.');
    process.exit(1);
  }

  console.log(`Übersetze fehlende UI-Strings in ${targets.length} Sprachen mit ${MODEL} …`);
  let ok = 0, fail = 0, skipped = 0;
  for (const lang of targets) {
    const pending = pendingFor(lang);
    const keys = Object.keys(pending);
    if (keys.length === 0) { console.log(`  – ${lang}: nichts offen`); skipped++; continue; }
    try {
      const translated = await translate(LANGUAGE_NAMES[lang], pending);
      const obj = read(lang);
      let applied = 0;
      for (const key of keys) {
        const val = translated[key];
        if (typeof val === 'string' && val.trim()) { setDotted(obj, key, val); applied++; }
      }
      fs.writeFileSync(path.join(LOCALES, lang, 'translation.json'), JSON.stringify(obj, null, 2) + '\n', 'utf8');
      console.log(`  ✓ ${lang} (${LANGUAGE_NAMES[lang]}): ${applied}/${keys.length}`);
      ok++;
    } catch (e) {
      console.error(`  ✗ ${lang}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\nFertig: ${ok} übersetzt, ${skipped} nichts offen, ${fail} fehlgeschlagen.`);
  console.log('Bitte danach prüfen:  node scripts/check-i18n.cjs');
})();
