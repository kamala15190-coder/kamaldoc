/**
 * Zentrale Datums-Formatierung für KamalDoc.
 *
 * Backend speichert Timestamps in UTC ohne 'Z'-Suffix (SQLite datetime('now','localtime') auf UTC-Server).
 * Ohne 'Z' interpretiert der Browser sie als Lokalzeit → falsche Anzeige.
 * Diese Helper hängen 'Z' an Timestamps mit Zeitkomponente an,
 * damit der Browser sie korrekt als UTC parst und in die lokale Zeitzone umrechnet.
 */

/**
 * Stellt sicher dass ein Timestamp als UTC interpretiert wird.
 * - Wenn bereits Timezone-Info vorhanden → unverändert
 * - Wenn Zeitkomponente vorhanden (enthält ' ' oder 'T') → 'Z' anhängen
 * - Wenn nur Datum (YYYY-MM-DD) → keine Konvertierung nötig
 */
function ensureUTC(timestamp) {
  if (!timestamp) return null;
  const ts = String(timestamp).trim();
  if (ts.endsWith('Z') || /[+-]\d{2}(:\d{2})?$/.test(ts)) return ts;
  if (ts.includes(' ') || ts.includes('T')) return ts + 'Z';
  return ts;
}

/**
 * Formatiert einen UTC-Timestamp als lokales Datum + Uhrzeit.
 * Für Backend-Felder: hochgeladen_am, created_at, updated_at, erstellt_am, erledigt_am
 */
export function formatLocalDateTime(timestamp, locale = 'de-AT') {
  if (!timestamp) return '–';
  const d = new Date(ensureUTC(timestamp));
  if (isNaN(d.getTime())) return String(timestamp);
  return d.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Formatiert einen Timestamp als lokales Datum (ohne Uhrzeit).
 * Für Backend-Felder: datum, faelligkeitsdatum, deadline, expires_at
 */
export function formatLocalDate(timestamp, locale = 'de-AT') {
  if (!timestamp) return '–';
  const d = new Date(ensureUTC(timestamp));
  if (isNaN(d.getTime())) return String(timestamp);
  return d.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Parst einen UTC-Timestamp zu einem Date-Objekt (für Vergleiche/Logik).
 */
export function parseUTC(timestamp) {
  if (!timestamp) return null;
  return new Date(ensureUTC(timestamp));
}
