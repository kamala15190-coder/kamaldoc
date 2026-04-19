import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Check, Trash2, Camera, ImageIcon, FileText, Loader2, ArrowLeft, RotateCcw, Upload } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { buildPdf, fileToDataUrl, fileToArrayBuffer, extractPdfPages } from '../utils/pdfBuilder'
import { uploadDocument } from '../api'
import { usePlanLimit } from '../hooks/usePlanLimit'
import { openNativeScanner, openNativeGallery } from '../utils/documentScannerHelper'
import Confetti from '../components/Confetti'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'

export default function ScanPreviewPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { handleApiError } = usePlanLimit()
  const initState = location.state || {}
  const [pages, setPages] = useState(() => {
    if (initState.initialPages?.length) {
      return initState.initialPages.map(p => ({ id: genId(), ...p }))
    }
    return []
  })
  const [activeIdx, setActiveIdx] = useState(() => (initState.initialPages?.length || 1) - 1)
  const [building, setBuilding] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadDone, setUploadDone] = useState(false)
  const [error, setError] = useState(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [fileName, setFileName] = useState(() => {
    const d = new Date()
    return `Scan_${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}.pdf`
  })
  const fileInputRef = useRef(null)
  const galleryAutoOpened = useRef(false)

  // Auto-open gallery picker if navigated with openGallery flag – runs exactly once on mount.
  useEffect(() => {
    if (initState.openGallery && !galleryAutoOpened.current && pages.length === 0) {
      galleryAutoOpened.current = true
      setTimeout(() => {
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
          fileInputRef.current.click()
        }
      }, 100)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  // Add pages from files (gallery multi-select)
  const addFilesFromPicker = useCallback(async (fileList) => {
    const newPages = []
    for (const file of fileList) {
      if (file.type === 'application/pdf') {
        const ab = await fileToArrayBuffer(file)
        const extracted = await extractPdfPages(ab)
        extracted.forEach(p => newPages.push({ id: genId(), ...p }))
      } else if (file.type.startsWith('image/')) {
        const dataUrl = await fileToDataUrl(file)
        newPages.push({ id: genId(), type: 'image', dataUrl })
      }
    }
    if (newPages.length === 0) return
    setPages(prev => {
      const updated = [...prev, ...newPages]
      setActiveIdx(updated.length - 1) // springe zur letzten neu hinzugefügten Seite
      return updated
    })
  }, [])

  /**
   * "Seite hinzufügen" via camera.
   *
   * Native: Uses DocumentScannerHelper which tries native scanner first,
   * then falls back to Capacitor Camera. All pages from scanner are added.
   *
   * Web: Opens HTML file input with camera capture attribute.
   * This is the fallback "Seite hinzufügen" loop — user takes one photo,
   * sees preview, and can press "Seite hinzufügen" again or "Fertig".
   */
  const openCameraScan = async () => {
    if (Capacitor.isNativePlatform()) {
      const result = await openNativeScanner()
      if (result?.pages?.length) {
        const newPages = result.pages.map(dataUrl => ({ id: genId(), type: 'image', dataUrl }))
        setPages(prev => {
          const updated = [...prev, ...newPages]
          setActiveIdx(updated.length - 1)
          return updated
        })
      }
      return
    }

    // Web fallback: open file input with camera capture
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (file) {
        const dataUrl = await fileToDataUrl(file)
        setPages(prev => {
          const updated = [...prev, { id: genId(), type: 'image', dataUrl }]
          setActiveIdx(updated.length - 1)
          return updated
        })
      }
    }
    input.click()
  }

  /**
   * "Aus Galerie" / "Seite hinzufügen aus Galerie".
   * Native: opens native photo picker (Capacitor pickImages) directly.
   * Web: opens HTML file input for multi-select.
   */
  const openGalleryPicker = async () => {
    if (Capacitor.isNativePlatform()) {
      const result = await openNativeGallery()
      if (result?.images?.length) {
        const newPages = result.images.map(dataUrl => ({ id: genId(), type: 'image', dataUrl }))
        setPages(prev => {
          const updated = [...prev, ...newPages]
          setActiveIdx(updated.length - 1)
          return updated
        })
      }
      return
    }
    // Web fallback: file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleGalleryFiles = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) await addFilesFromPicker(files)
  }

  // Remove page
  const removePage = (idx) => {
    setPages(prev => {
      const next = prev.filter((_, i) => i !== idx)
      setActiveIdx(cur => Math.min(cur, Math.max(0, next.length - 1)))
      return next
    })
    setContextMenu(null)
  }

  // Retake page (remove + open camera)
  const retakePage = (idx) => {
    removePage(idx)
    setContextMenu(null)
    setTimeout(() => openCameraScan(), 200)
  }

  // Drag & drop reorder
  const handleDragEnd = (event) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      setPages(prev => {
        const oldIndex = prev.findIndex(p => p.id === active.id)
        const newIndex = prev.findIndex(p => p.id === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  // Long press on thumbnail
  const handleThumbnailLongPress = (idx, e) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    setContextMenu({ idx, x: rect.left, y: rect.top - 80 })
  }

  // Build PDF and upload
  const handleFinish = async () => {
    if (pages.length === 0) return
    setBuilding(true)
    setError(null)
    try {
      const baseName = (fileName || '').trim() || `Scan_${new Date().toISOString().slice(0, 10)}`
      const safeName = baseName.toLowerCase().endsWith('.pdf') ? baseName : `${baseName}.pdf`
      const pdfFile = await buildPdf(pages, safeName)
      setBuilding(false)
      setUploading(true)
      const result = await uploadDocument(pdfFile)
      setUploadDone(true)
      setTimeout(() => navigate(`/documents/${result.id}`), 1500)
    } catch (err) {
      if (handleApiError(err)) return
      setError(err.message || 'Fehler')
      setBuilding(false)
      setUploading(false)
    }
  }

  const activePage = pages[activeIdx]

  // Empty state — initial selection
  if (pages.length === 0 && !building && !uploading) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button onClick={() => navigate('/upload')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', cursor: 'pointer' }}>
            <ArrowLeft style={{ width: 16, height: 16, color: 'var(--text-primary)' }} />
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('upload.scanTitle', 'Dokument scannen')}</h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button onClick={openCameraScan} className="btn-accent camera-glass-btn" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 10, padding: 28, borderRadius: 16, minHeight: 120, fontSize: 14, fontWeight: 600,
          }}>
            <Camera style={{ width: 32, height: 32 }} />
            {t('upload.camera', 'Foto aufnehmen')}
          </button>
          <button onClick={openGalleryPicker} className="glass-card" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 10, padding: 28, minHeight: 120, fontSize: 14, fontWeight: 600,
            color: 'var(--text-primary)', cursor: 'pointer', border: '1px solid var(--border-glass-strong)',
          }}>
            <ImageIcon style={{ width: 32, height: 32, color: 'var(--text-secondary)' }} />
            {t('upload.gallery', 'Aus Galerie')}
          </button>
        </div>

        <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,application/pdf"
          style={{ display: 'none' }} onChange={handleGalleryFiles} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 120px)', position: 'relative' }}>
      {/* Close context menu on tap anywhere */}
      {contextMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setContextMenu(null)} />}

      {/* Main preview area (~70%) */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 14, background: 'var(--bg-glass)', margin: '0 0 8px', position: 'relative' }}>
        {activePage?.type === 'image' && activePage.dataUrl ? (
          <img src={activePage.dataUrl} alt={`Seite ${activeIdx + 1}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
        ) : activePage?.type === 'pdf' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <FileText style={{ width: 48, height: 48, color: 'var(--text-muted)', opacity: 0.5 }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>PDF — {t('upload.page', 'Seite')} {activeIdx + 1}</span>
          </div>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>{t('upload.noPages', 'Keine Seiten')}</span>
        )}

        {/* Page number overlay */}
        {pages.length > 0 && (
          <div style={{ position: 'absolute', top: 8, right: 8, padding: '3px 10px', borderRadius: 20, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, fontWeight: 600 }}>
            {activeIdx + 1} / {pages.length}
          </div>
        )}
      </div>

      {/* Thumbnail strip (~100px with larger A4-ratio thumbs + inline Add-tile) */}
      {pages.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pages.map(p => p.id)} strategy={horizontalListSortingStrategy}>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '8px 0', minHeight: 104 }} className="hide-scrollbar">
              {pages.map((page, idx) => (
                <SortableThumb
                  key={page.id}
                  page={page}
                  idx={idx}
                  isActive={idx === activeIdx}
                  onClick={() => { setActiveIdx(idx); setContextMenu(null) }}
                  onLongPress={(e) => handleThumbnailLongPress(idx, e)}
                />
              ))}
              <button
                type="button"
                className="scan-thumb scan-thumb-add"
                onClick={openCameraScan}
                aria-label={t('upload.addPage', 'Seite hinzufügen')}
              >
                <Plus style={{ width: 22, height: 22 }} />
              </button>
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Context menu for long-press */}
      {contextMenu && (
        <div style={{
          position: 'fixed', left: Math.max(8, contextMenu.x), top: Math.max(8, contextMenu.y),
          zIndex: 100, background: 'var(--bg-glass-strong)', border: '1px solid var(--border-glass)',
          borderRadius: 10, padding: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column', gap: 2, minWidth: 150,
        }}>
          <button onClick={() => retakePage(contextMenu.idx)} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 6,
            background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer', width: '100%', textAlign: 'left',
          }}>
            <RotateCcw style={{ width: 14, height: 14 }} /> {t('upload.retake', 'Neu aufnehmen')}
          </button>
          <button onClick={() => removePage(contextMenu.idx)} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 6,
            background: 'none', border: 'none', color: '#ef4444', fontSize: 13, cursor: 'pointer', width: '100%', textAlign: 'left',
          }}>
            <Trash2 style={{ width: 14, height: 14 }} /> {t('upload.delete', 'Löschen')}
          </button>
        </div>
      )}

      {/* File name */}
      {pages.length > 0 && !uploading && !uploadDone && (
        <div style={{ padding: '6px 0' }}>
          <input type="text" value={fileName} onChange={e => setFileName(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      )}

      {/* Bottom action bar */}
      <div style={{ display: 'flex', gap: 10, padding: '8px 0' }}>
        {!building && !uploading && !uploadDone && (
          <>
            <button onClick={openCameraScan} className="btn-ghost" style={{
              flex: 1, padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 600,
            }}>
              <Plus style={{ width: 16, height: 16 }} /> {t('upload.addPage', 'Seite hinzufügen')}
            </button>
            <button onClick={openGalleryPicker} className="btn-ghost" style={{
              padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ImageIcon style={{ width: 16, height: 16 }} />
            </button>
            <button onClick={handleFinish} disabled={pages.length === 0} className="btn-accent" style={{
              flex: 1, padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 600,
              opacity: pages.length === 0 ? 0.5 : 1,
            }}>
              <Check style={{ width: 16, height: 16 }} /> {t('upload.finish', 'Fertig')}
            </button>
          </>
        )}

        {(building || uploading) && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0' }}>
            <Loader2 style={{ width: 18, height: 18, color: 'var(--accent-solid)', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-solid)' }}>
              {building ? (t('upload.buildingPdf', 'PDF wird erstellt...')) : (t('upload.uploading', 'Wird hochgeladen...'))}
            </span>
          </div>
        )}

        {uploadDone && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0' }}>
            <Upload style={{ width: 18, height: 18, color: 'var(--success)' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--success-text)' }}>{t('upload.uploadSuccess', 'Upload erfolgreich!')}</span>
          </div>
        )}
      </div>

      {error && (
        <p style={{ fontSize: 12, color: '#ef4444', textAlign: 'center', margin: '4px 0' }}>{error}</p>
      )}

      <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,application/pdf"
        style={{ display: 'none' }} onChange={handleGalleryFiles} />
      <Confetti show={uploadDone} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function genId() {
  return `page_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function SortableThumb({ page, idx, isActive, onClick, onLongPress }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: page.id })

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`scan-thumb ${isActive ? 'active' : ''}`}
      tabIndex={0}
      role="button"
      aria-label={`Seite ${idx + 1}`}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onContextMenu={onLongPress}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } }}
    >
      {page.type === 'image' && page.dataUrl ? (
        <img src={page.dataUrl} alt={`Seite ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <FileText style={{ width: 22, height: 22, color: 'var(--text-muted)', opacity: 0.5 }} />
      )}
      <span style={{
        position: 'absolute', bottom: 3, left: 0, right: 0,
        textAlign: 'center', fontSize: 10, fontWeight: 700,
        color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.75)',
      }}>
        {idx + 1}
      </span>
    </div>
  )
}