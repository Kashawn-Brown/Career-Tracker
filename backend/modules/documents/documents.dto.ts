import { DocumentKind } from "@prisma/client";

export const documentSelect = {
  id: true,
  kind: true,
  url: true,
  originalName: true,
  mimeType: true,
  size: true,
  createdAt: true,
  updatedAt: true,
}


export type upsertBaseResumeInput = {
  url: string;
  originalName: string;
  mimeType: string;
  size?: number;
  storageKey?: string;
};


// 
export type CreateApplicationDocumentInput = {
  kind: DocumentKind;
  storageKey: string;
  originalName: string;
  mimeType: string;
  size?: number;
};