import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Camera, FileText, CheckCircle, Loader2, AlertCircle, X, ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { uploadDocuments } from '../api';
import { usePlanLimit } from '../hooks/usePlanLimit';
import { openNativeScanner, openNativeGallery } from '../utils/documentScannerHelper';
import { fileToDataUrl } from '../utils/pdfBuilder';
import Confetti from '../components/Confetti';

function useIsMobile() {
  return useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
  }, []);
}

// status: 'pending' | 'uploading' | 'done' | 'error'
function FileStatusRow({ entry, index, total }) {
  const icon = entry.status === 'done'
    ? <CheckCircle style={{ width: 16, height: 16, color: 'var(--success)', flexShrink: 0 }} />
    : entry.status === 'error'
      ? <AlertCircle style={{ width: 16, height: 16, color: 'var(--danger)', flexShrink: 0 }} />
      : entry.status === 'uploading'
        ? <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.25)', borderTopColor: 'var(--accent-solid)', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
        : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--border-glass-strong)', flexShrink: 0 }} />;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px', borderRadius: 10,
      background: entry.status === 'done'
        ? 'var(--success-soft)'
        : entry.status === 'error'
          ? 'rgba(239,68,68,0.08)'
          : 'var(--bg-glass)',
      border: `1px solid ${entry.status === 'done' ? 'rgba(16,185,129,0.2)' : entry.status === 'error' ? 'rgba(239,68,68,0.2)' : 'var(--border-glass)'}`,
    }}>
      {icon}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {index + 1}/{total}: {entry.file.name}
        </div>
        {entry.status === 'error' && (
          <div style={{ fontSize: 11, color: 'var(--danger-text)', marginTop: 2 }}>{entry.error}</div>
        )}
        {entry.status === 'uploading' && (
          <div style={{ fontSize: 11, color: 'var(--accent-solid)', marginTop: 2 }}>Wird hochgeladen…</div>
        )}
        {entry.status === 'pending' && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Wartend…</div>
        )}
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
        {(entry.file.size / 1024).toFixed(0)} KB
      </span>
    </div>
  );
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

