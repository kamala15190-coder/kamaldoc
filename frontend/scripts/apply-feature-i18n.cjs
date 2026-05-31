#!/usr/bin/env node
/**
 * Zentrale i18n-Änderungen für die App-Store-/Doka-Feature-Runde (Mai 2026).
 * ------------------------------------------------------------------------
 * - ADD:    neue Keys, de + en handgepflegt (Quelltexte für die Übersetzung).
 * - REMOVE: entfallene Keys (Behörden-Assistent etc.) – aus ALLEN Locales raus.
 * - Danach Struktur-Sync aller 50 Locales gegen en:
 *     · fehlende Keys → mit en-Wert als Platzhalter angelegt
 *     · überzählige Keys → entfernt
 *     · bereits übersetzte Werte bleiben unangetastet (idempotent).
 *
 * Pipeline danach:
 *     MISTRAL_API_KEY=… node scripts/gen-feature-locales.cjs   (übersetzt en-Platzhalter)
 *     node scripts/check-i18n.cjs                              (muss grün bleiben)
 *
 *   node scripts/apply-feature-i18n.cjs            (anwenden)
 *   node scripts/apply-feature-i18n.cjs --dry      (nur Diff zeigen)
 */
const fs = require('fs');
const path = require('path');

const LOCALES = path.join(__dirname, '..', 'src', 'locales');
const DRY = process.argv.includes('--dry');

// --- Neue Keys: de = Quelltext, en = englische Referenz -----------------------
const ADD = {
  // 2.6 Token-Abrechnung (Doka)
  'profile.usageDokaTokens': { de: 'Doka-Tokens', en: 'Doka tokens' },
  'pricing.dokaTokensFree': { de: '50.000 Doka-Tokens / Monat', en: '50,000 Doka tokens / month' },
  'pricing.dokaTokensBasic': { de: '500.000 Doka-Tokens / Monat', en: '500,000 Doka tokens / month' },
  'pricing.dokaTokensPro': { de: '3 Mio. Doka-Tokens / Monat', en: '3M Doka tokens / month' },

  // 2.3 Universelle Büroklammer-Auswahl (Kamera / Galerie / Datei)
  'attach.title': { de: 'Anhang hinzufügen', en: 'Add attachment' },
  'attach.takePhoto': { de: 'Foto aufnehmen', en: 'Take photo' },
  'attach.fromGallery': { de: 'Aus Galerie wählen', en: 'Choose from gallery' },
  'attach.uploadFile': { de: 'Datei hochladen', en: 'Upload file' },
  'attach.cancel': { de: 'Abbrechen', en: 'Cancel' },

  // 2.4 Rechtsanwalt-Modus — Info-Modal
  'common.close': { de: 'Schließen', en: 'Close' },
  'doka.lawyerInfoOpen': { de: 'Mehr über den Rechtsanwalt-Modus', en: 'More about Lawyer mode' },
  'doka.lawyerInfoTitle': { de: 'Rechtsanwalt-Modus', en: 'Lawyer mode' },
  'doka.lawyerInfoIntro': {
    de: 'Der Rechtsanwalt-Modus richtet Doka auf juristische Schreiben aus – Bescheide, Verträge, Behördenpost.',
    en: 'Lawyer mode focuses Doka on legal documents – notices, contracts and official letters.',
  },
  'doka.lawyerInfoChangesTitle': { de: 'Was sich ändert', en: 'What changes' },
  'doka.lawyerInfoChanges': {
    de: 'Doka liest juristische Dokumente tiefer: erklärt Paragraphen verständlich, schätzt deine rechtliche Lage ein, findet anfechtbare Punkte und entwirft auf Wunsch ein Widerspruchsschreiben mit deinen Absenderdaten.',
    en: 'Doka reads legal documents more deeply: it explains clauses in plain language, assesses your legal situation, finds contestable points and, on request, drafts an objection letter using your sender details.',
  },
  'doka.lawyerInfoBetterTitle': { de: 'Was Doka besser kann', en: 'What Doka does better' },
  'doka.lawyerInfoBetter': {
    de: 'Präzisere rechtliche Erklärungen, strukturierte Einschätzungen und formgerechtere Schreiben-Entwürfe als im normalen Modus.',
    en: 'More precise legal explanations, structured assessments and more formally correct letter drafts than in normal mode.',
  },
  'doka.lawyerInfoLimitsTitle': { de: 'Was eingeschränkt ist', en: 'What is limited' },
  'doka.lawyerInfoLimits': {
    de: 'Der Fokus liegt klar auf rechtlichen Themen – allgemeiner Plausch tritt zurück, und Antworten fallen formeller und vorsichtiger aus.',
    en: 'The focus is clearly on legal matters – casual chit-chat takes a back seat and answers become more formal and more cautious.',
  },
  'doka.lawyerInfoLegal': {
    de: 'Doka ist eine KI und ersetzt keine Rechtsberatung – und auch keinen Arzt oder Finanzberater. Alle Ausgaben vor der Verwendung sorgfältig prüfen.',
    en: 'Doka is an AI and does not replace legal advice – nor a doctor or financial adviser. Please review all output carefully before using it.',
  },
  'doka.lawyerInfoClose': { de: 'Verstanden', en: 'Got it' },
};

