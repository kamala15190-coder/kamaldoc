import { useCallback, useState } from 'react';
import { tapHaptic } from '../utils/haptics';
import AttachmentActionSheet from './AttachmentActionSheet';
import {
  captureCamera,
  pickFromGallery,
  pickDocuments,
  DOC_WEB_ACCEPT,
} from '../utils/attachmentSources';

/**
 * Universelle Büroklammer-Auswahl.
 * ----------------------------------------------------------------------------
 * Jede Büroklammer/Anhang-Schaltfläche in der App nutzt diesen Hook: beim
 * Antippen öffnet sich ein Action-Sheet mit GENAU drei Optionen —
 * Foto aufnehmen · aus Galerie wählen · Dokument hochladen.
 *
 *   const { openPicker, picker } = useAttachmentPicker({ onFile: setFile });
 *   <button onClick={openPicker}><Paperclip/></button>
 *   {picker}
 *
 * Plattformverhalten (zentral in utils/attachmentSources.js):
 *   - Foto      → native Kamera (@capacitor/camera) · Web: <input capture>
 *   - Galerie   → native Fotomediathek (Camera.pickImages/getPhoto) · Web: <input image/*>
 *   - Dokument  → nativer Dokumenten-Browser (FilePicker → SAF / UIDocumentPicker) ·
 *                 Web: <input> mit Dokument-accept (OHNE image/* → öffnet Datei-Browser)
 *
 * Liefert immer echte `File`-Objekte:
 *   onFile(file)            – Einzeldatei (Abwärtskompatibilität)
 *   onFilesSelected(files)  – Array (Mehrfachauswahl via allowMultiple)
 *
 * Optionen lassen sich über `allowedTypes` einschränken:
 *   'all' (Default) · 'images' (Kamera+Galerie) · 'documents' (nur Dokument)
 */
export function useAttachmentPicker({
  onFile,
  onFilesSelected,
  allowMultiple = false,
  allowedTypes = 'all',
  // Legacy/Override: Web-`accept` für die Dokument-Option.
  fileAccept = DOC_WEB_ACCEPT,
} = {}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const openPicker = useCallback(() => { tapHaptic(); setOpen(true); }, []);
  const close = useCallback(() => setOpen(false), []);

  const emitFiles = useCallback((files) => {
    const arr = (files || []).filter(Boolean);
    if (!arr.length) return;
    onFilesSelected?.(arr);
    onFile?.(arr[0]);
  }, [onFile, onFilesSelected]);

  // Sheet sofort schließen, dann die Quelle SYNCHRON aufrufen. Wichtig: `fn()`
  // direkt (nicht über einen Microtask) starten, damit der Web-<input>.click()
  // innerhalb der User-Geste passiert — sonst blockieren Browser den Dialog.
  const run = useCallback((fn) => {
    setOpen(false);
    setBusy(true);
    let result;
    try {
      result = fn();
    } catch {
      setBusy(false);
      return;
    }
    Promise.resolve(result)
      .then((files) => emitFiles(Array.isArray(files) ? files : files ? [files] : []))
      .catch(() => { /* abgebrochen / Fehler → still ignorieren */ })
      .finally(() => setBusy(false));
  }, [emitFiles]);

  const handleCamera = useCallback(() => run(() => captureCamera()), [run]);
  const handleGallery = useCallback(() => run(() => pickFromGallery({ multiple: allowMultiple })), [run, allowMultiple]);
  const handleDocument = useCallback(() => run(() => pickDocuments({ multiple: allowMultiple, webAccept: fileAccept })), [run, allowMultiple, fileAccept]);

  const picker = (
    <AttachmentActionSheet
      isOpen={open}
      busy={busy}
      allowedTypes={allowedTypes}
      onClose={close}
      onCamera={handleCamera}
      onGallery={handleGallery}
      onDocument={handleDocument}
    />
  );

  return { openPicker, picker, open, busy };
}
