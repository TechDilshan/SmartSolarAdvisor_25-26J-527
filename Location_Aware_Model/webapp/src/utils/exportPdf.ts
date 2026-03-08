import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type ExportPdfOptions = {
  filename?: string;
  marginMm?: number;
  backgroundColor?: string;
};

/**
 * Export an HTML element to PDF with correct margins on every page.
 * Content is split into pages; each page respects top/bottom/left/right margins.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  options: ExportPdfOptions = {}
): Promise<void> {
  const filename = options.filename ?? "feasibility-report.pdf";
  const marginMm = options.marginMm ?? 15;
  const backgroundColor = options.backgroundColor ?? "#ffffff";

  const canvas = await html2canvas(element, {
    backgroundColor,
    scale: Math.max(2, window.devicePixelRatio || 2),
    useCORS: true,
    logging: false,
  });

  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const contentWidthMm = pageWidth - marginMm * 2;
  const contentHeightMm = pageHeight - marginMm * 2;

  const imgWidthPx = canvas.width;
  const imgHeightPx = canvas.height;
  const mmPerPx = contentWidthMm / imgWidthPx;
  const contentHeightPx = contentHeightMm / mmPerPx;

  let sourceY = 0;
  let pageNum = 0;

  while (sourceY < imgHeightPx) {
    const sliceHeightPx = Math.min(contentHeightPx, imgHeightPx - sourceY);
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = imgWidthPx;
    sliceCanvas.height = sliceHeightPx;
    const ctx = sliceCanvas.getContext("2d");
    if (!ctx) break;
    ctx.drawImage(canvas, 0, sourceY, imgWidthPx, sliceHeightPx, 0, 0, imgWidthPx, sliceHeightPx);
    const sliceImg = sliceCanvas.toDataURL("image/png", 1.0);

    if (pageNum > 0) pdf.addPage();
    const sliceHeightMm = sliceHeightPx * mmPerPx;
    pdf.addImage(sliceImg, "PNG", marginMm, marginMm, contentWidthMm, sliceHeightMm);

    sourceY += sliceHeightPx;
    pageNum += 1;
  }

  pdf.save(filename);
}
