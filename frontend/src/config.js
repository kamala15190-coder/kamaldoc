const isNative = !!window.Capacitor?.isNativePlatform();

export const API_BASE_URL = isNative ? 'http://100.77.198.89:8000' : '';
