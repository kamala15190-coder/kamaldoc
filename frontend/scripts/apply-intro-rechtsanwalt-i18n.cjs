#!/usr/bin/env node
/**
 * Intro-Schritt 3 (Doka) von „Behörden-Assistent" auf den Rechtsanwalt-Modus
 * umstellen — in allen 50 Sprachen.
 *
 *   node scripts/apply-intro-rechtsanwalt-i18n.cjs   (anwenden)
 *   node scripts/check-i18n.cjs                       (muss grün bleiben)
 *
 * - intro.step3Title:  übernimmt den bereits etablierten Begriff aus
 *   doka.lawyerInfoTitle der jeweiligen Sprache (de = „Rechtsanwalt-Modus").
 * - intro.step3Desc:   handgepflegte Übersetzung von
 *   „Aktiviere in Doka den Rechtsanwalt-Modus, um ein Dokument auf rechtliche
 *    Fehler zu überprüfen."  Marken (Doka) bleiben unübersetzt.
 */
const fs = require('fs');
const path = require('path');
const LOCALES = path.join(__dirname, '..', 'src', 'locales');

// Handgepflegte Beschreibung je Sprache (intro.step3Desc).
const DESC = {
  af: "Aktiveer die Prokureur-modus in Doka om 'n dokument vir regsfoute na te gaan.",
  ar: 'فعّل وضع المحامي في Doka للتحقق من مستند بحثًا عن الأخطاء القانونية.',
  az: 'Sənəddə hüquqi səhvləri yoxlamaq üçün Doka-da Vəkil rejimini aktivləşdirin.',
  be: 'Уключыце ў Doka рэжым «Адвакат», каб праверыць дакумент на юрыдычныя памылкі.',
  bg: 'Активирайте режим „Адвокат“ в Doka, за да проверите документ за правни грешки.',
  bs: 'Aktivirajte način Advokat u Doki da provjerite dokument na pravne greške.',
  ca: "Activa el mode Advocat a Doka per revisar un document a la cerca d'errors legals.",
  cs: 'Aktivujte v Doce režim Advokát a zkontrolujte dokument na právní chyby.',
  da: 'Aktivér Advokat-tilstand i Doka for at tjekke et dokument for juridiske fejl.',
  de: 'Aktiviere in Doka den Rechtsanwalt-Modus, um ein Dokument auf rechtliche Fehler zu überprüfen.',
  el: 'Ενεργοποιήστε τη Λειτουργία Δικηγόρου στο Doka για να ελέγξετε ένα έγγραφο για νομικά σφάλματα.',
  en: 'Turn on Lawyer mode in Doka to check a document for legal errors.',
  es: 'Activa el modo Abogado en Doka para revisar un documento en busca de errores legales.',
  et: 'Aktiveeri Dokas Advokaadirežiim, et kontrollida dokumenti õiguslike vigade suhtes.',
  eu: 'Aktibatu Doka-n Abokatu modua dokumentu batean lege-akatsak egiaztatzeko.',
  fi: 'Ota Doka-sovelluksessa käyttöön Lakimies-tila tarkistaaksesi asiakirjan oikeudelliset virheet.',
  fr: "Activez le mode Avocat dans Doka pour vérifier un document à la recherche d'erreurs juridiques.",
  gl: 'Activa o modo Avogado en Doka para revisar un documento na busca de erros legais.',
  he: 'הפעל את מצב עורך דין ב-Doka כדי לבדוק מסמך לאיתור שגיאות משפטיות.',
  hi: 'किसी दस्तावेज़ में कानूनी त्रुटियों की जाँच के लिए Doka में वकील मोड सक्रिय करें।',
  hr: 'Aktivirajte način Odvjetnik u Doki da provjerite dokument na pravne pogreške.',
  hu: 'Aktiváld az Ügyvéd módot a Dokában, hogy egy dokumentumot jogi hibák szempontjából ellenőrizz.',
  hy: 'Փաստաթղթում իրավական սխալներ ստուգելու համար Doka-ում միացրեք Իրավաբանի ռեժիմը։',
  id: 'Aktifkan Mode Pengacara di Doka untuk memeriksa dokumen dari kesalahan hukum.',
  it: 'Attiva la Modalità Avvocato in Doka per controllare un documento alla ricerca di errori legali.',
  ja: 'Doka で弁護士モードをオンにして、文書の法的な誤りをチェックしましょう。',
  ka: 'დოკუმენტში სამართლებრივი შეცდომების შესამოწმებლად Doka-ში ჩართეთ ადვოკატის რეჟიმი.',
  kk: 'Құжаттағы құқықтық қателерді тексеру үшін Doka-да Адвокат режимін қосыңыз.',
  ko: '문서의 법적 오류를 확인하려면 Doka에서 변호사 모드를 켜세요.',
  lt: 'Įjunkite Doka programoje Advokato režimą, kad patikrintumėte dokumentą dėl teisinių klaidų.',
  lv: 'Aktivizē Doka lietotnē Advokāta režīmu, lai pārbaudītu dokumentu attiecībā uz juridiskām kļūdām.',
  mk: 'Активирајте го режимот Адвокат во Doka за да проверите документ за правни грешки.',
  nl: 'Activeer de Advocaat-modus in Doka om een document op juridische fouten te controleren.',
  no: 'Aktiver Advokat-modus i Doka for å sjekke et dokument for juridiske feil.',
  pl: 'Włącz tryb Prawnik w Doka, aby sprawdzić dokument pod kątem błędów prawnych.',
  pt: 'Ative o modo Advogado no Doka para verificar um documento em busca de erros jurídicos.',
  ro: 'Activează modul Avocat în Doka pentru a verifica un document pentru erori juridice.',
  ru: 'Включите в Doka режим «Юрист», чтобы проверить документ на юридические ошибки.',
  sk: 'Aktivujte v Doke režim Advokát a skontrolujte dokument na právne chyby.',
  sl: 'V aplikaciji Doka vklopite način Odvetnik, da preverite dokument glede pravnih napak.',
  sq: 'Aktivizo modalitetin Avokat në Doka për të kontrolluar një dokument për gabime ligjore.',
  sr: 'Активирајте режим Адвокат у Doki да проверите документ на правне грешке.',
  sv: 'Aktivera Advokatläge i Doka för att kontrollera ett dokument för juridiska fel.',
  sw: 'Washa Hali ya Wakili katika Doka ili kukagua hati kwa makosa ya kisheria.',
  th: 'เปิดโหมดทนายความใน Doka เพื่อตรวจสอบข้อผิดพลาดทางกฎหมายในเอกสาร',
  tl: 'I-on ang Abogado mode sa Doka para suriin ang isang dokumento para sa mga legal na pagkakamali.',
  tr: "Bir belgeyi hukuki hatalara karşı kontrol etmek için Doka'da Avukat modunu etkinleştir.",
  uk: 'Увімкніть у Doka режим «Юрист», щоб перевірити документ на юридичні помилки.',
  vi: 'Bật Chế độ Luật sư trong Doka để kiểm tra một tài liệu xem có lỗi pháp lý không.',
  zh: '在 Doka 中开启律师模式，检查文档中的法律错误。',
};

// Fallback-Titel, falls eine Sprache (unerwartet) keinen doka.lawyerInfoTitle hat.
const TITLE_FALLBACK = { de: 'Rechtsanwalt-Modus', en: 'Lawyer mode' };

let count = 0;
const missing = [];
for (const lang of Object.keys(DESC)) {
  const file = path.join(LOCALES, lang, 'translation.json');
  if (!fs.existsSync(file)) { console.error(`✗ missing locale: ${lang}`); continue; }
  const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!obj.intro) obj.intro = {};
  // Titel = bereits etablierter Begriff aus doka.lawyerInfoTitle
  const title = (obj.doka && obj.doka.lawyerInfoTitle) || TITLE_FALLBACK[lang];
  if (!title) missing.push(lang);
  obj.intro.step3Title = title || obj.intro.step3Title;
  obj.intro.step3Desc = DESC[lang];
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  count++;
}
if (missing.length) console.warn(`⚠ ohne doka.lawyerInfoTitle (Titel unverändert): ${missing.join(', ')}`);
console.log(`✓ intro.step3Title/step3Desc in ${count} Sprachen aktualisiert.`);