// --- Entfallene Keys (überall löschen) ---------------------------------------
const REMOVE = [
  // 2.5 Behörden-Assistent entfernt
  'pricing.behoerde2',
  'pricing.behoerde10',
  'pricing.behoerde50',
  'profile.usageBehoerde',
  // 2.2 „Datei"-Label an der Phishing-Büroklammer entfernt (nur noch Icon)
  'phishing.upload',
  // 2.3 Doka-Büroklammer nutzt jetzt attach.title (statt „Datei anhängen")
  'doka.attach',
];

// --- Helpers -----------------------------------------------------------------
const read = (lang) => JSON.parse(fs.readFileSync(path.join(LOCALES, lang, 'translation.json'), 'utf8'));
const write = (lang, obj) => fs.writeFileSync(path.join(LOCALES, lang, 'translation.json'), JSON.stringify(obj, null, 2) + '\n', 'utf8');

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

function delDotted(obj, dotted) {
  const parts = dotted.split('.');
  const stack = [];
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) return;
    stack.push([cur, parts[i]]);
    cur = cur[parts[i]];
  }
  delete cur[parts[parts.length - 1]];
  // leere Eltern-Objekte aufräumen
  for (let i = stack.length - 1; i >= 0; i--) {
    const [parent, key] = stack[i];
    if (parent[key] && typeof parent[key] === 'object' && Object.keys(parent[key]).length === 0) delete parent[key];
  }
}

const dirs = fs.readdirSync(LOCALES).filter((d) => fs.existsSync(path.join(LOCALES, d, 'translation.json')));

if (DRY) {
  console.log(`ADD (${Object.keys(ADD).length}):`, Object.keys(ADD).join(', ') || '—');
  console.log(`REMOVE (${REMOVE.length}):`, REMOVE.join(', ') || '—');
  console.log(`Locales: ${dirs.length}`);
  process.exit(0);
}

// 1) de + en: ADD-Werte setzen, REMOVE löschen
for (const lang of ['de', 'en']) {
  const obj = read(lang);
  for (const [key, val] of Object.entries(ADD)) setDotted(obj, key, val[lang]);
  for (const key of REMOVE) delDotted(obj, key);
  write(lang, obj);
}

// 2) Referenz-Keyset aus en
const enFlat = flatten(read('en'));
const enKeys = Object.keys(enFlat);

// 3) Alle übrigen Locales gegen en synchronisieren
let added = 0, removed = 0, touched = 0;
for (const lang of dirs) {
  if (lang === 'en' || lang === 'de') continue;
  const obj = read(lang);
  let changed = false;
  const before = flatten(obj);
  for (const key of REMOVE) { if (key in before) { delDotted(obj, key); removed++; changed = true; } }
  const locFlat = flatten(obj);
  // fehlende Keys mit en-Platzhalter anlegen
  for (const key of enKeys) {
    if (!(key in locFlat)) { setDotted(obj, key, enFlat[key]); added++; changed = true; }
  }
  // überzählige Keys entfernen
  for (const key of Object.keys(locFlat)) {
    if (!(key in enFlat)) { delDotted(obj, key); removed++; changed = true; }
  }
  if (changed) { write(lang, obj); touched++; }
}

console.log(`✓ de/en gepflegt. ${touched} weitere Locales angepasst (+${added} Keys, -${removed} Keys).`);
console.log('Nächster Schritt:  MISTRAL_API_KEY=… node scripts/gen-feature-locales.cjs');
