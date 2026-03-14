import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import all translation files
import de from './locales/de/translation.json';
import en from './locales/en/translation.json';
import es from './locales/es/translation.json';
import fr from './locales/fr/translation.json';
import ar from './locales/ar/translation.json';
import pt from './locales/pt/translation.json';
import tr from './locales/tr/translation.json';
import it from './locales/it/translation.json';
import pl from './locales/pl/translation.json';
import bs from './locales/bs/translation.json';
import hr from './locales/hr/translation.json';
import sr from './locales/sr/translation.json';
import cs from './locales/cs/translation.json';
import sk from './locales/sk/translation.json';
import sl from './locales/sl/translation.json';
import nl from './locales/nl/translation.json';
import ru from './locales/ru/translation.json';
import uk from './locales/uk/translation.json';
import ro from './locales/ro/translation.json';
import hu from './locales/hu/translation.json';
import bg from './locales/bg/translation.json';
import el from './locales/el/translation.json';
import sv from './locales/sv/translation.json';
import no from './locales/no/translation.json';
import da from './locales/da/translation.json';
import fi from './locales/fi/translation.json';
import hi from './locales/hi/translation.json';
import zh from './locales/zh/translation.json';
import ja from './locales/ja/translation.json';
import ko from './locales/ko/translation.json';
import id from './locales/id/translation.json';
import sw from './locales/sw/translation.json';
import vi from './locales/vi/translation.json';
import th from './locales/th/translation.json';
import tl from './locales/tl/translation.json';
import af from './locales/af/translation.json';
import ca from './locales/ca/translation.json';
import eu from './locales/eu/translation.json';
import gl from './locales/gl/translation.json';
import et from './locales/et/translation.json';
import lv from './locales/lv/translation.json';
import lt from './locales/lt/translation.json';
import mk from './locales/mk/translation.json';
import sq from './locales/sq/translation.json';
import be from './locales/be/translation.json';
import kk from './locales/kk/translation.json';
import az from './locales/az/translation.json';
import ka from './locales/ka/translation.json';
import hy from './locales/hy/translation.json';
import he from './locales/he/translation.json';

const resources = {
  de: { translation: de },
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  ar: { translation: ar },
  pt: { translation: pt },
  tr: { translation: tr },
  it: { translation: it },
  pl: { translation: pl },
  bs: { translation: bs },
  hr: { translation: hr },
  sr: { translation: sr },
  cs: { translation: cs },
  sk: { translation: sk },
  sl: { translation: sl },
  nl: { translation: nl },
  ru: { translation: ru },
  uk: { translation: uk },
  ro: { translation: ro },
  hu: { translation: hu },
  bg: { translation: bg },
  el: { translation: el },
  sv: { translation: sv },
  no: { translation: no },
  da: { translation: da },
  fi: { translation: fi },
  hi: { translation: hi },
  zh: { translation: zh },
  ja: { translation: ja },
  ko: { translation: ko },
  id: { translation: id },
  sw: { translation: sw },
  vi: { translation: vi },
  th: { translation: th },
  tl: { translation: tl },
  af: { translation: af },
  ca: { translation: ca },
  eu: { translation: eu },
  gl: { translation: gl },
  et: { translation: et },
  lv: { translation: lv },
  lt: { translation: lt },
  mk: { translation: mk },
  sq: { translation: sq },
  be: { translation: be },
  kk: { translation: kk },
  az: { translation: az },
  ka: { translation: ka },
  hy: { translation: hy },
  he: { translation: he },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'de',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'kamaldoc_language',
    },
  });

export default i18n;
