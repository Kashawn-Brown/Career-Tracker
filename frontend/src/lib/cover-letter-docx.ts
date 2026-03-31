/**
 * cover-letter-docx.ts
 *
 * Converts a CoverLetterPayload into a downloadable, formatted Word document.
 * Uses the `docx` library to build the file client-side — no backend needed.
 *
 * Document structure:
 *   - Each paragraph of the draft on its own line with proper spacing
 *   - Placeholders reminder at the end (if any exist in the draft)
 */

import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    BorderStyle,
  } from "docx";
  import type { CoverLetterPayload } from "@/types/api";
  
  // Standard letter body font settings
  const BODY_FONT    = "Calibri";
  const BODY_SIZE    = 24; // half-points (24 = 12pt)
  const HEADING_SIZE = 28; // 14pt
  
  /**
   * Generates a formatted .docx blob from the cover letter payload.
   * The caller is responsible for triggering the browser download.
   */
  export async function generateCoverLetterDocx(payload: CoverLetterPayload): Promise<Blob> {
    const children: Paragraph[] = [];
  
    // ── Title ──────────────────────────────────────────────────────────────────
    children.push(
      new Paragraph({
        text: "Cover Letter",
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        run: { size: HEADING_SIZE, font: BODY_FONT, bold: true },
      })
    );
  
    // ── Draft body ─────────────────────────────────────────────────────────────
    // Split on double newlines first (section breaks), then single newlines.
    // Each chunk becomes its own paragraph so spacing looks natural in Word.
    const draftBlocks = payload.draft
      .split(/\n\n+/)
      .map((block) => block.trim())
      .filter(Boolean);
  
    for (const block of draftBlocks) {
      // Within a block, single newlines become soft line breaks inside one paragraph
      const lines = block.split("\n");
      const runs: TextRun[] = [];
  
      lines.forEach((line, idx) => {
        runs.push(new TextRun({ text: line, font: BODY_FONT, size: BODY_SIZE }));
        // Add a line break after each line except the last in the block
        if (idx < lines.length - 1) {
          runs.push(new TextRun({ break: 1 }));
        }
      });
  
      children.push(
        new Paragraph({
          children: runs,
          spacing: { after: 200 }, // ~10pt spacing between paragraphs
        })
      );
    }
  
    // ── Placeholders reminder ──────────────────────────────────────────────────
    // Only shown if there are placeholders so the user knows what to fill in
    if (payload.placeholders.length > 0) {
      // Horizontal rule via a top-bordered paragraph
      children.push(
        new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" } },
          spacing: { before: 400, after: 200 },
        })
      );
  
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Placeholders to fill in:",
              font: BODY_FONT,
              size: BODY_SIZE,
              bold: true,
            }),
          ],
          spacing: { after: 120 },
        })
      );
  
      for (const placeholder of payload.placeholders) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `• ${placeholder}`,
                font: BODY_FONT,
                size: BODY_SIZE,
                color: "C05000", // amber-ish — stands out as a reminder
              }),
            ],
            spacing: { after: 80 },
          })
        );
      }
    }
  
    // ── Build document ─────────────────────────────────────────────────────────
    const doc = new Document({
      // Standard letter page margins (1 inch = 1440 twips)
      sections: [
        {
          properties: {
            page: {
              margin: {
                top:    1440,
                bottom: 1440,
                left:   1440,
                right:  1440,
              },
            },
          },
          children,
        },
      ],
    });
  
    return Packer.toBlob(doc);
  }
  
  /**
   * Triggers a browser download of the generated .docx file.
   * Creates and revokes an object URL so no memory is leaked.
   */
  export function downloadDocx(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }