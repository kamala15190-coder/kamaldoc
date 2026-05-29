import { useEffect, useRef } from 'react';

/**
 * usePolling – wiederholt eine async-Funktion in einem Intervall, solange
 * `enabled` true ist. Räumt beim Unmount sauber auf und bricht laufende
 * Fetches via AbortController ab, wenn der Hook gestoppt wird.
 *
 * Der Caller entscheidet per `isDone(result)` selbst, wann gepollt werden
 * darf. So landet kein setState auf unmounted Components, und lange
 * LLM-Operationen können sauber abgebrochen werden.
 *
 * Optionen:
 *   intervalMs   – Wartezeit zwischen zwei Aufrufen (default 3000ms)
 *   maxAttempts  – max. Anzahl Versuche, 0 = unbegrenzt (default 0)
 *   backoff      – Multiplikator pro Fehl-Versuch (default 1 = kein Backoff)
 *   maxIntervalMs – Obergrenze für das Intervall (default 30000ms)
 *   isDone       – (result) => boolean: true stoppt das Polling
 *   onResult     – (result) => void nach jedem erfolgreichen Call
 *   onError      – (err) => void bei Fehler (AbortError wird ignoriert)
 */
export function usePolling(fn, { enabled = true, intervalMs = 3000, maxAttempts = 0, backoff = 1, maxIntervalMs = 30000, isDone, onResult, onError } = {}) {
  const fnRef = useRef(fn);
  const isDoneRef = useRef(isDone);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    fnRef.current = fn;
    isDoneRef.current = isDone;
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    const controller = new AbortController();
    let timeoutId = null;
    let attempts = 0;
    let currentInterval = intervalMs;

    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const result = await fnRef.current({ signal: controller.signal });
        if (cancelled) return;
        onResultRef.current?.(result);
        if (isDoneRef.current?.(result)) return;
      } catch (err) {
        if (cancelled || err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') return;
        onErrorRef.current?.(err);
        currentInterval = Math.min(currentInterval * backoff, maxIntervalMs);
      }
      if (maxAttempts > 0 && attempts >= maxAttempts) return;
      if (cancelled) return;
      timeoutId = setTimeout(tick, currentInterval);
    };

    timeoutId = setTimeout(tick, currentInterval);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      controller.abort();
    };
  }, [enabled, intervalMs, maxAttempts, backoff, maxIntervalMs]);
}
