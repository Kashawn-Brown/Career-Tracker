/**
 * Document Models
 * 
 * Defines TypeScript interfaces and types for document-related entities.
 * These models represent the structure of document data used throughout the application.
 */

import { Document, JobApplication } from '@prisma/client';

/**
 * Document with related entities
 */
export type DocumentWithRelations = Document & {
  jobApplication?: JobApplication;
};

/**
 * Filters for listing documents
 */
export interface DocumentListFilters {
  page?: number;
  limit?: number;
  jobApplicationId?: number;
  userId?: number;
  type?: string;
  filename?: string;
  fileSizeMin?: number;
  fileSizeMax?: number;
  createdAfter?: string;
  createdBefore?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Request for creating a new document
 */
export interface CreateDocumentRequest {
  jobApplicationId: number;
  filename: string;
  originalName: string;
  path: string;
  fileSize: number;
  mimeType: string;
  type?: string;
}

/**
 * Request for updating an existing document
 */
export interface UpdateDocumentRequest {
  filename?: string;
  type?: string;
}

/**
 * Repository-level filters for documents (with Date objects)
 */
export interface DocumentFilters {
  jobApplicationId?: number;
  type?: string;
  filename?: string;
  fileSizeMin?: number;
  fileSizeMax?: number;
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * File upload information from middleware
 */
export interface UploadedFileInfo {
  originalName: string;
  filename: string;
  path: string;
  size: number;
  mimeType: string;
  uploadDate: Date;
}

/**
 * Document statistics
 */
export interface DocumentStats {
  total: number;
  byType: { type: string; count: number }[];
  byFileExtension: { extension: string; count: number }[];
  totalSize: number;
  averageSize: number;
  recentUploads: number;
}

/**
 * Response format for document listings with pagination
 */
export interface DocumentListResponse {
  documents: DocumentWithRelations[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
} 