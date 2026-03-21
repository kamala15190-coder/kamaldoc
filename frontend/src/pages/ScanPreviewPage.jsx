import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Check, Trash2, Camera, ImageIcon, FileText, Loader2, GripVertical, ArrowLeft, RotateCcw, Upload } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { buildPdf, fileToDataUrl, fileToArrayBuffer, extractPdfPages } from '../utils/pdfBuilder'
import { uploadDocument } from '../api'
import { usePlanLimit } from '../hooks/usePlanLimit'
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
    // Accept initial pages from navigation state (camera or gallery)
    if (initState.initialPages?.length) {
      return initState.initialPages.map(p => ({ id: `page_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, ...p }))
    }
    return []
  }) // { id, type: 'image'|'pdf', dataUrl?, arrayBuffer?, thumbnail? }
  const [activeIdx, setActiveIdx] = useState(0)
  const [building, setBuilding] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadDone, setUploadDone] = useState(false)
  const [uploadDocId, setUploadDocId] = useState(null)
  const [error, setError] = useState(null)
  const [contextMenu, setContextMenu] = useState(null) // { idx, x, y }
  const [fileName, setFileName] = useState(() => {
    const d = new Date()
    return `Scan_${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}.pdf`
  })
  const fileInputRef = useRef(null)
  const longPressTimer = useRef(null)
  const galleryAutoOpened = useRef(false)

  // Auto-open gallery picker if navigated with openGallery flag
  useEffect(() => {
    if (initState.openGallery && !galleryAutoOpened.current && pages.length === 0) {
      galleryAutoOpened.current = true
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
          fileInputRef.current.click()
        }
      }, 100)
    }
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const addId = () => `page_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  // Add image page from dataUrl
  const addImagePage = useCallback((dataUrl) => {
    setPages(prev => [...prev, { id: addId(), type: 'image', dataUrl }])
    setActiveIdx(prev => prev) // keep or move to last
  }, [])

  // Add pages from files (gallery multi-select)
  const addFilesFromPicker = useCallback(async (fileList) => {
    const newPages = []
    for (const file of fileList) {
      if (file.type === 'application/pdf') {
        const ab = await fileToArrayBuffer(file)
        const extracted = await extractPdfPages(ab)
        extracted.forEach(p => newPages.push({ id: addId(), ...p }))
      } else if (file.type.startsWith('image/')) {
        const dataUrl = await fileToDataUrl(file)
        newPages.push({ id: addId(), type: 'image', dataUrl })
      }
    }
    setPages(prev => [...prev, ...newPages])
    if (newPages.length > 0) setActiveIdx(prev => prev + (pages.length === 0 ? 0 : 0))
  }, [pages.length])

  // Camera scan via ML Kit Document Scanner (Android) or Capacitor Camera (fallback)
  const openCameraScan = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { registerPlugin } = await import('@capacitor/core')
        const DocumentScanner = registerPlugin('DocumentScanner')
        const result = await DocumentScanner.scan()
        if (result.pages) {
          result.pages.forEach(dataUrl => {
            setPages(prev => [...prev, { id: addId(), type: 'image', dataUrl }])
          })
        }
        return
      } catch (err) {
        console.warn('[KamalDoc] ML Kit scanner failed, falling back to camera:', err)
      }
      // Fallback: Capacitor Camera
      try {
        const { Camera: CapCamera, CameraResultType, CameraSource } = await import('@capacitor/camera')
        const photo = await CapCamera.getPhoto({
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          quality: 92,
        })
        if (photo.dataUrl) {
          addImagePage(photo.dataUrl)
        }
      } catch (err) {
        console.error('[KamalDoc] Camera error:', err)
      }
    } else {
      // Web: open file input with camera
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.capture = 'environment'
      input.onchange = async (e) => {
        const file = e.target.files?.[0]
        if (file) {
          const dataUrl = await fileToDataUrl(file)
          addImagePage(dataUrl)
        }
      }
      input.click()
    }
  }

  // Open gallery / file picker for multi-select
  const openGalleryPicker = () => {
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
    setPages(prev => prev.filter((_, i) => i !== idx))
    setActiveIdx(prev => Math.min(prev, Math.max(0, pages.length - 2)))
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
      const pdfFile = await buildPdf(pages, fileName)
      setBuilding(false)
      setUploading(true)
      const result = await uploadDocument(pdfFile)
      setUploadDone(true)
      setUploadDocId(result.id)
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
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', position: 'relative' }}>
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

      {/* Thumbnail strip (~80px) */}
      {pages.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pages.map(p => p.id)} strategy={horizontalListSortingStrategy}>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '6px 0', minHeight: 80 }}>
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function SortableThumb({ page, idx, isActive, onClick, onLongPress }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: page.id })

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    width: 60, height: 70, borderRadius: 8, overflow: 'hidden',
    border: isActive ? '2px solid var(--accent-solid)' : '2px solid transparent',
    background: 'var(--bg-glass)', flexShrink: 0, cursor: 'grab',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      onClick={onClick}
      onContextMenu={onLongPress}
    >
      {page.type === 'image' && page.dataUrl ? (
        <img src={page.dataUrl} alt={`${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <FileText style={{ width: 20, height: 20, color: 'var(--text-muted)', opacity: 0.5 }} />
      )}
      <span style={{
        position: 'absolute', bottom: 2, left: 0, right: 0,
        textAlign: 'center', fontSize: 9, fontWeight: 700,
        color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.7)',
      }}>
        {idx + 1}
      </span>
    </div>
  )
}
