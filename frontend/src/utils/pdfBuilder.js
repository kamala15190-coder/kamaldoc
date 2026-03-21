import { PDFDocument } from 'pdf-lib'

/**
 * Build a single PDF from an array of page objects.
 * Each page: { type: 'image', dataUrl: '...' } or { type: 'pdf', arrayBuffer: ArrayBuffer }
 * Returns a File object.
 */
export async function buildPdf(pages, fileName = 'Scan.pdf') {
  const pdfDoc = await PDFDocument.create()

  for (const page of pages) {
    if (page.type === 'pdf') {
      // Copy pages from existing PDF
      const srcDoc = await PDFDocument.load(page.arrayBuffer)
      const indices = srcDoc.getPageIndices()
      const copiedPages = await pdfDoc.copyPages(srcDoc, indices)
      copiedPages.forEach(p => pdfDoc.addPage(p))
    } else if (page.type === 'image') {
      // Embed image into A4 page
      const dataUrl = page.dataUrl
      const base64 = dataUrl.split(',')[1]
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
      const isJpeg = dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg')
      const isPng = dataUrl.includes('image/png')

      let img
      if (isJpeg) {
        img = await pdfDoc.embedJpg(bytes)
      } else if (isPng) {
        img = await pdfDoc.embedPng(bytes)
      } else {
        // Try JPEG as fallback
        img = await pdfDoc.embedJpg(bytes)
      }

      // A4 dimensions in points (595.28 x 841.89)
      const A4_W = 595.28
      const A4_H = 841.89
      const pdfPage = pdfDoc.addPage([A4_W, A4_H])

      // Scale image to fit A4 with margins
      const margin = 20
      const maxW = A4_W - 2 * margin
      const maxH = A4_H - 2 * margin
      const scale = Math.min(maxW / img.width, maxH / img.height, 1)
      const w = img.width * scale
      const h = img.height * scale
      const x = (A4_W - w) / 2
      const y = (A4_H - h) / 2

      pdfPage.drawImage(img, { x, y, width: w, height: h })
    }
  }

  const pdfBytes = await pdfDoc.save()
  return new File([pdfBytes], fileName, { type: 'application/pdf' })
}

/**
 * Extract page thumbnails from a PDF ArrayBuffer.
 * Returns array of { type: 'pdf', arrayBuffer, pageCount, thumbnail: dataUrl }
 * Note: For thumbnail we use a simple placeholder since pdf-lib can't render.
 */
export async function extractPdfPages(arrayBuffer) {
  const doc = await PDFDocument.load(arrayBuffer)
  const pageCount = doc.getPageCount()
  const pages = []
  for (let i = 0; i < pageCount; i++) {
    // Create a single-page PDF for each page
    const singleDoc = await PDFDocument.create()
    const [copied] = await singleDoc.copyPages(doc, [i])
    singleDoc.addPage(copied)
    const singleBytes = await singleDoc.save()
    pages.push({
      type: 'pdf',
      arrayBuffer: singleBytes.buffer,
      pageIndex: i,
      thumbnail: null, // No thumbnail for PDF pages — use icon in UI
    })
  }
  return pages
}

/**
 * Convert a File (image) to a dataUrl.
 */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Convert a File (PDF) to ArrayBuffer.
 */
export function fileToArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}
