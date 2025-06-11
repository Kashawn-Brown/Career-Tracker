/**
 * Document Service
 * 
 * Business logic layer for document operations.
 * Handles validation, business rules, and coordinates repository calls.
 * Manages document metadata operations.
 */

import { repositories } from '../repositories/index.js';
import {
  DocumentListFilters,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DocumentFilters,
  DocumentStats,
  DocumentListResponse
} from '../models/document.models.js';

export class DocumentService {
  /**
   * List documents with pagination and filtering
   */
  async listDocuments(filters: DocumentListFilters): Promise<DocumentListResponse> {
    const {
      page = 1,
      limit = 20,
      jobApplicationId,
      userId,
      type,
      filename,
      fileSizeMin,
      fileSizeMax,
      createdAfter,
      createdBefore,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    // Build repository filters
    const repositoryFilters: DocumentFilters = {};
    if (jobApplicationId) repositoryFilters.jobApplicationId = jobApplicationId;
    if (type) repositoryFilters.type = type;
    if (filename) repositoryFilters.filename = filename;
    if (fileSizeMin) repositoryFilters.fileSizeMin = fileSizeMin;
    if (fileSizeMax) repositoryFilters.fileSizeMax = fileSizeMax;
    if (createdAfter) repositoryFilters.createdAfter = new Date(createdAfter);
    if (createdBefore) repositoryFilters.createdBefore = new Date(createdBefore);

    // Build order by
    const orderBy = { [sortBy]: sortOrder };

    // Get documents based on whether we're filtering by user or job application
    if (userId) {
      const documents = await repositories.document.findByUser(
        userId,
        repositoryFilters,
        {
          pagination: { page, limit },
          orderBy
        }
      );

      // Return consistent format (repositories.document.findByUser might already return paginated format)
      if (Array.isArray(documents)) {
        // If it's just an array, wrap it with pagination info
        const total = documents.length;
        const pages = Math.ceil(total / limit);
        return {
          documents,
          pagination: { total, page, limit, pages }
        };
      } else {
        // If it's already in the expected format, return as-is
        return documents as DocumentListResponse;
      }
    } else if (jobApplicationId) {
      const documents = await repositories.document.findByJobApplication(jobApplicationId);
      
      // Apply pagination manually for job application filter
      const total = documents.length;
      const startIndex = (page - 1) * limit;
      const paginatedDocuments = documents.slice(startIndex, startIndex + limit);
      const pages = Math.ceil(total / limit);

      return {
        documents: paginatedDocuments,
        pagination: {
          total,
          page,
          limit,
          pages
        }
      };
    } else {
      throw new Error('Either userId or jobApplicationId is required for listing documents');
    }
  }

  /**
   * Get a single document by ID with relations
   */
  async getDocument(id: number, userId?: number) {
    const document = await repositories.document.findByIdWithRelations(id);

    if (!document) {
      throw new Error('Document not found');
    }

    // If userId is provided, verify the document belongs to the user through job application
    if (userId && document.jobApplication?.userId !== userId) {
      throw new Error('Document not found');
    }

    return document;
  }

  /**
   * Create a new document with business validation
   */
  async createDocument(data: CreateDocumentRequest) {
    // Validate required fields
    if (!data.jobApplicationId) {
      throw new Error('Job application ID is required');
    }

    if (!data.filename?.trim()) {
      throw new Error('Filename is required');
    }

    if (!data.originalName?.trim()) {
      throw new Error('Original filename is required');
    }

    if (!data.path?.trim()) {
      throw new Error('File path is required');
    }

    if (!data.fileSize || data.fileSize <= 0) {
      throw new Error('Valid file size is required');
    }

    if (!data.mimeType?.trim()) {
      throw new Error('MIME type is required');
    }

    // Verify job application exists
    const jobApplication = await repositories.jobApplication.findById(data.jobApplicationId);
    if (!jobApplication) {
      throw new Error('Job application not found');
    }

    // Determine document type if not provided
    const documentType = data.type || this.determineDocumentType(data.originalName, data.mimeType);

    // Create the document data for repository
    const createData = {
      filename: data.filename,
      originalName: data.originalName,
      path: data.path,
      fileUrl: data.path, // Using path as URL for local storage compatibility
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      type: documentType,
      jobApplication: { connect: { id: data.jobApplicationId } }
    };

    try {
      const document = await repositories.document.create(createData);
      
      // Fetch the created document with relations
      return await repositories.document.findByIdWithRelations(document.id);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Foreign key constraint')) {
        throw new Error('Invalid job application ID provided');
      }
      throw error;
    }
  }

  /**
   * Update an existing document with business validation
   */
  async updateDocument(id: number, data: UpdateDocumentRequest, userId?: number) {
    // Check if document exists
    const existingDocument = await repositories.document.findByIdWithRelations(id);
    if (!existingDocument) {
      throw new Error('Document not found');
    }

    // If userId is provided, verify the document belongs to the user
    if (userId && existingDocument.jobApplication?.userId !== userId) {
      throw new Error('Document not found');
    }

    // Validate data if provided
    if (data.filename !== undefined && !data.filename?.trim()) {
      throw new Error('Filename cannot be empty');
    }

    // Remove undefined values
    const updateData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );

    // Update document
    await repositories.document.update(id, updateData);

    // Fetch the updated document with relations
    return await repositories.document.findByIdWithRelations(id);
  }

  /**
   * Delete a document with business validation
   */
  async deleteDocument(id: number, userId?: number) {
    // Check if document exists
    const existingDocument = await repositories.document.findByIdWithRelations(id);
    if (!existingDocument) {
      throw new Error('Document not found');
    }

    // If userId is provided, verify the document belongs to the user
    if (userId && existingDocument.jobApplication?.userId !== userId) {
      throw new Error('Document not found');
    }

    // Delete the document from database
    await repositories.document.delete(id);

    return { success: true, message: 'Document deleted successfully' };
  }

  /**
   * Get documents by job application ID
   */
  async getDocumentsByJobApplication(jobApplicationId: number, userId?: number) {
    // Verify job application exists
    const jobApplication = await repositories.jobApplication.findById(jobApplicationId);
    if (!jobApplication) {
      throw new Error('Job application not found');
    }

    // If userId is provided, verify the job application belongs to the user
    if (userId && jobApplication.userId !== userId) {
      throw new Error('Job application not found');
    }

    return await repositories.document.findByJobApplication(jobApplicationId);
  }

  /**
   * Get document statistics for a user
   */
  async getDocumentStats(userId: number): Promise<DocumentStats> {
    return await repositories.document.getDocumentStats(userId);
  }

  /**
   * Search documents by filename
   */
  async searchDocuments(query: string, userId?: number, options?: { page?: number; limit?: number }) {
    if (!query?.trim()) {
      throw new Error('Search query is required');
    }

    return await repositories.document.searchDocuments(query, userId, options ? { pagination: options } : undefined);
  }

  /**
   * Get documents by type
   */
  async getDocumentsByType(type: string, userId?: number, options?: { page?: number; limit?: number }) {
    if (!type?.trim()) {
      throw new Error('Document type is required');
    }

    return await repositories.document.findByType(type, userId, options ? { pagination: options } : undefined);
  }

  /**
   * Get recent documents for a user
   */
  async getRecentDocuments(userId: number, daysBack: number = 30, limit: number = 10) {
    if (daysBack <= 0) {
      throw new Error('Days back must be a positive number');
    }

    if (limit <= 0 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    return await repositories.document.findRecentDocuments(userId, daysBack, limit);
  }

  /**
   * Update document metadata (filename, size, type)
   */
  async updateDocumentMetadata(
    id: number,
    metadata: { fileName?: string; fileSize?: number; type?: string },
    userId?: number
  ) {
    // Check if document exists
    const existingDocument = await repositories.document.findByIdWithRelations(id);
    if (!existingDocument) {
      throw new Error('Document not found');
    }

    // If userId is provided, verify the document belongs to the user
    if (userId && existingDocument.jobApplication?.userId !== userId) {
      throw new Error('Document not found');
    }

    // Validate metadata
    if (metadata.fileName !== undefined && !metadata.fileName?.trim()) {
      throw new Error('Filename cannot be empty');
    }

    if (metadata.fileSize !== undefined && metadata.fileSize <= 0) {
      throw new Error('File size must be positive');
    }

    // Update metadata
    await repositories.document.updateMetadata(id, metadata);

    // Return updated document
    return await repositories.document.findByIdWithRelations(id);
  }

  /**
   * Determine document type based on filename and MIME type
   */
  protected determineDocumentType(filename: string, mimeType: string): string {
    const extension = filename.toLowerCase().split('.').pop() || '';
    
    // Map common extensions to document types
    const typeMap: { [key: string]: string } = {
      'pdf': 'resume',
      'doc': 'cover_letter',
      'docx': 'cover_letter',
      'txt': 'other'
    };

    // Check MIME type patterns
    if (mimeType.includes('pdf')) {
      return 'resume';
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return 'cover_letter';
    } else if (mimeType.includes('text')) {
      return 'other';
    }

    // Fallback to extension-based determination
    return typeMap[extension] || 'other';
  }
}

// Export singleton instance
export const documentService = new DocumentService(); 