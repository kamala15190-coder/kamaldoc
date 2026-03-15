import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Camera, FileText, CheckCircle, Loader2, AlertCircle, X, ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { uploadDocument } from '../api';

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
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{t('upload.title')}</h1>

      {/* Vorschau wenn Datei ausgewählt */}
      {selectedFile && (
        <div className="bg-white rounded-xl shadow-sm border-2 border-green-300 p-4 md:p-5 mb-6" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
          {/* Visuelles Feedback: grüner Rand + Dateiname */}
          <div className="flex items-center gap-2 mb-3 text-green-700 bg-green-50 rounded-lg px-3 py-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium truncate">{t('upload.fileSelected', { name: selectedFile.name })}</span>
            <span className="text-xs text-green-600 shrink-0">({(selectedFile.size / 1024).toFixed(0)} KB)</span>
          </div>

          {/* Mobile: Bild groß zentriert */}
          <div className="md:hidden mb-4">
            <div className="w-full aspect-square max-w-xs mx-auto rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center">
              {preview === 'pdf' ? (
                <FileText className="w-16 h-16 text-slate-400" />
              ) : preview ? (
                <img src={preview} alt="Vorschau" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-16 h-16 text-slate-300" />
              )}
            </div>
          </div>

          {/* Desktop: Side-by-side */}
          <div className="hidden md:flex items-start gap-4">
            <div className="w-32 h-32 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
              {preview === 'pdf' ? (
                <FileText className="w-12 h-12 text-slate-400" />
              ) : preview ? (
                <img src={preview} alt="Vorschau" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-12 h-12 text-slate-300" />
              )}
            </div>
          </div>

          {/* Upload-Fortschritt */}
          {uploading && (
            <div className="mt-4">
              <div className="flex items-center justify-center gap-2 text-indigo-600 mb-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">{t('upload.uploading')}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full animate-pulse" style={{ width: '70%' }} />
              </div>
            </div>
          )}

          {/* Erfolg */}
          {uploadDone && (
            <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{t('upload.uploadSuccess')}</span>
            </div>
          )}

          {/* Fehler */}
          {uploadError && (
            <div className="mt-4 flex items-center justify-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{uploadError}</span>
            </div>
          )}

          {/* Buttons */}
          {!uploading && !uploadDone && (
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mt-4">
              <button
                onClick={handleUpload}
                disabled={!selectedFile}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 cursor-pointer border-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minHeight: '48px' }}
              >
                <Upload className="w-5 h-5" /> {t('upload.uploadButton')}
              </button>
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 px-3 py-3 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 cursor-pointer"
                style={{ minHeight: '48px' }}
              >
                <X className="w-4 h-4" /> {t('upload.cancel')}
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
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${
                dragOver
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-300 bg-white hover:border-indigo-300 hover:bg-slate-50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={openFileDialog}
            >
              <Upload className={`w-12 h-12 mx-auto mb-4 ${dragOver ? 'text-indigo-500' : 'text-slate-400'}`} />
              <p className="text-lg font-medium text-slate-700 mb-1">
                {t('upload.dragDrop')}
              </p>
              <p className="text-sm text-slate-500">
                {t('upload.fileTypes')}
              </p>
            </div>
          )}

          {/* Mobile: Große Buttons nebeneinander */}
          {isMobile && (
            <div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={openCamera}
                  className="flex flex-col items-center justify-center gap-2 px-4 bg-indigo-600 text-white rounded-2xl text-sm font-medium cursor-pointer border-none active:scale-95 transition-transform"
                  style={{ minHeight: '80px' }}
                >
                  <Camera className="w-7 h-7" />
                  {t('upload.camera')}
                </button>
                <button
                  onClick={openGallery}
                  className="flex flex-col items-center justify-center gap-2 px-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl text-sm font-medium cursor-pointer active:scale-95 transition-transform"
                  style={{ minHeight: '80px' }}
                >
                  <ImageIcon className="w-7 h-7" />
                  {t('upload.gallery')}
                </button>
              </div>
              <p className="text-center text-xs text-slate-400 mt-3">{t('upload.fileTypes')}</p>
            </div>
          )}

          {/* Desktop: Kamera-Button unter Drag&Drop */}
          {!isMobile && (
            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={openCamera}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Camera className="w-4 h-4" /> {t('upload.cameraButton')}
              </button>
              <button
                onClick={openGallery}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <ImageIcon className="w-4 h-4" /> {t('upload.galleryButton')}
              </button>
            </div>
          )}

          {/* Fehler */}
          {uploadError && (
            <div className="mt-4 flex items-center justify-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{uploadError}</span>
            </div>
          )}
        </>
      )}

      {/* Hidden file inputs — IMMER gerendert, damit refs stabil bleiben */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
        style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
        tabIndex={-1}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
        tabIndex={-1}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,application/pdf"
        style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
        tabIndex={-1}
      />
    </div>
  );
}
