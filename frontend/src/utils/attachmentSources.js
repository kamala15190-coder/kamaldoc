import { Capacitor } from '@capacitor/core';

/**
 * attachmentSources — eine zentrale, plattform-bewusste Quelle für ALLE
 * Anhang-Aufnahmen der App (Kamera · Galerie · Dokumenten-Browser).
 *
 * Liefert überall ein einheitliches Ergebnis: native `File`-Objekte.
 * So benutzen sowohl die universelle Büroklammer (`useAttachmentPicker`)
 * als auch der Mehrseiten-Scan-Flow (UploadPage/ScanPreviewPage) exakt
 * dieselben nativen Aufrufe — keine doppelte Plattform-Logik.
 *
 *   Web   : <input type="file"> (Kamera-Option mit `capture`)
 *   Native: @capacitor/camera (Kamera/Galerie) · @capawesome/capacitor-file-picker (Dokumente)
 */

export const isNativePlatform = () => Capacitor.isNativePlatform();

/* ------------------------------------------------------------------ *
 * Akzeptierte Dokumenttypen (Web-accept + native MIME-Filter)
 * ------------------------------------------------------------------ */
export const DOC_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
];

// Web-`accept` für die Dokument-Option: bewusst OHNE `image/*`, damit der
// Android-WebView-Filechooser den DOKUMENTEN-Browser öffnet (nicht Kamera/Galerie).
export const DOC_WEB_ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,' +
  'application/pdf,application/msword,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'application/vnd.ms-excel,' +
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,' +
  'application/vnd.ms-powerpoint,' +
  'application/vnd.openxmlformats-officedocument.presentationml.presentation,' +
  'text/plain,text/csv';

// Web-`accept` für Bild-/Galerie-Auswahl inkl. PDF (Scan-Flow erlaubt PDF in der Galerie-Auswahl).
export const IMAGE_WEB_ACCEPT = 'image/*';
export const IMAGE_PDF_WEB_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,application/pdf';

/* ------------------------------------------------------------------ *
 * Konverter
 * ------------------------------------------------------------------ */

/** Base64 (ohne data:-Präfix) → File */
export function base64ToFile(b64, filename, mime = 'application/octet-stream') {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
  return new File([u8], filename, { type: mime });
}

/** data:-URL → File */
export function dataUrlToFile(dataUrl, filename) {
  const [head, b64] = dataUrl.split(',');
  const mime = (head.match(/:(.*?);/) || [])[1] || 'image/jpeg';
  return base64ToFile(b64, filename, mime);
}

/** File → data:-URL */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Ein capawesome `PickedFile` → `File`.
 * Reihenfolge: blob (Web) → data (native, readData) → path (Fallback via Fetch).
 */
async function pickedFileToFile(pf) {
  const name = pf.name || `datei-${Date.now()}`;
  const mime = pf.mimeType || 'application/octet-stream';
  if (pf.blob) return new File([pf.blob], name, { type: pf.mimeType || pf.blob.type });
  if (pf.data) return base64ToFile(pf.data, name, mime);
  if (pf.path) {
    try {
      const res = await fetch(Capacitor.convertFileSrc(pf.path));
      const blob = await res.blob();
      return new File([blob], name, { type: mime || blob.type });
    } catch {
      return null;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Web-Fallback: programmatischer <input type="file">
 * ------------------------------------------------------------------ */
function webFileInput({ accept, multiple = false, capture = null } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (accept) input.accept = accept;
    if (multiple) input.multiple = true;
    if (capture) input.capture = capture;
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    let settled = false;
    const done = (files) => {
      if (settled) return;
      settled = true;
      try { document.body.removeChild(input); } catch { /* ignore */ }
      resolve(files);
    };
    input.onchange = (e) => done(Array.from(e.target.files || []));
    // Abbruch erkennen: viele Browser feuern `cancel`; sonst leeres Ergebnis beim Re-Fokus.
    input.oncancel = () => done([]);
    document.body.appendChild(input);
    input.click();
  });
}

/* ------------------------------------------------------------------ *
 * 1) KAMERA — ein Foto aufnehmen
 * ------------------------------------------------------------------ */
export async function captureCamera() {
  if (isNativePlatform()) {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        quality: 90,
        correctOrientation: true,
      });
      if (photo?.dataUrl) {
        return dataUrlToFile(photo.dataUrl, `foto-${Date.now()}.${photo.format || 'jpeg'}`);
      }
    } catch {
      /* abgebrochen / Berechtigung verweigert → still */
    }
    return null;
  }
  const files = await webFileInput({ accept: IMAGE_WEB_ACCEPT, capture: 'environment' });
  return files[0] || null;
}

