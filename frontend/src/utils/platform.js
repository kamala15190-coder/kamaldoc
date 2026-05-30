import { Capacitor } from '@capacitor/core';

// Apple Review Guideline 3.1.1: digitale Abos dürfen in der iOS-App nicht über
// einen externen Zahlungsweg (Stripe) verkauft oder dorthin gesteuert werden.
// Auf iOS blenden wir daher jede Kauf-/Upgrade-/Abo-Verwaltungs-Fläche aus.
// Stripe bleibt auf Web & Android verfügbar. Bestehende Abos (im Web gekauft)
// funktionieren weiter — die Berechtigung kommt plattformunabhängig vom Backend.
export const isIos = () => Capacitor.getPlatform() === 'ios';

// true, wenn In-App-Kauf-/Upgrade-CTAs angezeigt werden dürfen (Web + Android).
export const purchasesAllowed = () => !isIos();
