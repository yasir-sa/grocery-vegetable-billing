// Makes a PDF from a hidden HTML block. The page is rendered to an image by the browser first,
// so Tamil text comes out perfectly (PDF libraries cannot shape Tamil letters on their own).
// Long reports are split over several A4 pages.
import { saveFile } from './saveFile'

export async function elementToPdf(element, fileName, { format = 'a4' } = {}) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
  await document.fonts?.ready
  const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false })

  if (format === 'receipt') {
    // One long narrow page (80 mm wide), like a shop receipt.
    const w = 80
    const h = (canvas.height * w) / canvas.width
    const pdf = new jsPDF({ unit: 'mm', format: [w, Math.max(h, 60)] })
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, w, h)
    await saveFile(pdf.output('blob'), fileName)
    return
  }

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const pageH = 297
  const margin = 8
  const imgW = pageW - margin * 2
  const pxPerMm = canvas.width / imgW
  const sliceH = Math.floor((pageH - margin * 2) * pxPerMm)
  for (let y = 0, page = 0; y < canvas.height; y += sliceH, page++) {
    const part = document.createElement('canvas')
    part.width = canvas.width
    part.height = Math.min(sliceH, canvas.height - y)
    const ctx = part.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, part.width, part.height)
    ctx.drawImage(canvas, 0, y, canvas.width, part.height, 0, 0, canvas.width, part.height)
    if (page > 0) pdf.addPage()
    pdf.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgW, part.height / pxPerMm)
  }
  await saveFile(pdf.output('blob'), fileName)
}
