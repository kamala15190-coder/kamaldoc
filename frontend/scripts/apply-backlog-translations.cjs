#!/usr/bin/env node
/**
 * Handübersetzung des vorbestehenden i18n-Rückstands (≈280 Keys, die in den
 * 48 Nicht-de/en-Locales noch englische Platzhalter waren).
 *
 * Daten: scripts/backlog-data.cjs → { 'dotted.key': [Werte in LANGS-Reihenfolge] }
 * Sicherheit: setzt einen Wert NUR, wenn der aktuelle Locale-Wert fehlt ODER
 *             exakt dem en-Wert entspricht (= Platzhalter). Bestehende
 *             Übersetzungen werden nie überschrieben.
 *
 *   node scripts/apply-backlog-translations.cjs
 *   node scripts/check-i18n.cjs
 */
const fs = require('fs');
const path = require('path');

const L = path.join(__dirname, '..', 'src', 'locales');
const LANGS = ['es','fr','ar','pt','tr','it','pl','bs','hr','sr','cs','sk','sl','nl','ru','uk','ro','hu','bg','el','sv','no','da','fi','hi','zh','ja','ko','id','sw','vi','th','tl','af','ca','eu','gl','et','lv','lt','mk','sq','be','kk','az','ka','hy','he'];

const T = {};
for (const f of ['./backlog-data.cjs', './backlog-data2.cjs', './backlog-data3.cjs', './backlog-data4.cjs']) {
  try { Object.assign(T, require(f)); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
}

const read = (lang) => JSON.parse(fs.readFileSync(path.join(L, lang, 'translation.json'), 'utf8'));
const write = (lang, obj) => fs.writeFileSync(path.join(L, lang, 'translation.json'), JSON.stringify(obj, null, 2) + '\n', 'utf8');
const getDotted = (o, k) => k.split('.').reduce((a, p) => (a == null ? a : a[p]), o);
function setDotted(obj, dotted, value) {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

const en = read('en');
const data = {};
for (const lang of LANGS) data[lang] = read(lang);

let applied = 0, skipped = 0, bad = 0;
for (const [key, arr] of Object.entries(T)) {
  if (!Array.isArray(arr) || arr.length !== LANGS.length) {
    console.error(`✗ ${key}: ${Array.isArray(arr) ? arr.length : 'kein Array'} Werte (erwartet ${LANGS.length})`);
    bad++; continue;
  }
  const enVal = getDotted(en, key);
  LANGS.forEach((lang, i) => {
    const cur = getDotted(data[lang], key);
    if (cur === undefined || cur === enVal) { setDotted(data[lang], key, arr[i]); applied++; }
    else skipped++;
  });
}
if (bad) { console.error(`Abbruch: ${bad} fehlerhafte Einträge.`); process.exit(1); }
for (const lang of LANGS) write(lang, data[lang]);
console.log(`✓ ${applied} Werte gesetzt, ${skipped} übersprungen (bereits übersetzt). Keys: ${Object.keys(T).length}, Sprachen: ${LANGS.length}.`);
