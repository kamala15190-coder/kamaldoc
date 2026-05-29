/**
 * storage.js – zentrale localStorage-Abstraktion mit Namespace,
 * Safari-Private-Mode-Fallback und optionalem JSON-Wrap.
 *
 * Nutzung:
 *   import { storage } from '@/lib/storage';
 *   storage.set('theme', 'dark');
 *   const theme = storage.get('theme', 'system');
 */

const NAMESPACE = 'kamaldoc:';
const memoryFallback = new Map();

function safeAvailable() {
  try {
    const key = '__kamaldoc_probe__';
    window.localStorage.setItem(key, '1');
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

const available = typeof window !== 'undefined' && safeAvailable();
const backend = available ? window.localStorage : null;

function fullKey(key) {
  return `${NAMESPACE}${key}`;
}

function read(key) {
  if (backend) return backend.getItem(fullKey(key));
  return memoryFallback.has(fullKey(key)) ? memoryFallback.get(fullKey(key)) : null;
}

function write(key, value) {
  if (backend) {
    try { backend.setItem(fullKey(key), value); return true; }
    catch { /* quota / disabled */ }
  }
  memoryFallback.set(fullKey(key), value);
  return false;
}

export const storage = {
  get(key, fallback = null) {
    const raw = read(key);
    if (raw == null) return fallback;
    // Nur parsen, wenn offensichtlich JSON (sonst Plain-String durchreichen)
    if (raw.length > 0 && (raw[0] === '{' || raw[0] === '[' || raw === 'true' || raw === 'false' || raw === 'null' || !isNaN(Number(raw)))) {
      try { return JSON.parse(raw); } catch { /* fallthrough */ }
    }
    return raw;
  },
  set(key, value) {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    return write(key, serialized);
  },
  remove(key) {
    if (backend) { try { backend.removeItem(fullKey(key)); } catch { /* noop */ } }
    memoryFallback.delete(fullKey(key));
  },
  has(key) {
    return read(key) != null;
  },
  available,
};

export default storage;
