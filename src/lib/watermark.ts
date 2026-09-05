import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

// Stamp a per-viewer watermark across every page of a PDF: a faint diagonal
// tile plus a footer line identifying the recipient and time. Deters casual
// leakage of confidential documents and ties a copy to who downloaded it.
export async function watermarkPdf(bytes: Uint8Array, label: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const text = label.slice(0, 120);
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    // Diagonal tiled watermark.
    const step = 220;
    for (let y = -height; y < height * 2; y += step) {
      for (let x = -width; x < width * 2; x += step * 1.6) {
        page.drawText(text, {
          x,
          y,
          size: 14,
          font,
          color: rgb(0.55, 0.55, 0.6),
          opacity: 0.12,
          rotate: degrees(45),
        });
      }
    }
    // Footer attribution.
    page.drawText(text, { x: 24, y: 14, size: 7, font, color: rgb(0.4, 0.4, 0.45), opacity: 0.7 });
  }
  return pdf.save();
}

export function isPdf(contentType: string | undefined, fileName: string): boolean {
  return (contentType ?? "").toLowerCase().includes("pdf") || fileName.toLowerCase().endsWith(".pdf");
}
