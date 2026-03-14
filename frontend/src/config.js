const isNative = !!window.Capacitor?.isNativePlatform();

export const API_BASE_URL = isNative 
  ? 'https://api.schulbox.at' 
  : 'https://api.schulbox.at';