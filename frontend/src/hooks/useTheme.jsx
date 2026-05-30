/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Capacitor } from '@capacitor/core';

const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('kamaldoc_theme');
    if (saved) return saved;
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kamaldoc_theme', theme);

    if (Capacitor.isNativePlatform()) {
      import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
        if (theme === 'dark') {
          StatusBar.setBackgroundColor({ color: '#0E0F12' }).catch(() => {});
          StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        } else {
          StatusBar.setBackgroundColor({ color: '#F4F1EA' }).catch(() => {});
          StatusBar.setStyle({ style: Style.Light }).catch(() => {});
        }
      }).catch(() => {});
    }
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const saved = localStorage.getItem('kamaldoc_theme');
    if (saved) return; // user made manual choice
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Spectacular theme switch: a circular reveal of the new theme expanding from
  // the toggle's position, via the View Transitions API. Falls back to an instant
  // switch when the API is unavailable or the user prefers reduced motion.
  const toggleTheme = (origin) => {
    const next = theme === 'dark' ? 'light' : 'dark';
    const reduce = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (typeof document === 'undefined' || typeof document.startViewTransition !== 'function' || reduce) {
      setTheme(next);
      return;
    }

    const doc = document.documentElement;
    const x = origin?.x ?? window.innerWidth / 2;
    const y = origin?.y ?? 24;
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    doc.style.setProperty('--vt-x', `${x}px`);
    doc.style.setProperty('--vt-y', `${y}px`);
    doc.style.setProperty('--vt-r', `${r}px`);
    doc.classList.add('theme-morphing');

    const transition = document.startViewTransition(() => flushSync(() => setTheme(next)));
    transition.finished.finally(() => doc.classList.remove('theme-morphing'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
