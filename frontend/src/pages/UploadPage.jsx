import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Camera, FileText, CheckCircle, Loader2, AlertCircle, X, ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { uploadDocument } from '../api';
import { usePlanLimit } from '../hooks/usePlanLimit';

function useIsMobile() {
  return useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
  }, []);
}

export default function UploadPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const isMobile = useIsMobile();
  const { handleApiError } = usePlanLimit();

  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadDone, setUploadDone] = useState(false);
  const [uploadDocId, setUploadDocId] = useState(null);

  // Zentrale Datei-Verarbeitung
  const selectFile = useCallback((file) => {
    if (!file) return;
    console.log('[KamalDoc Upload] Datei ausgewählt', {
      name: file.name,
      size: file.size,
      type: file.type,
    });
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setUploadError(t('upload.onlyAllowed'));
      return;
    }
    setSelectedFile(file);
    setUploadError(null);
    setUploadDone(false);
    setUploadDocId(null);
  }, []);

  // Native change Event Handler — zuverlässiger als React onChange auf Mobile
  const handleNativeChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      selectFile(file);
    }
    // Input zurücksetzen damit dieselbe Datei erneut wählbar ist
    // Wichtig: Verzögert, damit der Browser die Datei erst verarbeiten kann
    setTimeout(() => { if (e.target) e.target.value = ''; }, 100);
  }, [selectFile]);

  // Native Event Listener auf alle drei Input-Elemente registrieren
  // Dies ist der Kernfix: addEventListener('change') feuert auf Android
  // zuverlässiger als Reacts synthetisches onChange Event
  useEffect(() => {
    const refs = [cameraInputRef, galleryInputRef, fileInputRef];
    const cleanups = [];

    refs.forEach(ref => {
      const el = ref.current;
      if (el) {
        el.addEventListener('change', handleNativeChange);
        cleanups.push(() => el.removeEventListener('change', handleNativeChange));
      }
    });

    return () => cleanups.forEach(fn => fn());
  }, [handleNativeChange]);

  // Preview generieren wenn Datei ausgewählt
  useEffect(() => {
    if (!selectedFile) { setPreview(null); return; }
    if (selectedFile.type === 'application/pdf') {
      setPreview('pdf');
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  // Auto-Redirect nach Upload
  useEffect(() => {
    if (uploadDone && uploadDocId) {
      const timer = setTimeout(() => navigate(`/documents/${uploadDocId}`), 1500);
      return () => clearTimeout(timer);
    }
  }, [uploadDone, uploadDocId, navigate]);

  const handleUpload = async () => {
    if (!selectedFile || uploading) return;

    console.log('[KamalDoc Upload] Upload gestartet', {
      name: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type,
    });

    setUploading(true);
    setUploadError(null);
    try {
      const result = await uploadDocument(selectedFile);
      console.log('[KamalDoc Upload] Upload erfolgreich', { id: result.id });
      setUploadDone(true);
      setUploadDocId(result.id);
    } catch (err) {
      if (handleApiError(err)) return;
      const msg = err.response?.data?.detail || err.message || 'Upload fehlgeschlagen';
      console.error('[KamalDoc Upload] Upload Fehler', msg, err);
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setUploadError(null);
    setUploadDone(false);
    setUploadDocId(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) selectFile(file);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  // Capacitor Camera: DataUrl → File object
  const dataUrlToFile = (dataUrl, filename) => {
    const [header, base64] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    return new File([array], filename, { type: mime });
  };

  // Kamera öffnen — Capacitor native auf Mobile, HTML fallback auf Web
  const openCamera = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Camera: CapCamera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const photo = await CapCamera.getPhoto({
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          quality: 90,
        });
        if (photo.dataUrl) {
          const file = dataUrlToFile(photo.dataUrl, `photo_${Date.now()}.jpg`);
          selectFile(file);
        }
      } catch (err) {
        console.error('[KamalDoc] Camera error:', err);
      }
    } else {
      const el = cameraInputRef.current;
      if (el) { el.value = ''; el.click(); }
    }
  };

  const openGallery = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Camera: CapCamera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const photo = await CapCamera.getPhoto({
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
          quality: 90,
        });
        if (photo.dataUrl) {
          const file = dataUrlToFile(photo.dataUrl, `gallery_${Date.now()}.jpg`);
          selectFile(file);
        }
      } catch (err) {
        console.error('[KamalDoc] Gallery error:', err);
      }
    } else {
      const el = galleryInputRef.current;
      if (el) { el.value = ''; el.click(); }
    }
  };

  const openFileDialog = () => {
    const el = fileInputRef.current;
    if (el) {
      el.value = '';
      el.click();
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }} className="animate-fade-in">
        {t('upload.title')}
      </h1>

      {/* Vorschau wenn Datei ausgewählt */}
      {selectedFile && (
        <div className="glass-card animate-scale-in" style={{ padding: 20, border: '1px solid rgba(16,185,129,0.25)' }}>
          {/* Visuelles Feedback */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
            padding: '10px 14px', borderRadius: 10,
            background: 'var(--success-soft)', border: '1px solid rgba(16,185,129,0.15)',
          }}>
            <CheckCircle style={{ width: 16, height: 16, color: 'var(--success)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t('upload.fileSelected', { name: selectedFile.name })}
            </span>
            <span style={{ fontSize: 11, color: 'var(--success-text)', flexShrink: 0 }}>({(selectedFile.size / 1024).toFixed(0)} KB)</span>
          </div>

          {/* Preview */}
          <div style={{
            width: '100%', aspectRatio: '1', maxWidth: 280, margin: '0 auto 16px',
            borderRadius: 14, overflow: 'hidden',
            background: 'rgba(255,255,255,0.03)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--border-glass)',
          }}>
            {preview === 'pdf' ? (
              <FileText style={{ width: 48, height: 48, color: 'var(--text-muted)', opacity: 0.5 }} />
            ) : preview ? (
              <img src={preview} alt="Vorschau" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <ImageIcon style={{ width: 48, height: 48, color: 'var(--text-muted)', opacity: 0.3 }} />
            )}
          </div>

          {/* Upload-Fortschritt */}
          {uploading && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: '2px solid rgba(139,92,246,0.2)',
                  borderTopColor: 'var(--accent-solid)',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-solid)' }}>{t('upload.uploading')}</span>
              </div>
              <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'var(--bg-glass)', overflow: 'hidden' }}>
                <div style={{
                  width: '70%', height: '100%', borderRadius: 2,
                  background: 'var(--accent-gradient)',
                  animation: 'shimmer 1.5s ease-in-out infinite',
                  backgroundSize: '200% 100%',
                }} />
              </div>
            </div>
          )}

          {/* Erfolg */}
          {uploadDone && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <CheckCircle style={{ width: 18, height: 18, color: 'var(--success)' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--success-text)' }}>{t('upload.uploadSuccess')}</span>
            </div>
          )}

          {/* Fehler */}
          {uploadError && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <AlertCircle style={{ width: 16, height: 16, color: 'var(--danger)' }} />
              <span style={{ fontSize: 13, color: 'var(--danger-text)' }}>{uploadError}</span>
            </div>
          )}

          {/* Buttons */}
          {!uploading && !uploadDone && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              <button
                onClick={handleUpload}
                disabled={!selectedFile}
                className="btn-accent"
                style={{
                  width: '100%', padding: '14px 0', fontSize: 15, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: !selectedFile ? 0.5 : 1,
                }}
              >
                <Upload style={{ width: 18, height: 18 }} /> {t('upload.uploadButton')}
              </button>
              <button
                onClick={handleReset}
                className="btn-ghost"
                style={{
                  width: '100%', padding: '12px 0', fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <X style={{ width: 16, height: 16 }} /> {t('upload.cancel')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Auswahl-UI — nur wenn noch keine Datei ausgewählt */}
      {!selectedFile && (
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
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={openFileDialog}
            >
              <Upload style={{ width: 40, height: 40, margin: '0 auto 16px', color: dragOver ? 'var(--accent-solid)' : 'var(--text-muted)' }} />
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                {t('upload.dragDrop')}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                {t('upload.fileTypes')}
              </p>
            </div>
          )}

          {/* Mobile: Große Buttons */}
          {isMobile && (
            <div className="animate-fade-in-up">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button
                  onClick={openCamera}
                  className="btn-accent camera-glass-btn"
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 8, padding: 20, borderRadius: 16, minHeight: 100,
                    fontSize: 14, fontWeight: 600,
                  }}
                >
                  <Camera style={{ width: 28, height: 28 }} />
                  {t('upload.camera')}
                </button>
                <button
                  onClick={openGallery}
                  className="glass-card"
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 8, padding: 20, minHeight: 100,
                    fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
                    cursor: 'pointer', border: '1px solid var(--border-glass-strong)',
                  }}
                >
                  <ImageIcon style={{ width: 28, height: 28, color: 'var(--text-secondary)' }} />
                  {t('upload.gallery')}
                </button>
              </div>

              {/* File button below */}
              <button
                onClick={openFileDialog}
                className="btn-ghost"
                style={{
                  width: '100%', marginTop: 12, padding: '14px 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontSize: 14, fontWeight: 500,
                }}
              >
                <FileText style={{ width: 18, height: 18, color: 'var(--text-muted)' }} />
                <span style={{ color: 'var(--text-secondary)' }}>PDF / {t('upload.fileTypes')}</span>
              </button>
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

          {/* Fehler */}
          {uploadError && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <AlertCircle style={{ width: 16, height: 16, color: 'var(--danger)' }} />
              <span style={{ fontSize: 13, color: 'var(--danger-text)' }}>{uploadError}</span>
            </div>
          )}
        </>
      )}

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" style={{ position: 'absolute', left: '-9999px', opacity: 0 }} tabIndex={-1} />
      <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png" capture="environment" style={{ position: 'absolute', left: '-9999px', opacity: 0 }} tabIndex={-1} />
      <input ref={galleryInputRef} type="file" accept="image/*,application/pdf" style={{ position: 'absolute', left: '-9999px', opacity: 0 }} tabIndex={-1} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
