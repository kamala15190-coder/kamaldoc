#!/usr/bin/env node
/**
 * i18n key-consistency check (Phase G2).
 *
 * Compares every locale against the reference set (en) and reports keys that
 * are missing or extra. Exits non-zero on any mismatch so it can gate CI.
 *
 *   node scripts/check-i18n.cjs
 */
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'locales');
const REFERENCE = 'en';

function flatten(obj, prefix = '', out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out.add(key);
  }
  return out;
}

function loadKeys(locale) {
  const file = path.join(LOCALES_DIR, locale, 'translation.json');
  return flatten(JSON.parse(fs.readFileSync(file, 'utf8')));
}

const locales = fs.readdirSync(LOCALES_DIR).filter((d) =>
  fs.existsSync(path.join(LOCALES_DIR, d, 'translation.json'))
);

const refKeys = loadKeys(REFERENCE);
let problems = 0;

for (const locale of locales) {
  if (locale === REFERENCE) continue;
  const keys = loadKeys(locale);
  const missing = [...refKeys].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !refKeys.has(k));
  if (missing.length || extra.length) {
    problems += 1;
    console.error(`✗ ${locale}: ${missing.length} missing, ${extra.length} extra`);
    if (missing.length) console.error(`    missing: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ' …' : ''}`);
    if (extra.length) console.error(`    extra:   ${extra.slice(0, 10).join(', ')}${extra.length > 10 ? ' …' : ''}`);
  }
}

console.log(`\nReference (${REFERENCE}): ${refKeys.size} keys across ${locales.length} locales.`);
if (problems) {
  console.error(`\n✗ i18n check failed: ${problems} locale(s) inconsistent.`);
  process.exit(1);
}
console.log('✓ All locales consistent with the reference key set.');
