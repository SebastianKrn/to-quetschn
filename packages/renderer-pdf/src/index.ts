import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Arrangement } from "@grifftab/domain-types";

export class PdfArrangementRenderer {
  async render(arrangement: Arrangement): Promise<Buffer> {
    const document = await PDFDocument.create();
    document.setTitle(`GriffTab Export - ${arrangement.title}`);
    document.setSubject("Griffschrift PDF Export");
    document.setProducer("GriffTab");

    const font = await document.embedFont(StandardFonts.Helvetica);
    const fontBold = await document.embedFont(StandardFonts.HelveticaBold);

    let page = document.addPage([595.28, 841.89]);
    const width = page.getWidth();
    const margin = 40;
    const lineHeight = 14;
    const tokenIndent = 14;

    const createPage = () => {
      page = document.addPage([595.28, 841.89]);
      return page.getHeight() - margin;
    };

    let y = page.getHeight() - margin;

    page.drawText("Griffschrift Export", {
      x: margin,
      y,
      size: 20,
      font: fontBold,
      color: rgb(0.08, 0.14, 0.22)
    });
    y -= 24;

    page.drawText(arrangement.title, {
      x: margin,
      y,
      size: 15,
      font: fontBold,
      color: rgb(0.13, 0.18, 0.25)
    });
    y -= 18;

    page.drawText(`Stimmung: ${arrangement.tuning} | Tempo: ${arrangement.tempoBpm} BPM`, {
      x: margin,
      y,
      size: 11,
      font,
      color: rgb(0.2, 0.23, 0.3)
    });
    y -= 18;

    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: rgb(0.84, 0.87, 0.9)
    });
    y -= 18;

    for (const measure of arrangement.measures) {
      const required = (measure.tokens.length + 1) * lineHeight + 8;
      if (y - required < margin) {
        y = createPage();
      }

      page.drawText(`Takt ${measure.index}`, {
        x: margin,
        y,
        size: 12,
        font: fontBold,
        color: rgb(0.12, 0.18, 0.25)
      });
      y -= lineHeight;

      for (const token of measure.tokens) {
        const direction = token.direction === "push" ? "D" : "Z";
        const text = `${direction} | Reihe ${token.row}, Knopf ${token.button} | ${token.pitch} | Dauer: ${token.duration} | Schlag: ${token.beat}`;

        page.drawText(text, {
          x: margin + tokenIndent,
          y,
          size: 10,
          font,
          color: rgb(0.16, 0.2, 0.26)
        });

        y -= lineHeight;
      }

      y -= 8;
    }

    const bytes = await document.save();
    return Buffer.from(bytes);
  }
}
