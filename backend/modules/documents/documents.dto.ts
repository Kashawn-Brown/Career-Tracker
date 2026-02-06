import { DocumentKind } from "@prisma/client";

export const documentSelect = {
  id: true,
  userId: true,
  kind: true,
  url: true,
  originalName: true,
  mimeType: true,
  size: true,
  jobApplicationId: true,
  createdAt: true,
  updatedAt: true,
}

/**
 * Base Resume upsert input.
 *
 * - The file is uploaded to GCS first, then the metadata is persisted to the database.
 * - url is stored as null (download is via signed URL endpoint when needed).
 */
export type UploadBaseResumeArgs = {
  userId: string;
  stream: NodeJS.ReadableStream;
  filename: string;
  mimeType: string;
  isTruncated?: boolean;
  signal?: AbortSignal;
};

// Upload application document input.
export type UploadApplicationDocumentArgs = {
  userId: string;
  jobApplicationId: string;
  kind: DocumentKind;
  stream: NodeJS.ReadableStream;
  filename: string;
  mimeType: string;
  isTruncated?: boolean;
  signal?: AbortSignal;
};
