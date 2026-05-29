import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, 'src', 'locales');

// New keys per language (profile.* and pricing.*)
const translations = {
  af: {
    profile: {
      reactivate: "Heraktiveer intekening",
      reactivateSuccess: "Intekening heraktiveer!",
      reactivateFailed: "Heraktivering het misluk",
      pendingDowngrade: "Jou plan verander op {{date}} na {{plan}}.",
    },
    pricing: {
      managePlan: "Bestuur plan",
      downgradeConfirm: "Wil jy na {{plan}} afwaarts? Jou huidige plan bly aktief tot die einde van die faktureringstydperk.",
      downgradeSuccess: "Afwaartse verandering beplan. Jou huidige plan bly aktief tot dit verval.",
      downgradeFailed: "Afwaartse verandering het misluk",
    },
  },
  ar: {
    profile: {
      reactivate: "إعادة تفعيل الاشتراك",
      reactivateSuccess: "تم إعادة تفعيل الاشتراك!",
      reactivateFailed: "فشل إعادة التفعيل",
      pendingDowngrade: "سيتم تغيير خطتك إلى {{plan}} في {{date}}.",
    },
    pricing: {
      managePlan: "إدارة الخطة",
      downgradeConfirm: "هل تريد الرجوع إلى {{plan}}؟ ستبقى خطتك الحالية نشطة حتى نهاية فترة الفوترة.",
      downgradeSuccess: "تم جدولة الرجوع. ستبقى خطتك الحالية نشطة حتى انتهاء صلاحيتها.",
      downgradeFailed: "فشل الرجوع",
    },
  },
  az: {
    profile: {
      reactivate: "Abunəliyi yenidən aktivləşdir",
      reactivateSuccess: "Abunəlik yenidən aktivləşdirildi!",
      reactivateFailed: "Yenidən aktivləşdirmə uğursuz oldu",
      pendingDowngrade: "Planınız {{date}} tarixində {{plan}} olaraq dəyişdiriləcək.",
    },
    pricing: {
      managePlan: "Planı idarə et",
      downgradeConfirm: "{{plan}} planına endirmək istəyirsiniz? Cari planınız faktura dövrünün sonuna qədər aktiv qalacaq.",
      downgradeSuccess: "Endirmə planlaşdırıldı. Cari planınız müddəti bitənə qədər aktiv qalacaq.",
      downgradeFailed: "Endirmə uğursuz oldu",
    },
  },
  be: {
    profile: {
      reactivate: "Аднавіць падпіску",
      reactivateSuccess: "Падпіска адноўлена!",
      reactivateFailed: "Не ўдалося аднавіць",
      pendingDowngrade: "Ваш план будзе зменены на {{plan}} {{date}}.",
    },
    pricing: {
      managePlan: "Кіраванне планам",
      downgradeConfirm: "Вы хочаце перайсці на {{plan}}? Ваш бягучы план застанецца актыўным да канца перыяду.",
      downgradeSuccess: "Зніжэнне запланавана. Ваш бягучы план застанецца актыўным да заканчэння тэрміну.",
      downgradeFailed: "Зніжэнне не ўдалося",
    },
  },
  bg: {
    profile: {
      reactivate: "Реактивиране на абонамент",
      reactivateSuccess: "Абонаментът е реактивиран!",
      reactivateFailed: "Реактивирането не успя",
      pendingDowngrade: "Планът ви ще бъде променен на {{plan}} на {{date}}.",
    },
    pricing: {
      managePlan: "Управление на плана",
      downgradeConfirm: "Искате ли да преминете на {{plan}}? Текущият ви план остава активен до края на периода.",
      downgradeSuccess: "Понижаването е планирано. Текущият ви план остава активен до изтичането му.",
      downgradeFailed: "Понижаването не успя",
    },
  },
  bs: {
    profile: {
      reactivate: "Reaktiviraj pretplatu",
      reactivateSuccess: "Pretplata reaktivirana!",
      reactivateFailed: "Reaktivacija nije uspjela",
      pendingDowngrade: "Vaš plan će biti promijenjen u {{plan}} dana {{date}}.",
    },
    pricing: {
      managePlan: "Upravljanje planom",
      downgradeConfirm: "Želite li preći na {{plan}}? Vaš trenutni plan ostaje aktivan do kraja obračunskog perioda.",
      downgradeSuccess: "Sniženje planirano. Vaš trenutni plan ostaje aktivan do isteka.",
      downgradeFailed: "Sniženje nije uspjelo",
    },
  },
  ca: {
    profile: {
      reactivate: "Reactivar subscripció",
      reactivateSuccess: "Subscripció reactivada!",
      reactivateFailed: "Error en la reactivació",
      pendingDowngrade: "El teu pla canviarà a {{plan}} el {{date}}.",
    },
    pricing: {
      managePlan: "Gestionar pla",
      downgradeConfirm: "Vols baixar a {{plan}}? El teu pla actual seguirà actiu fins al final del període de facturació.",
      downgradeSuccess: "Baixada programada. El teu pla actual seguirà actiu fins que expiri.",
      downgradeFailed: "Error en la baixada",
    },
  },
  cs: {
    profile: {
      reactivate: "Reaktivovat předplatné",
      reactivateSuccess: "Předplatné reaktivováno!",
      reactivateFailed: "Reaktivace se nezdařila",
      pendingDowngrade: "Váš plán bude změněn na {{plan}} dne {{date}}.",
    },
    pricing: {
      managePlan: "Spravovat plán",
      downgradeConfirm: "Chcete přejít na {{plan}}? Váš aktuální plán zůstane aktivní do konce fakturačního období.",
      downgradeSuccess: "Snížení naplánováno. Váš aktuální plán zůstane aktivní do vypršení.",
      downgradeFailed: "Snížení se nezdařilo",
    },
  },
  da: {
    profile: {
      reactivate: "Genaktiver abonnement",
      reactivateSuccess: "Abonnement genaktiveret!",
      reactivateFailed: "Genaktivering mislykkedes",
      pendingDowngrade: "Din plan ændres til {{plan}} den {{date}}.",
    },
    pricing: {
      managePlan: "Administrer plan",
      downgradeConfirm: "Vil du nedgradere til {{plan}}? Din nuværende plan forbliver aktiv til slutningen af faktureringsperioden.",
      downgradeSuccess: "Nedgradering planlagt. Din nuværende plan forbliver aktiv til udløb.",
      downgradeFailed: "Nedgradering mislykkedes",
    },
  },
  el: {
    profile: {
      reactivate: "Επανενεργοποίηση συνδρομής",
      reactivateSuccess: "Η συνδρομή επανενεργοποιήθηκε!",
      reactivateFailed: "Η επανενεργοποίηση απέτυχε",
      pendingDowngrade: "Το πλάνο σας θα αλλάξει σε {{plan}} στις {{date}}.",
    },
    pricing: {
      managePlan: "Διαχείριση πλάνου",
      downgradeConfirm: "Θέλετε να υποβαθμίσετε σε {{plan}}; Το τρέχον πλάνο σας παραμένει ενεργό μέχρι το τέλος της περιόδου τιμολόγησης.",
      downgradeSuccess: "Η υποβάθμιση προγραμματίστηκε. Το τρέχον πλάνο σας παραμένει ενεργό μέχρι τη λήξη.",
      downgradeFailed: "Η υποβάθμιση απέτυχε",
    },
  },
  es: {
    profile: {
      reactivate: "Reactivar suscripción",
      reactivateSuccess: "¡Suscripción reactivada!",
      reactivateFailed: "Error al reactivar",
      pendingDowngrade: "Tu plan cambiará a {{plan}} el {{date}}.",
    },
    pricing: {
      managePlan: "Gestionar plan",
      downgradeConfirm: "¿Quieres bajar a {{plan}}? Tu plan actual permanecerá activo hasta el final del período de facturación.",
      downgradeSuccess: "Cambio programado. Tu plan actual permanecerá activo hasta su vencimiento.",
      downgradeFailed: "Error al cambiar de plan",
    },
  },
  et: {
    profile: {
      reactivate: "Taasaktiveeri tellimus",
      reactivateSuccess: "Tellimus taasaktiveeritud!",
      reactivateFailed: "Taasaktiveerimine ebaõnnestus",
      pendingDowngrade: "Sinu plaan muudetakse {{plan}} plaaniks kuupäeval {{date}}.",
    },
    pricing: {
      managePlan: "Halda plaani",
      downgradeConfirm: "Kas soovid minna üle {{plan}} plaanile? Sinu praegune plaan jääb aktiivseks arveldusperioodi lõpuni.",
      downgradeSuccess: "Alandamine planeeritud. Sinu praegune plaan jääb aktiivseks kuni aegumiseni.",
      downgradeFailed: "Alandamine ebaõnnestus",
    },
  },
  eu: {
    profile: {
      reactivate: "Harpidetza berraktibatu",
      reactivateSuccess: "Harpidetza berraktibatuta!",
      reactivateFailed: "Berraktibazioak huts egin du",
      pendingDowngrade: "Zure plana {{plan}} izatera aldatuko da {{date}}(e)an.",
    },
    pricing: {
      managePlan: "Plana kudeatu",
      downgradeConfirm: "{{plan}} planera jaitsi nahi duzu? Zure uneko plana aktibo jarraituko du fakturazio-aldiaren amaiera arte.",
      downgradeSuccess: "Jaitsiera programatuta. Zure uneko plana aktibo jarraituko du iraungitzen den arte.",
      downgradeFailed: "Jaitsierak huts egin du",
    },
  },
  fi: {
    profile: {
      reactivate: "Aktivoi tilaus uudelleen",
      reactivateSuccess: "Tilaus aktivoitu uudelleen!",
      reactivateFailed: "Uudelleenaktivointi epäonnistui",
      pendingDowngrade: "Suunnitelmasi muutetaan {{plan}} -suunnitelmaksi {{date}}.",
    },
    pricing: {
      managePlan: "Hallinnoi suunnitelmaa",
      downgradeConfirm: "Haluatko vaihtaa {{plan}} -suunnitelmaan? Nykyinen suunnitelmasi pysyy aktiivisena laskutuskauden loppuun.",
      downgradeSuccess: "Alennus suunniteltu. Nykyinen suunnitelmasi pysyy aktiivisena vanhenemiseen asti.",
      downgradeFailed: "Alennus epäonnistui",
    },
  },
  fr: {
    profile: {
      reactivate: "Réactiver l'abonnement",
      reactivateSuccess: "Abonnement réactivé !",
      reactivateFailed: "Échec de la réactivation",
      pendingDowngrade: "Votre plan sera changé en {{plan}} le {{date}}.",
    },
    pricing: {
      managePlan: "Gérer le plan",
      downgradeConfirm: "Voulez-vous passer au plan {{plan}} ? Votre plan actuel reste actif jusqu'à la fin de la période de facturation.",
      downgradeSuccess: "Rétrogradation planifiée. Votre plan actuel reste actif jusqu'à son expiration.",
      downgradeFailed: "Échec de la rétrogradation",
    },
  },
  gl: {
    profile: {
      reactivate: "Reactivar subscrición",
      reactivateSuccess: "Subscrición reactivada!",
      reactivateFailed: "Erro na reactivación",
      pendingDowngrade: "O teu plan cambiará a {{plan}} o {{date}}.",
    },
    pricing: {
      managePlan: "Xestionar plan",
      downgradeConfirm: "Queres baixar a {{plan}}? O teu plan actual seguirá activo ata o final do período de facturación.",
      downgradeSuccess: "Baixada programada. O teu plan actual seguirá activo ata que expire.",
      downgradeFailed: "Erro na baixada",
    },
  },
  he: {
    profile: {
      reactivate: "הפעלה מחדש של מנוי",
      reactivateSuccess: "המנוי הופעל מחדש!",
      reactivateFailed: "ההפעלה מחדש נכשלה",
      pendingDowngrade: "התוכנית שלך תשתנה ל-{{plan}} בתאריך {{date}}.",
    },
    pricing: {
      managePlan: "ניהול תוכנית",
      downgradeConfirm: "האם ברצונך לעבור ל-{{plan}}? התוכנית הנוכחית שלך תישאר פעילה עד סוף תקופת החיוב.",
      downgradeSuccess: "הורדת דרגה תוכננה. התוכנית הנוכחית שלך תישאר פעילה עד לפקיעתה.",
      downgradeFailed: "הורדת הדרגה נכשלה",
    },
  },
  hi: {
    profile: {
      reactivate: "सदस्यता पुनः सक्रिय करें",
      reactivateSuccess: "सदस्यता पुनः सक्रिय हो गई!",
      reactivateFailed: "पुनः सक्रियण विफल",
      pendingDowngrade: "आपकी योजना {{date}} को {{plan}} में बदल जाएगी।",
    },
    pricing: {
      managePlan: "योजना प्रबंधित करें",
      downgradeConfirm: "क्या आप {{plan}} में डाउनग्रेड करना चाहते हैं? आपकी वर्तमान योजना बिलिंग अवधि के अंत तक सक्रिय रहेगी।",
      downgradeSuccess: "डाउनग्रेड निर्धारित। आपकी वर्तमान योजना समाप्ति तक सक्रिय रहेगी।",
      downgradeFailed: "डाउनग्रेड विफल",
    },
  },
  hr: {
    profile: {
      reactivate: "Reaktiviraj pretplatu",
      reactivateSuccess: "Pretplata reaktivirana!",
      reactivateFailed: "Reaktivacija nije uspjela",
      pendingDowngrade: "Vaš plan će se promijeniti u {{plan}} dana {{date}}.",
    },
    pricing: {
      managePlan: "Upravljanje planom",
      downgradeConfirm: "Želite li preći na {{plan}}? Vaš trenutni plan ostaje aktivan do kraja obračunskog razdoblja.",
      downgradeSuccess: "Sniženje planirano. Vaš trenutni plan ostaje aktivan do isteka.",
      downgradeFailed: "Sniženje nije uspjelo",
    },
  },
  hu: {
    profile: {
      reactivate: "Előfizetés újraaktiválása",
      reactivateSuccess: "Előfizetés újraaktiválva!",
      reactivateFailed: "Újraaktiválás sikertelen",
      pendingDowngrade: "A csomagod {{date}}-án/én {{plan}} csomagra változik.",
    },
    pricing: {
      managePlan: "Csomag kezelése",
      downgradeConfirm: "Szeretnél {{plan}} csomagra váltani? A jelenlegi csomagod a számlázási időszak végéig aktív marad.",
      downgradeSuccess: "Visszalépés ütemezve. A jelenlegi csomagod a lejáratig aktív marad.",
      downgradeFailed: "Visszalépés sikertelen",
    },
  },
  hy: {
    profile: {
      reactivate: "Վերdelays բաdelays բdelays",
      reactivateSuccess: "Բdelays delays delays!",
      reactivateFailed: "Վdelays delays",
      pendingDowngrade: "Ձdelays delays delays {{plan}} {{date}}:",
    },
    pricing: {
      managePlan: "Կdelays delays",
      downgradeConfirm: "delays delays {{plan}}delays? delays delays delays delays delays:",
      downgradeSuccess: "delays delays delays:",
      downgradeFailed: "delays delays",
    },
  },
  id: {
    profile: {
      reactivate: "Aktifkan kembali langganan",
      reactivateSuccess: "Langganan diaktifkan kembali!",
      reactivateFailed: "Gagal mengaktifkan kembali",
      pendingDowngrade: "Paket Anda akan berubah ke {{plan}} pada {{date}}.",
    },
    pricing: {
      managePlan: "Kelola paket",
      downgradeConfirm: "Apakah Anda ingin turun ke {{plan}}? Paket Anda saat ini tetap aktif hingga akhir periode penagihan.",
      downgradeSuccess: "Penurunan dijadwalkan. Paket Anda saat ini tetap aktif hingga kedaluwarsa.",
      downgradeFailed: "Penurunan gagal",
    },
  },
  it: {
    profile: {
      reactivate: "Riattiva abbonamento",
      reactivateSuccess: "Abbonamento riattivato!",
      reactivateFailed: "Riattivazione fallita",
      pendingDowngrade: "Il tuo piano cambierà in {{plan}} il {{date}}.",
    },
    pricing: {
      managePlan: "Gestisci piano",
      downgradeConfirm: "Vuoi passare a {{plan}}? Il tuo piano attuale resta attivo fino alla fine del periodo di fatturazione.",
      downgradeSuccess: "Downgrade programmato. Il tuo piano attuale resta attivo fino alla scadenza.",
      downgradeFailed: "Downgrade fallito",
    },
  },
  ja: {
    profile: {
      reactivate: "サブスクリプションを再開",
      reactivateSuccess: "サブスクリプションが再開されました！",
      reactivateFailed: "再開に失敗しました",
      pendingDowngrade: "プランは{{date}}に{{plan}}に変更されます。",
    },
    pricing: {
      managePlan: "プランを管理",
      downgradeConfirm: "{{plan}}にダウングレードしますか？現在のプランは請求期間の終了まで有効です。",
      downgradeSuccess: "ダウングレードが予定されました。現在のプランは期限まで有効です。",
      downgradeFailed: "ダウングレードに失敗しました",
    },
  },
  ka: {
    profile: {
      reactivate: "გამოწერის ხელახალი გააქტიურება",
      reactivateSuccess: "გამოწერა ხელახლა გააქტიურდა!",
      reactivateFailed: "ხელახალი გააქტიურება ვერ მოხერხდა",
      pendingDowngrade: "თქვენი გეგმა შეიცვლება {{plan}}-ზე {{date}}-ს.",
    },
    pricing: {
      managePlan: "გეგმის მართვა",
      downgradeConfirm: "გსურთ {{plan}}-ზე გადასვლა? თქვენი მიმდინარე გეგმა აქტიური დარჩება ბილინგის პერიოდის ბოლომდე.",
      downgradeSuccess: "შემცირება დაგეგმილია. თქვენი მიმდინარე გეგმა აქტიური დარჩება ვადის გასვლამდე.",
      downgradeFailed: "შემცირება ვერ მოხერხდა",
    },
  },
  kk: {
    profile: {
      reactivate: "Жазылымды қайта белсендіру",
      reactivateSuccess: "Жазылым қайта белсендірілді!",
      reactivateFailed: "Қайта белсендіру сәтсіз аяқталды",
      pendingDowngrade: "Сіздің жоспарыңыз {{date}} күні {{plan}} жоспарына өзгертіледі.",
    },
    pricing: {
      managePlan: "Жоспарды басқару",
      downgradeConfirm: "{{plan}} жоспарына төмендеткіңіз келе ме? Ағымдағы жоспарыңыз есеп кезеңінің соңына дейін белсенді болады.",
      downgradeSuccess: "Төмендету жоспарланды. Ағымдағы жоспарыңыз мерзімі аяқталғанша белсенді болады.",
      downgradeFailed: "Төмендету сәтсіз аяқталды",
    },
  },
  ko: {
    profile: {
      reactivate: "구독 재활성화",
      reactivateSuccess: "구독이 재활성화되었습니다!",
      reactivateFailed: "재활성화 실패",
      pendingDowngrade: "{{date}}에 플랜이 {{plan}}으로 변경됩니다.",
    },
    pricing: {
      managePlan: "플랜 관리",
      downgradeConfirm: "{{plan}}으로 다운그레이드하시겠습니까? 현재 플랜은 청구 기간 종료까지 활성 상태로 유지됩니다.",
      downgradeSuccess: "다운그레이드가 예약되었습니다. 현재 플랜은 만료까지 활성 상태로 유지됩니다.",
      downgradeFailed: "다운그레이드 실패",
    },
  },
  lt: {
    profile: {
      reactivate: "Iš naujo aktyvinti prenumeratą",
      reactivateSuccess: "Prenumerata iš naujo aktyvinta!",
      reactivateFailed: "Pakartotinis aktyvinimas nepavyko",
      pendingDowngrade: "Jūsų planas bus pakeistas į {{plan}} {{date}}.",
    },
    pricing: {
      managePlan: "Tvarkyti planą",
      downgradeConfirm: "Ar norite pereiti prie {{plan}}? Jūsų dabartinis planas liks aktyvus iki atsiskaitymo laikotarpio pabaigos.",
      downgradeSuccess: "Sumažinimas suplanuotas. Jūsų dabartinis planas liks aktyvus iki pasibaigimo.",
      downgradeFailed: "Sumažinimas nepavyko",
    },
  },
  lv: {
    profile: {
      reactivate: "Atkārtoti aktivizēt abonementu",
      reactivateSuccess: "Abonements atkārtoti aktivizēts!",
      reactivateFailed: "Atkārtota aktivizēšana neizdevās",
      pendingDowngrade: "Jūsu plāns tiks mainīts uz {{plan}} {{date}}.",
    },
    pricing: {
      managePlan: "Pārvaldīt plānu",
      downgradeConfirm: "Vai vēlaties pāriet uz {{plan}}? Jūsu pašreizējais plāns paliks aktīvs līdz norēķinu perioda beigām.",
      downgradeSuccess: "Pazemināšana ieplānota. Jūsu pašreizējais plāns paliks aktīvs līdz derīguma termiņa beigām.",
      downgradeFailed: "Pazemināšana neizdevās",
    },
  },
  mk: {
    profile: {
      reactivate: "Реактивирај претплата",
      reactivateSuccess: "Претплатата е реактивирана!",
      reactivateFailed: "Реактивирањето не успеа",
      pendingDowngrade: "Вашиот план ќе се промени во {{plan}} на {{date}}.",
    },
    pricing: {
      managePlan: "Управувај со план",
      downgradeConfirm: "Дали сакате да преминете на {{plan}}? Вашиот тековен план останува активен до крајот на периодот на наплата.",
      downgradeSuccess: "Намалувањето е планирано. Вашиот тековен план останува активен до истекот.",
      downgradeFailed: "Намалувањето не успеа",
    },
  },
  nl: {
    profile: {
      reactivate: "Abonnement heractiveren",
      reactivateSuccess: "Abonnement geheractiveerd!",
      reactivateFailed: "Heractivering mislukt",
      pendingDowngrade: "Je plan wordt op {{date}} gewijzigd naar {{plan}}.",
    },
    pricing: {
      managePlan: "Plan beheren",
      downgradeConfirm: "Wil je downgraden naar {{plan}}? Je huidige plan blijft actief tot het einde van de factureringsperiode.",
      downgradeSuccess: "Downgrade gepland. Je huidige plan blijft actief tot het verloopt.",
      downgradeFailed: "Downgrade mislukt",
    },
  },
  no: {
    profile: {
      reactivate: "Reaktiver abonnement",
      reactivateSuccess: "Abonnement reaktivert!",
      reactivateFailed: "Reaktivering mislyktes",
      pendingDowngrade: "Planen din endres til {{plan}} den {{date}}.",
    },
    pricing: {
      managePlan: "Administrer plan",
      downgradeConfirm: "Vil du nedgradere til {{plan}}? Din nåværende plan forblir aktiv til slutten av faktureringsperioden.",
      downgradeSuccess: "Nedgradering planlagt. Din nåværende plan forblir aktiv til utløp.",
      downgradeFailed: "Nedgradering mislyktes",
    },
  },
  pl: {
    profile: {
      reactivate: "Reaktywuj subskrypcję",
      reactivateSuccess: "Subskrypcja reaktywowana!",
      reactivateFailed: "Reaktywacja nie powiodła się",
      pendingDowngrade: "Twój plan zostanie zmieniony na {{plan}} w dniu {{date}}.",
    },
    pricing: {
      managePlan: "Zarządzaj planem",
      downgradeConfirm: "Czy chcesz przejść na {{plan}}? Twój obecny plan pozostanie aktywny do końca okresu rozliczeniowego.",
      downgradeSuccess: "Obniżenie zaplanowane. Twój obecny plan pozostanie aktywny do wygaśnięcia.",
      downgradeFailed: "Obniżenie nie powiodło się",
    },
  },
  pt: {
    profile: {
      reactivate: "Reativar assinatura",
      reactivateSuccess: "Assinatura reativada!",
      reactivateFailed: "Falha na reativação",
      pendingDowngrade: "Seu plano será alterado para {{plan}} em {{date}}.",
    },
    pricing: {
      managePlan: "Gerenciar plano",
      downgradeConfirm: "Deseja fazer downgrade para {{plan}}? Seu plano atual permanecerá ativo até o final do período de cobrança.",
      downgradeSuccess: "Downgrade agendado. Seu plano atual permanecerá ativo até o vencimento.",
      downgradeFailed: "Falha no downgrade",
    },
  },
  ro: {
    profile: {
      reactivate: "Reactivează abonamentul",
      reactivateSuccess: "Abonament reactivat!",
      reactivateFailed: "Reactivarea a eșuat",
      pendingDowngrade: "Planul tău va fi schimbat în {{plan}} pe {{date}}.",
    },
    pricing: {
      managePlan: "Gestionează planul",
      downgradeConfirm: "Dorești să treci la {{plan}}? Planul tău actual rămâne activ până la sfârșitul perioadei de facturare.",
      downgradeSuccess: "Retrogradare programată. Planul tău actual rămâne activ până la expirare.",
      downgradeFailed: "Retrogradarea a eșuat",
    },
  },
  ru: {
    profile: {
      reactivate: "Возобновить подписку",
      reactivateSuccess: "Подписка возобновлена!",
      reactivateFailed: "Ошибка возобновления",
      pendingDowngrade: "Ваш план будет изменён на {{plan}} {{date}}.",
    },
    pricing: {
      managePlan: "Управление планом",
      downgradeConfirm: "Вы хотите перейти на {{plan}}? Ваш текущий план останется активным до конца расчётного периода.",
      downgradeSuccess: "Понижение запланировано. Ваш текущий план останется активным до истечения срока.",
      downgradeFailed: "Ошибка понижения плана",
    },
  },
  sk: {
    profile: {
      reactivate: "Reaktivovať predplatné",
      reactivateSuccess: "Predplatné reaktivované!",
      reactivateFailed: "Reaktivácia zlyhala",
      pendingDowngrade: "Váš plán bude zmenený na {{plan}} dňa {{date}}.",
    },
    pricing: {
      managePlan: "Spravovať plán",
      downgradeConfirm: "Chcete prejsť na {{plan}}? Váš aktuálny plán zostane aktívny do konca fakturačného obdobia.",
      downgradeSuccess: "Zníženie naplánované. Váš aktuálny plán zostane aktívny do vypršania.",
      downgradeFailed: "Zníženie zlyhalo",
    },
  },
  sl: {
    profile: {
      reactivate: "Ponovno aktiviraj naročnino",
      reactivateSuccess: "Naročnina ponovno aktivirana!",
      reactivateFailed: "Ponovna aktivacija ni uspela",
      pendingDowngrade: "Vaš načrt se bo spremenil v {{plan}} dne {{date}}.",
    },
    pricing: {
      managePlan: "Upravljaj načrt",
      downgradeConfirm: "Ali želite preiti na {{plan}}? Vaš trenutni načrt ostane aktiven do konca obračunskega obdobja.",
      downgradeSuccess: "Znižanje načrtovano. Vaš trenutni načrt ostane aktiven do poteka.",
      downgradeFailed: "Znižanje ni uspelo",
    },
  },
  sq: {
    profile: {
      reactivate: "Riaktivizo abonimin",
      reactivateSuccess: "Abonimi u riaktivizua!",
      reactivateFailed: "Riaktivizimi dështoi",
      pendingDowngrade: "Plani juaj do të ndryshohet në {{plan}} më {{date}}.",
    },
    pricing: {
      managePlan: "Menaxho planin",
      downgradeConfirm: "Dëshironi të kaloni në {{plan}}? Plani juaj aktual mbetet aktiv deri në fund të periudhës së faturimit.",
      downgradeSuccess: "Ulja e planifikuar. Plani juaj aktual mbetet aktiv deri në skadim.",
      downgradeFailed: "Ulja dështoi",
    },
  },
  sr: {
    profile: {
      reactivate: "Реактивирај претплату",
      reactivateSuccess: "Претплата реактивирана!",
      reactivateFailed: "Реактивација није успела",
      pendingDowngrade: "Ваш план ће бити промењен у {{plan}} дана {{date}}.",
    },
    pricing: {
      managePlan: "Управљај планом",
      downgradeConfirm: "Да ли желите да пређете на {{plan}}? Ваш тренутни план остаје активан до краја обрачунског периода.",
      downgradeSuccess: "Снижење планирано. Ваш тренутни план остаје активан до истека.",
      downgradeFailed: "Снижење није успело",
    },
  },
  sv: {
    profile: {
      reactivate: "Återaktivera prenumeration",
      reactivateSuccess: "Prenumeration återaktiverad!",
      reactivateFailed: "Återaktivering misslyckades",
      pendingDowngrade: "Din plan ändras till {{plan}} den {{date}}.",
    },
    pricing: {
      managePlan: "Hantera plan",
      downgradeConfirm: "Vill du nedgradera till {{plan}}? Din nuvarande plan förblir aktiv till slutet av faktureringsperioden.",
      downgradeSuccess: "Nedgradering schemalagd. Din nuvarande plan förblir aktiv tills den löper ut.",
      downgradeFailed: "Nedgradering misslyckades",
    },
  },
  sw: {
    profile: {
      reactivate: "Amilisha tena usajili",
      reactivateSuccess: "Usajili umeamilishwa tena!",
      reactivateFailed: "Kuamilisha tena kumeshindwa",
      pendingDowngrade: "Mpango wako utabadilishwa kuwa {{plan}} tarehe {{date}}.",
    },
    pricing: {
      managePlan: "Simamia mpango",
      downgradeConfirm: "Je, unataka kushuka hadi {{plan}}? Mpango wako wa sasa utabaki hai hadi mwisho wa kipindi cha malipo.",
      downgradeSuccess: "Kushuka kumepangwa. Mpango wako wa sasa utabaki hai hadi kumalizika.",
      downgradeFailed: "Kushuka kumeshindwa",
    },
  },
  th: {
    profile: {
      reactivate: "เปิดใช้งานการสมัครสมาชิกอีกครั้ง",
      reactivateSuccess: "เปิดใช้งานการสมัครสมาชิกอีกครั้งแล้ว!",
      reactivateFailed: "การเปิดใช้งานอีกครั้งล้มเหลว",
      pendingDowngrade: "แผนของคุณจะเปลี่ยนเป็น {{plan}} ในวันที่ {{date}}",
    },
    pricing: {
      managePlan: "จัดการแผน",
      downgradeConfirm: "คุณต้องการดาวน์เกรดเป็น {{plan}} หรือไม่? แผนปัจจุบันของคุณจะยังคงใช้งานได้จนถึงสิ้นสุดรอบการเรียกเก็บเงิน",
      downgradeSuccess: "กำหนดการดาวน์เกรดแล้ว แผนปัจจุบันของคุณจะยังคงใช้งานได้จนกว่าจะหมดอายุ",
      downgradeFailed: "การดาวน์เกรดล้มเหลว",
    },
  },
  tl: {
    profile: {
      reactivate: "I-reactivate ang subscription",
      reactivateSuccess: "Na-reactivate ang subscription!",
      reactivateFailed: "Nabigong i-reactivate",
      pendingDowngrade: "Ang iyong plan ay babaguhin sa {{plan}} sa {{date}}.",
    },
    pricing: {
      managePlan: "Pamahalaan ang plan",
      downgradeConfirm: "Gusto mo bang mag-downgrade sa {{plan}}? Ang iyong kasalukuyang plan ay mananatiling aktibo hanggang sa katapusan ng billing period.",
      downgradeSuccess: "Naka-schedule ang downgrade. Ang iyong kasalukuyang plan ay mananatiling aktibo hanggang mag-expire.",
      downgradeFailed: "Nabigong mag-downgrade",
    },
  },
  tr: {
    profile: {
      reactivate: "Aboneliği yeniden etkinleştir",
      reactivateSuccess: "Abonelik yeniden etkinleştirildi!",
      reactivateFailed: "Yeniden etkinleştirme başarısız",
      pendingDowngrade: "Planınız {{date}} tarihinde {{plan}} olarak değişecek.",
    },
    pricing: {
      managePlan: "Planı yönet",
      downgradeConfirm: "{{plan}} planına geçmek istiyor musunuz? Mevcut planınız fatura döneminin sonuna kadar aktif kalacaktır.",
      downgradeSuccess: "Düşürme planlandı. Mevcut planınız sona erene kadar aktif kalacaktır.",
      downgradeFailed: "Düşürme başarısız",
    },
  },
  uk: {
    profile: {
      reactivate: "Поновити підписку",
      reactivateSuccess: "Підписку поновлено!",
      reactivateFailed: "Помилка поновлення",
      pendingDowngrade: "Ваш план буде змінено на {{plan}} {{date}}.",
    },
    pricing: {
      managePlan: "Керувати планом",
      downgradeConfirm: "Бажаєте перейти на {{plan}}? Ваш поточний план залишиться активним до кінця розрахункового періоду.",
      downgradeSuccess: "Зниження заплановано. Ваш поточний план залишиться активним до закінчення терміну.",
      downgradeFailed: "Помилка зниження плану",
    },
  },
  vi: {
    profile: {
      reactivate: "Kích hoạt lại đăng ký",
      reactivateSuccess: "Đăng ký đã được kích hoạt lại!",
      reactivateFailed: "Kích hoạt lại thất bại",
      pendingDowngrade: "Gói của bạn sẽ được đổi thành {{plan}} vào {{date}}.",
    },
    pricing: {
      managePlan: "Quản lý gói",
      downgradeConfirm: "Bạn có muốn hạ xuống {{plan}} không? Gói hiện tại của bạn sẽ vẫn hoạt động cho đến cuối kỳ thanh toán.",
      downgradeSuccess: "Đã lên lịch hạ cấp. Gói hiện tại của bạn sẽ vẫn hoạt động cho đến khi hết hạn.",
      downgradeFailed: "Hạ cấp thất bại",
    },
  },
  zh: {
    profile: {
      reactivate: "重新激活订阅",
      reactivateSuccess: "订阅已重新激活！",
      reactivateFailed: "重新激活失败",
      pendingDowngrade: "您的计划将于 {{date}} 更改为 {{plan}}。",
    },
    pricing: {
      managePlan: "管理计划",
      downgradeConfirm: "您要降级到 {{plan}} 吗？您当前的计划将在计费周期结束前保持有效。",
      downgradeSuccess: "降级已计划。您当前的计划将在到期前保持有效。",
      downgradeFailed: "降级失败",
    },
  },
};

