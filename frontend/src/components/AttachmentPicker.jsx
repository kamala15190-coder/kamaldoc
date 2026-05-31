import { useCallback, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, Image as ImageIcon, FileUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { tapHaptic } from '../utils/haptics';

/**
 * Universelle Büroklammer-Auswahl.
 * ----------------------------------------------------------------------------
 * Jede Büroklammer in der App nutzt diesen Hook: beim Antippen öffnet sich ein
 * Action-Sheet mit GENAU drei Optionen — Foto aufnehmen · aus Galerie wählen ·
 * Datei hochladen. Liefert immer ein `File` an `onFile`.
 *
 *   const { openPicker, picker } = useAttachmentPicker({ onFile: setFile });
 *   <button onClick={openPicker}><Paperclip/></button>
 *   {picker}
 *
 * Nativ (iOS/Android): Capacitor Camera (Kamera bzw. Fotomediathek) → File.
 * Web: <input type="file"> — Kamera-Option mit `capture` für mobile Browser.
 */
const DEFAULT_ACCEPT = 'image/*,application/pdf';

function dataUrlToFile(dataUrl, filename) {
  const [head, b64] = dataUrl.split(',');
  const mime = (head.match(/:(.*?);/) || [])[1] || 'image/jpeg';
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
  return new File([u8], filename, { type: mime });
}

export function useAttachmentPicker({ onFile, fileAccept = DEFAULT_ACCEPT } = {}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const isNative = Capacitor.isNativePlatform();

  const openPicker = useCallback(() => { tapHaptic(); setOpen(true); }, []);
  const close = useCallback(() => setOpen(false), []);
  const emit = useCallback((file) => { if (file) onFile?.(file); }, [onFile]);

  const nativeCapture = useCallback(async (source) => {
    setBusy(true);
    try {
      const { Camera: CapCamera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await CapCamera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
        quality: 90,
        correctOrientation: true,
      });
      if (photo?.dataUrl) emit(dataUrlToFile(photo.dataUrl, `foto-${Date.now()}.${photo.format || 'jpeg'}`));
    } catch { /* abgebrochen / Berechtigung verweigert → still ignorieren */ }
    finally { setBusy(false); setOpen(false); }
  }, [emit]);

  const handleCamera = useCallback(() => {
    if (isNative) { nativeCapture('camera'); return; }
    setOpen(false); cameraInputRef.current?.click();
  }, [isNative, nativeCapture]);

  const handleGallery = useCallback(() => {
    if (isNative) { nativeCapture('gallery'); return; }
    setOpen(false); galleryInputRef.current?.click();
  }, [isNative, nativeCapture]);

  const handleFile = useCallback(() => { setOpen(false); fileInputRef.current?.click(); }, []);

  const onInput = useCallback((e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) emit(f);
  }, [emit]);

  const options = [
    { key: 'camera', Icon: Camera, label: t('attach.takePhoto', { defaultValue: 'Foto aufnehmen' }), onClick: handleCamera },
    { key: 'gallery', Icon: ImageIcon, label: t('attach.fromGallery', { defaultValue: 'Aus Galerie wählen' }), onClick: handleGallery },
    { key: 'file', Icon: FileUp, label: t('attach.uploadFile', { defaultValue: 'Datei hochladen' }), onClick: handleFile },
  ];

  const picker = (
    <>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onInput} />
      <input ref={galleryInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onInput} />
      <input ref={fileInputRef} type="file" accept={fileAccept} style={{ display: 'none' }} onChange={onInput} />

      {open && (
        <div
          role="dialog" aria-modal="true" aria-label={t('attach.title', { defaultValue: 'Anhang hinzufügen' })}
          onClick={close}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
            padding: '0 8px calc(8px + var(--safe-area-bottom, 0px))',
            animation: 'fadeIn 150ms ease',
          }}
        >
          <div className="attach-sheet" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, margin: '0 auto' }}>
            {/* Optionen-Gruppe */}
            <div style={{
              background: 'var(--surface-elevated, var(--bg-card))', borderRadius: 18,
              border: '1px solid var(--border-glass)', overflow: 'hidden',
              boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
            }}>
              <div style={{ padding: '13px 18px 11px', textAlign: 'center', borderBottom: '1px solid var(--border-glass)' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
                  {t('attach.title', { defaultValue: 'Anhang hinzufügen' })}
                </span>
              </div>
              {options.map((o, i) => (
                <button
                  key={o.key} onClick={o.onClick} disabled={busy}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 13, width: '100%',
                    padding: '13px 18px', cursor: busy ? 'default' : 'pointer', textAlign: 'start',
                    background: 'transparent', border: 'none',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border-glass)',
                    color: 'var(--text-primary)', opacity: busy ? 0.55 : 1,
                  }}
                >
                  <span style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--amber-soft)', border: '1px solid var(--accent-soft-border)',
                  }}>
                    <o.Icon style={{ width: 17, height: 17, color: 'var(--amber)' }} />
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{o.label}</span>
                </button>
              ))}
            </div>

            {/* Abbrechen — eigener Block (iOS-Action-Sheet-Konvention) */}
            <button
              onClick={close}
              style={{
                width: '100%', marginTop: 8, padding: '14px 18px', borderRadius: 18,
                background: 'var(--surface-elevated, var(--bg-card))', border: '1px solid var(--border-glass)',
                color: 'var(--text-primary)', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
              }}
            >
              {t('attach.cancel', { defaultValue: 'Abbrechen' })}
            </button>
          </div>
        </div>
      )}
    </>
  );

  return { openPicker, picker, open, busy };
}