export default function UploadPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const isMobile = useIsMobile();
  const { handleApiError } = usePlanLimit();

  const [dragOver, setDragOver] = useState(false);
  // fileEntries: Array<{ file, status, docId, error }>
  const [fileEntries, setFileEntries] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null); // Allgemeiner Fehler (kein Plan, etc.)
  const [celebrate, setCelebrate] = useState(false);

  const allDone = fileEntries.length > 0 && fileEntries.every(e => e.status === 'done' || e.status === 'error');
  const successCount = fileEntries.filter(e => e.status === 'done').length;

  useEffect(() => {
    if (allDone && successCount > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 1100);
      return () => clearTimeout(t);
    }
  }, [allDone, successCount]);

  // Single-file auto-redirect
  useEffect(() => {
    if (allDone && fileEntries.length === 1 && fileEntries[0].status === 'done' && fileEntries[0].docId) {
      const timer = setTimeout(() => navigate(`/documents/${fileEntries[0].docId}`), 1500);
      return () => clearTimeout(timer);
    }
  }, [allDone, fileEntries, navigate]);

  const addFiles = useCallback((newFiles) => {
    const valid = Array.from(newFiles).filter(f => ALLOWED_TYPES.includes(f.type));
    if (valid.length === 0) {
      setUploadError(t('upload.onlyAllowed'));
      return;
    }
    setUploadError(null);
    setFileEntries(prev => [
      ...prev,
      ...valid.map(file => ({ file, status: 'pending', docId: null, error: null })),
    ]);
  }, [t]);

  const handleUpload = async () => {
    if (uploading || fileEntries.length === 0) return;
    const pending = fileEntries.filter(e => e.status === 'pending');
    if (pending.length === 0) return;

    setUploading(true);
    setUploadError(null);

    // Mark all pending as uploading as they go
    const results = await uploadDocuments(
      pending.map(e => e.file),
      'standard',
      (idx, _total, _filename, status) => {
        if (status !== 'uploading') return;
        const file = pending[idx]?.file;
        if (!file) return;
        setFileEntries(prev => prev.map(e =>
          e.file === file ? { ...e, status: 'uploading' } : e
        ));
      }
    );

    // Apply results
    setFileEntries(prev => {
      const updated = [...prev];
      results.forEach((res, i) => {
        const idx = updated.findIndex(e => e.file === pending[i].file);
        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            status: res.success ? 'done' : 'error',
            docId: res.id ?? null,
            error: res.error ?? null,
          };
        }
        // Check if this is a plan limit error
        if (!res.success && res.raw) {
          handleApiError(res.raw);
        }
      });
      return updated;
    });

    setUploading(false);
  };

  const handleReset = () => {
    setFileEntries([]);
    setUploadError(null);
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e) => {
    if (e.target.files?.length) addFiles(e.target.files);
    setTimeout(() => { if (e.target) e.target.value = ''; }, 100);
  };

  const openCamera = async () => {
    if (Capacitor.isNativePlatform()) {
      const result = await openNativeScanner();
      if (result?.pages?.length) {
        navigate('/scan', {
          state: {
            initialPages: result.pages.map(dataUrl => ({ type: 'image', dataUrl })),
            source: 'camera',
          },
        });
      }
      return;
    }
    if (isMobile) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const dataUrl = await fileToDataUrl(file);
          navigate('/scan', { state: { initialPages: [{ type: 'image', dataUrl }], source: 'camera' } });
        }
      };
      input.click();
      return;
    }
    const el = fileInputRef.current;
    if (el) { el.value = ''; el.click(); }
  };

  const openGallery = async () => {
    if (Capacitor.isNativePlatform()) {
      const result = await openNativeGallery();
      if (result?.images?.length) {
        navigate('/scan', {
          state: {
            initialPages: result.images.map(dataUrl => ({ type: 'image', dataUrl })),
            source: 'gallery',
          },
        });
      }
      return;
    }
    navigate('/scan', { state: { openGallery: true } });
  };

  const openFileDialog = () => {
    const el = fileInputRef.current;
    if (el) { el.value = ''; el.click(); }
  };

  return (
    <div>
      <h1 data-intro="upload" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }} className="animate-fade-in">
        {t('upload.title')}
      </h1>

      {/* Dateiliste wenn Dateien ausgewählt */}
      {fileEntries.length > 0 && (
        <div className="glass-card animate-scale-in" style={{ padding: 20, border: '1px solid rgba(16,185,129,0.25)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {fileEntries.map((entry, i) => (
              <FileStatusRow key={`${entry.file.name}-${i}`} entry={entry} index={i} total={fileEntries.length} />
            ))}
          </div>

          {/* Ergebnis-Zusammenfassung */}
          {allDone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'var(--success-soft)', border: '1px solid rgba(16,185,129,0.15)', marginBottom: 12 }}>
              <CheckCircle style={{ width: 16, height: 16, color: 'var(--success)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success-text)' }}>
                {successCount}/{fileEntries.length} Dateien erfolgreich hochgeladen
              </span>
            </div>
          )}

          {/* Allgemeiner Fehler */}
          {uploadError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <AlertCircle style={{ width: 16, height: 16, color: 'var(--danger)' }} />
              <span style={{ fontSize: 13, color: 'var(--danger-text)' }}>{uploadError}</span>
            </div>
          )}

          {/* Buttons */}
          {!uploading && !allDone && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleUpload}
                className="btn-accent"
                style={{ width: '100%', padding: '14px 0', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Upload style={{ width: 18, height: 18 }} />
                {fileEntries.length === 1 ? t('upload.uploadButton') : `${fileEntries.length} Dateien hochladen`}
              </button>
              <button onClick={openFileDialog} className="btn-ghost" style={{ width: '100%', padding: '12px 0', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <FileText style={{ width: 16, height: 16 }} /> Weitere Dateien hinzufügen
              </button>
              <button onClick={handleReset} className="btn-ghost" style={{ width: '100%', padding: '12px 0', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <X style={{ width: 16, height: 16 }} /> {t('upload.cancel')}
              </button>
            </div>
          )}

          {uploading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.2)', borderTopColor: 'var(--accent-solid)', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-solid)' }}>{t('upload.uploading')}</span>
            </div>
          )}

          {allDone && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              {fileEntries.length === 1 && fileEntries[0].status === 'done' && (
                <button onClick={() => navigate(`/documents/${fileEntries[0].docId}`)} className="btn-accent" style={{ width: '100%', padding: '14px 0', fontSize: 15, fontWeight: 600 }}>
                  Dokument ansehen
                </button>
              )}
              {fileEntries.length > 1 && successCount > 0 && (
                <button onClick={() => navigate('/documents')} className="btn-accent" style={{ width: '100%', padding: '14px 0', fontSize: 15, fontWeight: 600 }}>
                  Alle Dokumente ansehen
                </button>
              )}
              <button onClick={handleReset} className="btn-ghost" style={{ width: '100%', padding: '12px 0', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Upload style={{ width: 16, height: 16 }} /> Weitere Dateien hochladen
              </button>
            </div>
          )}
        </div>
      )}

      {/* Auswahl-UI — nur wenn noch keine Dateien ausgewählt */}
      {fileEntries.length === 0 && (
        <>
          {/* Desktop: Drag & Drop */}
          {!isMobile && (
            <div
              style={{
                border: '2px dashed',
                borderColor: dragOver ? 'var(--accent-solid)' : 'var(--border-glass-strong)',
                borderRadius: 18, padding: 48, textAlign: 'center',
                background: dragOver ? 'var(--accent-soft)' : 'var(--bg-glass)',
                cursor: 'pointer', transition: 'all 0.25s ease',
              }}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={openFileDialog}
            >
              <Upload style={{ width: 40, height: 40, margin: '0 auto 16px', color: dragOver ? 'var(--accent-solid)' : 'var(--text-muted)' }} />
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                {t('upload.dragDrop')}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                {t('upload.fileTypes')} · Mehrere Dateien möglich
              </p>
            </div>
          )}

          {/* Mobile: Hero-Canvas mit Kamera-Primary + Trio-Row */}
          {isMobile && (
            <div className="animate-fade-in-up">
              <div className="upload-hero">
                <button
                  onClick={openCamera}
                  className="upload-hero-btn"
                  aria-label={t('upload.camera')}
                >
                  <Camera style={{ width: 40, height: 40 }} />
                </button>
                <div className="upload-hero-label">{t('upload.camera', 'Dokument scannen')}</div>
                <div className="upload-hero-sub">{t('upload.heroSub', 'Brief fotografieren oder mehrseitige Dokumente direkt scannen')}</div>
              </div>

              <div className="upload-divider">{t('upload.or', 'oder')}</div>

              <div className="upload-trio">
                <button onClick={openGallery} className="upload-trio-btn" aria-label={t('upload.gallery')}>
                  <ImageIcon style={{ width: 22, height: 22, color: 'var(--accent-solid)' }} />
                  {t('upload.gallery', 'Galerie')}
                </button>
                <button onClick={openFileDialog} className="upload-trio-btn" aria-label={t('upload.document', 'Datei')}>
                  <FileText style={{ width: 22, height: 22, color: 'var(--accent-solid)' }} />
                  {t('upload.document', 'Datei')}
                </button>
                <button onClick={openFileDialog} className="upload-trio-btn" aria-label="PDF">
                  <Upload style={{ width: 22, height: 22, color: 'var(--accent-solid)' }} />
                  PDF
                </button>
              </div>
            </div>
          )}

          {/* Desktop: Kamera-Button unter Drag&Drop */}
          {!isMobile && (
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 10 }}>
              <button onClick={openCamera} className="btn-ghost" style={{ padding: '10px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Camera style={{ width: 16, height: 16 }} /> {t('upload.cameraButton')}
              </button>
              <button onClick={openGallery} className="btn-ghost" style={{ padding: '10px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ImageIcon style={{ width: 16, height: 16 }} /> {t('upload.galleryButton')}
              </button>
            </div>
          )}

          {uploadError && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <AlertCircle style={{ width: 16, height: 16, color: 'var(--danger)' }} />
              <span style={{ fontSize: 13, color: 'var(--danger-text)' }}>{uploadError}</span>
            </div>
          )}
        </>
      )}

      {/* Hidden file input — multiple Dateien erlaubt */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
        style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
        tabIndex={-1}
        onChange={handleFileInput}
      />
      <Confetti show={celebrate} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