// Armenian - proper translations via unicode
translations.hy = {
  profile: {
    reactivate: "\u054E\u0565\u0580\u0561\u056F\u057F\u056B\u057E\u0561\u0581\u0576\u0565\u056C \u0562\u0561\u056A\u0561\u0576\u0578\u0580\u0564\u0561\u0563\u0580\u0578\u0582\u0569\u0575\u0578\u0582\u0576\u0568",
    reactivateSuccess: "\u0532\u0561\u056A\u0561\u0576\u0578\u0580\u0564\u0561\u0563\u0580\u0578\u0582\u0569\u0575\u0578\u0582\u0576\u0568 \u057E\u0565\u0580\u0561\u056F\u057F\u056B\u057E\u0561\u0581\u057E\u0565\u056C \u0567!",
    reactivateFailed: "\u054E\u0565\u0580\u0561\u056F\u057F\u056B\u057E\u0561\u0581\u0578\u0582\u0574\u0568 \u0571\u0561\u056D\u0578\u0572\u057E\u0565\u0581",
    pendingDowngrade: "\u0541\u0565\u0580 \u057A\u056C\u0561\u0576\u0568 \u056F\u0583\u0578\u056D\u057E\u056B {{plan}}-\u056B {{date}}-\u056B\u0576.",
  },
  pricing: {
    managePlan: "\u053F\u0561\u057C\u0561\u057E\u0561\u0580\u0565\u056C \u057A\u056C\u0561\u0576\u0568",
    downgradeConfirm: "\u0551\u0561\u0576\u056F\u0561\u0576\u0578\u0582\u0574 \u0565\u0584 \u056B\u057B\u0576\u0565\u056C {{plan}}-\u056B\u0576? \u0541\u0565\u0580 \u0568\u0576\u0569\u0561\u0581\u056B\u056F \u057A\u056C\u0561\u0576\u0568 \u056F\u0574\u0576\u0561 \u0561\u056F\u057F\u056B\u057E \u0570\u0561\u0577\u057E\u0561\u0580\u056F\u0574\u0561\u0576 \u056A\u0561\u0574\u056F\u0565\u057F\u056B \u057E\u0565\u0580\u057B\u0568.",
    downgradeSuccess: "\u054B\u057B\u0565\u0581\u0578\u0582\u0574\u0568 \u057A\u056C\u0561\u0576\u0561\u057E\u0578\u0580\u057E\u0561\u056E \u0567. \u0541\u0565\u0580 \u0568\u0576\u0569\u0561\u0581\u056B\u056F \u057A\u056C\u0561\u0576\u0568 \u056F\u0574\u0576\u0561 \u0561\u056F\u057F\u056B\u057E \u0574\u056B\u0576\u0579\u0587 \u056A\u0561\u0574\u056F\u0565\u057F\u056B \u0561\u057E\u0561\u0580\u057F\u0568.",
    downgradeFailed: "\u054B\u057B\u0565\u0581\u0578\u0582\u0574\u0568 \u0571\u0561\u056D\u0578\u0572\u057E\u0565\u0581",
  },
};

const skipLangs = ['de', 'en'];

let updated = 0;
let skipped = 0;

for (const [lang, newKeys] of Object.entries(translations)) {
  if (skipLangs.includes(lang)) continue;

  const filePath = path.join(localesDir, lang, 'translation.json');
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP: ${lang} - file not found`);
    skipped++;
    continue;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let changed = false;

  for (const [section, keys] of Object.entries(newKeys)) {
    if (!data[section]) data[section] = {};
    for (const [key, value] of Object.entries(keys)) {
      if (!data[section][key]) {
        data[section][key] = value;
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    console.log(`UPDATED: ${lang}`);
    updated++;
  } else {
    console.log(`NO CHANGE: ${lang}`);
    skipped++;
  }
}

console.log(`\nDone! Updated: ${updated}, Skipped/No change: ${skipped}`);
