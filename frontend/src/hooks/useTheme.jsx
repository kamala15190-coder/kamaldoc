import { createContext, useContext, useState, useEffect } from 'react';
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
          StatusBar.setBackgroundColor({ color: '#0a0f1a' }).catch(() => {});
          StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        } else {
          StatusBar.setBackgroundColor({ color: '#f2f2f7' }).catch(() => {});
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

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
