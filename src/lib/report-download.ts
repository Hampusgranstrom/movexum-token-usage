import { jsPDF } from "jspdf";

function toPdfName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "") + ".pdf";
}

export function downloadPdfReport(fileName: string, content: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 48;
  const marginTop = 56;
  const lineHeight = 18;
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = doc.internal.pageSize.getWidth() - marginX * 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);

  const lines = doc.splitTextToSize(content, maxWidth) as string[];
  let y = marginTop;

  for (const line of lines) {
    if (y > pageHeight - marginTop) {
      doc.addPage();
      y = marginTop;
    }
    doc.text(line, marginX, y);
    y += lineHeight;
  }

  doc.save(toPdfName(fileName));
}
