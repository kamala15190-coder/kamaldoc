import { useMemo } from 'react';
import { Camera, Image as ImageIcon, FileUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Präsentations-Komponente des Anhang-Action-Sheets (iOS-Stil) mit den drei
 * Optionen Foto · Galerie · Dokument. Logik/State liefert `useAttachmentPicker`
 * (src/components/AttachmentPicker.jsx) — diese Komponente ist aber auch
 * eigenständig (kontrolliert über `isOpen`) nutzbar.
 *
 * `allowedTypes`: 'all' (Default) · 'images' (Kamera+Galerie) · 'documents' (nur Dokument)
 */
export default function AttachmentActionSheet({
  isOpen,
  busy = false,
  allowedTypes = 'all',
  onClose,
  onCamera,
  onGallery,
  onDocument,
}) {
  const { t } = useTranslation();

  const options = useMemo(() => {
    const all = [
      { key: 'camera', Icon: Camera, label: t('attach.takePhoto', { defaultValue: 'Foto aufnehmen' }), onClick: onCamera, show: allowedTypes !== 'documents' },
      { key: 'gallery', Icon: ImageIcon, label: t('attach.fromGallery', { defaultValue: 'Aus Galerie wählen' }), onClick: onGallery, show: allowedTypes !== 'documents' },
      { key: 'file', Icon: FileUp, label: t('attach.uploadFile', { defaultValue: 'Dokument hochladen' }), onClick: onDocument, show: allowedTypes !== 'images' },
    ];
    return all.filter((o) => o.show);
  }, [t, allowedTypes, onCamera, onGallery, onDocument]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog" aria-modal="true" aria-label={t('attach.title', { defaultValue: 'Anhang hinzufügen' })}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        padding: '0 8px calc(8px + var(--safe-area-bottom, 0px))',
        animation: 'fadeIn 150ms ease',
      }}
    >
      <div className="attach-sheet" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, margin: '0 auto' }}>
        <div style={{
          background: 'var(--surface-elevated, var(--bg-card))', borderRadius: 18,
          border: '1px solid var(--border-glass)', overflow: 'hidden',
          boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
        }}>
          <div style={{ padding: '13px 18px 11px', textAlign: 'center', borderBottom: '1px solid var(--border-glass)' }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
              {busy
                ? t('attach.loading', { defaultValue: 'Wird geladen …' })
                : t('attach.title', { defaultValue: 'Anhang hinzufügen' })}
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
          onClick={onClose}
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
  );
}
