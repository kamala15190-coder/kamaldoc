export const BRAND = {
  primary: '#6359FF',
  primaryDeep: '#4E46D6',
  primaryLight: '#8C82FF',
  accent: '#F59E0B',
  bg: '#0B1022',
  bgDeep: '#05070F',
  surface: '#141A33',
  surfaceHi: '#1B2347',
  text: '#FFFFFF',
  textDim: 'rgba(255,255,255,0.72)',
  textMuted: 'rgba(255,255,255,0.48)',
  success: '#10B981',
  danger: '#EF4444',
  fontStack: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
} as const;

// Safe-zone for 9:16 (1080x1920): 150px top, 170px bottom, 60px sides
export const SAFE_REEL = { top: 150, bottom: 170, side: 60 };
// Safe-zone for 16:9 (1920x1080): 80px all around (TV-safe-ish)
export const SAFE_LANDSCAPE = { top: 80, bottom: 80, side: 120 };
