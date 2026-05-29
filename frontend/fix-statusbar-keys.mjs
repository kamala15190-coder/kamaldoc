import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, 'src', 'locales');

const translations = {
  af: { upgradePlan: "⚡ Upgrade Plan", proActive: "🚀 Pro Plan aktief" },
  ar: { upgradePlan: "⚡ ترقية الخطة", proActive: "🚀 خطة Pro نشطة" },
  az: { upgradePlan: "⚡ Planı yüksəlt", proActive: "🚀 Pro Plan aktiv" },
  be: { upgradePlan: "⚡ Абнавіць план", proActive: "🚀 Pro Plan актыўны" },
  bg: { upgradePlan: "⚡ Надградете плана", proActive: "🚀 Pro Plan активен" },
  bs: { upgradePlan: "⚡ Nadogradi plan", proActive: "🚀 Pro Plan aktivan" },
  ca: { upgradePlan: "⚡ Millorar pla", proActive: "🚀 Pla Pro actiu" },
  cs: { upgradePlan: "⚡ Vylepšit plán", proActive: "🚀 Pro plán aktivní" },
  da: { upgradePlan: "⚡ Opgrader plan", proActive: "🚀 Pro Plan aktiv" },
  el: { upgradePlan: "⚡ Αναβάθμιση πλάνου", proActive: "🚀 Pro Plan ενεργό" },
  es: { upgradePlan: "⚡ Mejorar plan", proActive: "🚀 Plan Pro activo" },
  et: { upgradePlan: "⚡ Uuenda plaani", proActive: "🚀 Pro plaan aktiivne" },
  eu: { upgradePlan: "⚡ Plana hobetu", proActive: "🚀 Pro Plana aktiboa" },
  fi: { upgradePlan: "⚡ Päivitä suunnitelma", proActive: "🚀 Pro-suunnitelma aktiivinen" },
  fr: { upgradePlan: "⚡ Améliorer le plan", proActive: "🚀 Plan Pro actif" },
  gl: { upgradePlan: "⚡ Mellorar plan", proActive: "🚀 Plan Pro activo" },
  he: { upgradePlan: "⚡ שדרג תוכנית", proActive: "🚀 תוכנית Pro פעילה" },
  hi: { upgradePlan: "⚡ प्लान अपग्रेड करें", proActive: "🚀 Pro प्लान सक्रिय" },
  hr: { upgradePlan: "⚡ Nadogradi plan", proActive: "🚀 Pro Plan aktivan" },
  hu: { upgradePlan: "⚡ Csomag frissítése", proActive: "🚀 Pro csomag aktív" },
  hy: { upgradePlan: "⚡ Թարdelays delays", proActive: "🚀 Pro Plan \u0561\u056F\u057F\u056B\u057E" },
  id: { upgradePlan: "⚡ Upgrade Paket", proActive: "🚀 Paket Pro aktif" },
  it: { upgradePlan: "⚡ Aggiorna piano", proActive: "🚀 Piano Pro attivo" },
  ja: { upgradePlan: "⚡ プランをアップグレード", proActive: "🚀 Proプラン有効" },
  ka: { upgradePlan: "⚡ გეგმის განახლება", proActive: "🚀 Pro გეგმა აქტიურია" },
  kk: { upgradePlan: "⚡ Жоспарды жаңарту", proActive: "🚀 Pro жоспар белсенді" },
  ko: { upgradePlan: "⚡ 플랜 업그레이드", proActive: "🚀 Pro 플랜 활성" },
  lt: { upgradePlan: "⚡ Atnaujinti planą", proActive: "🚀 Pro planas aktyvus" },
  lv: { upgradePlan: "⚡ Uzlabot plānu", proActive: "🚀 Pro plāns aktīvs" },
  mk: { upgradePlan: "⚡ Надградете план", proActive: "🚀 Pro Plan активен" },
  nl: { upgradePlan: "⚡ Upgrade plan", proActive: "🚀 Pro Plan actief" },
  no: { upgradePlan: "⚡ Oppgrader plan", proActive: "🚀 Pro Plan aktiv" },
  pl: { upgradePlan: "⚡ Ulepsz plan", proActive: "🚀 Plan Pro aktywny" },
  pt: { upgradePlan: "⚡ Melhorar plano", proActive: "🚀 Plano Pro ativo" },
  ro: { upgradePlan: "⚡ Îmbunătățește planul", proActive: "🚀 Plan Pro activ" },
  ru: { upgradePlan: "⚡ Улучшить план", proActive: "🚀 Pro план активен" },
  sk: { upgradePlan: "⚡ Vylepšiť plán", proActive: "🚀 Pro plán aktívny" },
  sl: { upgradePlan: "⚡ Nadgradi načrt", proActive: "🚀 Pro načrt aktiven" },
  sq: { upgradePlan: "⚡ Përmirëso planin", proActive: "🚀 Plani Pro aktiv" },
  sr: { upgradePlan: "⚡ Надоградите план", proActive: "🚀 Pro план активан" },
  sv: { upgradePlan: "⚡ Uppgradera plan", proActive: "🚀 Pro Plan aktiv" },
  sw: { upgradePlan: "⚡ Boresha mpango", proActive: "🚀 Mpango wa Pro hai" },
  th: { upgradePlan: "⚡ อัปเกรดแผน", proActive: "🚀 แผน Pro ใช้งานอยู่" },
  tl: { upgradePlan: "⚡ I-upgrade ang plan", proActive: "🚀 Pro Plan aktibo" },
  tr: { upgradePlan: "⚡ Planı yükselt", proActive: "🚀 Pro Plan aktif" },
  uk: { upgradePlan: "⚡ Покращити план", proActive: "🚀 Pro план активний" },
  vi: { upgradePlan: "⚡ Nâng cấp gói", proActive: "🚀 Gói Pro đang hoạt động" },
  zh: { upgradePlan: "⚡ 升级计划", proActive: "🚀 Pro 计划已激活" },
};

const skipLangs = ['de', 'en'];
let updated = 0;

for (const [lang, keys] of Object.entries(translations)) {
  if (skipLangs.includes(lang)) continue;
  const filePath = path.join(localesDir, lang, 'translation.json');
  if (!fs.existsSync(filePath)) continue;

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (!data.pricing) data.pricing = {};

  let changed = false;
  for (const [key, value] of Object.entries(keys)) {
    if (!data.pricing[key]) {
      data.pricing[key] = value;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    updated++;
  }
}

console.log(`Done! Updated ${updated} files with upgradePlan + proActive keys.`);
