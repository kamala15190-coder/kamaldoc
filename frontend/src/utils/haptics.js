import { Capacitor } from '@capacitor/core';

// Light haptic tap on native platforms; no-op on web. Fire-and-forget so it
// never blocks or throws into the UI.
export function tapHaptic(style = 'Light') {
  if (!Capacitor.isNativePlatform()) return;
  import('@capacitor/haptics')
    .then(({ Haptics, ImpactStyle }) => {
      Haptics.impact({ style: ImpactStyle[style] || ImpactStyle.Light }).catch(() => {});
    })
    .catch(() => {});
}
