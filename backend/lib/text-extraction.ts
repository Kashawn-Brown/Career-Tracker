// backend/lib/text-extraction.ts
import { PDFParse } from "pdf-parse";
import { AppError } from "../errors/app-error.js";

const DEFAULT_MAX_CHARS = 60_000;

/**
 * Extracts user-readable text from an uploaded document.
 * We send extracted text to AI tools (never raw PDF bytes).
 */
export async function extractTextFromBuffer(opts: {
  buffer: Buffer;
  mimeType: string;
  maxChars?: number;
}): Promise<string> {
  const { buffer, mimeType } = opts;
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;

  let raw = "";

  if (mimeType === "text/plain") {
    raw = buffer.toString("utf8");
  } else if (mimeType === "application/pdf") {
    // pdf-parse v2: instantiate parser, call getText(), then destroy()
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      raw = result.text ?? "";
    } catch (err) {
      // Keep this generic here; caller can map to a nicer UX message
      throw new AppError("Could not extract text from PDF.", 400);
    } finally {
      // v2 docs recommend always calling destroy() to free memory
      await parser.destroy();
    }
  } else {
    throw new AppError(`Unsupported file type for text extraction: ${mimeType}`, 400);
  }

  const normalized = normalizeText(raw);
  return normalized.length > maxChars ? normalized.slice(0, maxChars) : normalized;
}

/**
 * Light sanitization:
 * - normalize line endings
 * - trim line whitespace
 * - collapse excessive blank lines
 * - collapse long runs of spaces
 */
function normalizeText(input: string): string {
  const lines = input
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim());

  const joined = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  return joined.replace(/[ \t]{2,}/g, " ");
}
