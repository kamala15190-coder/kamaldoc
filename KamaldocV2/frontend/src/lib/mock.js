// Mock data used when backend is unavailable or returns empty.
// Mirrors the Click-Prototyp content so the UI looks alive on first run.

export const mockTodayHero = {
  id: 'mock-1',
  title: 'Stadtwerke',
  subtitle: 'Strom-Rechnung',
  amount: 184.20,
  currency: 'EUR',
  due: '15. Mai · in 11 Tagen',
};

export const mockTasks = [
  {
    id: 'm-task-1',
    title: 'Stadtwerke · Strom',
    sub: 'Rechnung · € 184,20 · 15. Mai',
    color: 'amber',
    icon: 'doc',
  },
  {
    id: 'm-task-2',
    title: 'Magistrat Wien',
    sub: 'Behörde · Antwort bis 22. Mai',
    color: 'petrol',
    icon: 'home',
  },
  {
    id: 'm-task-3',
    title: 'Dr. Reiter · MRT-Befund',
    sub: 'Termin · 28. Mai, 09:30',
    color: 'rose',
    icon: 'health',
  },
];

export const mockDocs = [
  { id: 'd-1', name: 'Stadtwerke · Strom', meta: '04. Mai · Rechnung', chip: 'Rechnung', chipClass: 'amber' },
  { id: 'd-2', name: 'Magistrat Wien', meta: '02. Mai · Behörde', chip: 'Behörde', chipClass: 'petrol' },
  { id: 'd-3', name: 'Dr. Reiter MRT', meta: '01. Mai · Befund', chip: 'Befund', chipClass: 'rose' },
  { id: 'd-4', name: 'A1 · Mobilfunk', meta: '02. Mai · Rechnung', chip: 'Rechnung', chipClass: 'amber' },
  { id: 'd-5', name: 'Mietvertrag', meta: '28. April · Vertrag', chip: 'Vertrag', chipClass: 'muted' },
  { id: 'd-6', name: 'Lohnzettel · April', meta: '25. April · Lohn', chip: 'Lohn', chipClass: 'muted' },
];

export const mockStats = {
  open: 3,
  monthSum: 412,
  archived: 28,
};

export const mockSearchResults = [
  {
    kind: 'document',
    icon: 'doc',
    iconClass: 'amber',
    title: 'Stadtwerke · Strom-Rechnung',
    snippet: '… Rechnung der Stadtwerke Wien für den Zeitraum 01.01.–31.03., Betrag € 184,20 …',
    source: 'kdoc-Dokumente · 04. Mai',
    highlight: 'Stadtwerke',
  },
  {
    kind: 'task',
    icon: 'flag',
    iconClass: 'petrol',
    title: 'Lastschrift Stadtwerke Wien',
    snippet: 'SEPA-Mandat · Wien Energie · IBAN AT12 3200 …',
    source: 'Aufgaben · Wiederkehrend',
    highlight: 'Stadtwerke',
  },
  {
    kind: 'email',
    icon: 'mail',
    iconClass: 'rose',
    title: 'RE: Bestätigung Stadtwerke-Tarifwechsel',
    snippet: '… ihren Tarifwechsel zum 01. Juni bestätigen wir hiermit …',
    source: 'E-Mail · service@wienenergie.at · 28. April',
    highlight: 'Stadtwerke',
  },
];

export const mockExtractTasks = [
  {
    id: 'e-1',
    title: 'Stromrechnung bezahlen',
    sub: '€ 184,20 · Lastschrift greift automatisch',
    deadline: '15. Mai 2026',
    selected: true,
    bell: 'on',
  },
  {
    id: 'e-2',
    title: 'Zählerstand übermitteln',
    sub: 'Selbstablesung bis Quartalsende',
    deadline: '30. Juni 2026',
    selected: true,
    bell: 'off',
  },
  {
    id: 'e-3',
    title: 'Tarif-Vergleich prüfen',
    sub: 'Alternative Anbieter vergleichen',
    deadline: null,
    selected: false,
    bell: 'locked',
  },
];

export const mockDokaInitialMessages = [
  {
    id: 'mai-1',
    role: 'assistant',
    content: 'Schön, dich zu sehen. Frag mich, was du in deinen Dokumenten oder E-Mails wissen willst — oder schick mir ein Foto.',
  },
];

export const mockDokaPrompts = [
  'Welche Versicherungen habe ich?',
  'Strompreis 2026 vs. 2025?',
  'Behörden-Frist diese Woche?',
  'Letzte Rechnungen zusammenfassen',
];