/* ------------------------------------------------------------------ *
 * 2) GALERIE — Foto(s) aus der Mediathek
 * ------------------------------------------------------------------ */
export async function pickFromGallery({ multiple = false } = {}) {
  if (isNativePlatform()) {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      if (multiple && typeof Camera.pickImages === 'function') {
        const result = await Camera.pickImages({ quality: 90, limit: 0 });
        const out = [];
        for (const photo of result?.photos || []) {
          const src = photo.webPath || photo.path;
          if (!src) continue;
          try {
            const res = await fetch(src);
            const blob = await res.blob();
            out.push(new File([blob], `foto-${Date.now()}-${out.length}.${photo.format || 'jpg'}`, { type: blob.type || 'image/jpeg' }));
          } catch { /* einzelnes Foto überspringen */ }
        }
        return out;
      }
      // Einzelauswahl
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        quality: 90,
        correctOrientation: true,
      });
      if (photo?.dataUrl) return [dataUrlToFile(photo.dataUrl, `foto-${Date.now()}.${photo.format || 'jpeg'}`)];
    } catch {
      /* abgebrochen / Berechtigung verweigert → still */
    }
    return [];
  }
  return webFileInput({ accept: IMAGE_WEB_ACCEPT, multiple });
}

/* ------------------------------------------------------------------ *
 * 3) DOKUMENT — nativer Dokumenten-Browser (SAF / UIDocumentPicker)
 * ------------------------------------------------------------------ */
export async function pickDocuments({ multiple = false, types = DOC_MIME_TYPES, webAccept = DOC_WEB_ACCEPT } = {}) {
  if (isNativePlatform()) {
    try {
      const { FilePicker } = await import('@capawesome/capacitor-file-picker');
      // API-Eigenheit: `types` wird ignoriert sobald `limit` gesetzt ist; `limit`
      // unterstützt nur 0/1. Für Mehrfachauswahl daher Typ-Filter + limit 0 (default),
      // für Einzelauswahl limit 1 (ohne Typ-Filter — wir validieren danach selbst).
      const opts = multiple
        ? { types, readData: true }
        : { limit: 1, readData: true };
      const { files } = await FilePicker.pickFiles(opts);
      const out = [];
      for (const pf of files || []) {
        const f = await pickedFileToFile(pf);
        if (f) out.push(f);
      }
      return out;
    } catch {
      /* abgebrochen → still */
    }
    return [];
  }
  return webFileInput({ accept: webAccept, multiple });
}

/* ------------------------------------------------------------------ *
 * Bild-Kompression — hält den Mehrseiten-Scan bei 30+ Seiten speicherschlank.
 * Skaliert auf eine maximale Kantenlänge und re-encodiert als JPEG.
 * Gibt bei Fehlern/Untergröße die Original-DataURL zurück (verlustfrei robust).
 * ------------------------------------------------------------------ */
export function compressImageDataUrl(dataUrl, { maxDim = 2200, quality = 0.82, minBytes = 400_000 } = {}) {
  return new Promise((resolve) => {
    try {
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
        resolve(dataUrl);
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          const w0 = img.naturalWidth || img.width;
          const h0 = img.naturalHeight || img.height;
          const scale = Math.min(1, maxDim / Math.max(w0, h0));
          // Schon klein genug und im Budget → unverändert lassen.
          if (scale === 1 && dataUrl.length < minBytes) { resolve(dataUrl); return; }
          const w = Math.max(1, Math.round(w0 * scale));
          const h = Math.max(1, Math.round(h0 * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(dataUrl); return; }
          ctx.drawImage(img, 0, 0, w, h);
          const out = canvas.toDataURL('image/jpeg', quality);
          // Falls Kompression (selten) größer ausfällt, Original behalten.
          resolve(out && out.length < dataUrl.length ? out : dataUrl);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}
