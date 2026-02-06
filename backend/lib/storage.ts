import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { getGcsConfig, getStorageClient } from "./gcs.js";
import { AppError } from "../errors/app-error.js";
import { throwIfAborted } from "./request-abort.js";

/**
 * Storage helper functions for GCS.
 */

// Disposition type for a signed URL
export type SignedUrlDisposition = "inline" | "attachment";

// Arguments type for the upload stream function
export type UploadStreamArgs = {
  storageKey: string;
  stream: NodeJS.ReadableStream;
  contentType: string;
  /**
   * fastify-multipart marks the underlying stream as truncated if it hit the fileSize limit.
   * We pass this in from the route because it’s request-parser specific.
   */
  isTruncated?: boolean;

  // Optional: abort upload if the client cancels the request.
  signal?: AbortSignal;
};

// Result type of the upload stream function
export type UploadStreamResult = { sizeBytes: number };

/**
 * Uploads a stream to GCS and returns the number of bytes written.
 * 
 * This function:
 * - counts bytes while streaming
 * - performs best-effort cleanup if the upload fails
 */
export async function uploadStreamToGcs({
  storageKey,
  stream,
  contentType,
  isTruncated,
  signal,
}: UploadStreamArgs): Promise<UploadStreamResult> {
  const cfg = getGcsConfig();
  const bucket = getStorageClient().bucket(cfg.bucketName);
  const gcsFile = bucket.file(storageKey);

  // If request is already cancelled, bail early.
  throwIfAborted(signal);

  let bytes = 0;
  const counter = new Transform({
    transform(chunk, _enc, cb) {
      bytes += chunk.length;
      cb(null, chunk);
    },
  });

  try {
    await pipeline(
      stream,
      counter,
      gcsFile.createWriteStream({
        resumable: false,
        metadata: { contentType },
      }),
      { signal }
    );
  } catch (err) {
    await deleteGcsObject(storageKey);
    throw err;
  }

  // If the client cancelled right as the upload finished, treat as cancelled + cleanup.
  if (signal?.aborted) {
    await deleteGcsObject(storageKey);
    throwIfAborted(signal);
  }

  // If multipart parser truncated the stream, delete the partial object and fail.
  if (isTruncated) {
    await deleteGcsObject(storageKey);
    const max = cfg.maxUploadBytes;
    throw new AppError(`File too large. Max upload is ${max} bytes.`, 413);
  }

  return { sizeBytes: bytes };
}

/**
 * Generates a short-lived signed read URL for a GCS object.
 * 
 * - creates a temporary, secure download link to a file stored in GCS
 */
export async function getSignedReadUrl(opts: {
  storageKey: string;
  filename: string;
  disposition?: SignedUrlDisposition;
}): Promise<string> {
  const cfg = getGcsConfig();
  const bucket = getStorageClient().bucket(cfg.bucketName);

  const disposition = opts.disposition ?? "inline";
  const safeName = (opts.filename || "document").replace(/[\r\n"]/g, "").slice(0, 150);

  const [url] = await bucket.file(opts.storageKey).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + cfg.signedUrlTtlSeconds * 1000,
    responseDisposition: `${disposition}; filename="${safeName}"`,  // Controls “open in browser” vs “force download”
  });

  return url;
}

/**
 * Delete a GCS object. 
 * 
 * Safe to call even if object doesn’t exist.
 */
export async function deleteGcsObject(storageKey: string): Promise<void> {
  try {
    const cfg = getGcsConfig();
    const bucket = getStorageClient().bucket(cfg.bucketName);
    await bucket.file(storageKey).delete({ ignoreNotFound: true });
  } catch {
    // Swallow errors: deletes are best-effort in this phase
  }
}


/**
 * Downloads a GCS object into memory as a Buffer.
 *
 * Used for server-side processing (ex: PDF/TXT -> text extraction).
 * Guarded by maxBytes to avoid pulling very large files into memory.
 */
export async function downloadGcsObjectToBuffer(opts: {
  storageKey: string;
  maxBytes?: number;
}): Promise<Buffer> {
  const cfg = getGcsConfig();
  const bucket = getStorageClient().bucket(cfg.bucketName);
  const file = bucket.file(opts.storageKey);

  const maxBytes = opts.maxBytes ?? cfg.maxUploadBytes;

  // Best-effort size check (metadata can be missing in some edge cases)
  const [meta] = await file.getMetadata();
  const size = Number(meta.size ?? 0);
  if (Number.isFinite(size) && size > maxBytes) {
    throw new AppError(`File too large to process. Max is ${maxBytes} bytes.`, 413);
  }

  const [buf] = await file.download();

  // Safety check in case metadata was missing/incorrect.
  if (buf.length > maxBytes) {
    throw new AppError(`File too large to process. Max is ${maxBytes} bytes.`, 413);
  }

  return buf;
}






// ---------------- HELPER FUNCTIONS ----------------


/**
 * Server-side MIME enforcement.
 * 
 * Don’t trust UI.
 * Checks if the mime type is allowed.
 */
export function isAllowedMimeType(mimeType: string): boolean {
  const cfg = getGcsConfig();
  return cfg.allowedMimeTypes.has(mimeType);
}
