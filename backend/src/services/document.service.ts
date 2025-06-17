/**
 * Document Service
 * 
 * Business logic layer for document operations.
 * Handles validation, business rules, and coordinates repository calls.
 * Manages document metadata operations with standardized result patterns.
 */

import { repositories } from '../repositories/index.js';
import { fileUploadService, jobApplicationService } from './index.js';
import {
  DocumentListFilters,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DocumentFilters,
  DocumentStats,
  DocumentListResponse,
  UploadDocumentResult,
  ListDocumentsResult,
  GetDocumentResult,
  UpdateDocumentResult,
  DeleteDocumentResult,
  SearchDocumentsResult,
  DocumentStatsResult,
  UploadedFileInfo
} from '../models/document.models.js';

export class DocumentService {

  // CORE DOCUMENT OPERATIONS

  /**
   * Upload a document with comprehensive validation and file handling
   * Handles the complete upload flow: validation, storage, metadata creation
   */
  async uploadDocument(
    jobApplicationId: number,
    userId: number,
    uploadedFile: UploadedFileInfo
  ): Promise<UploadDocumentResult> {
    try {
      // Validate job application exists and belongs to user
      const jobApplication = await jobApplicationService.getJobApplication(jobApplicationId);
      if (!jobApplication || jobApplication.userId !== userId) {
        return {
          success: false,
          statusCode: 404,
          error: 'Resource Not Found',
          message: 'The specified job application does not exist or you do not have access to it',
          details: {
            jobApplicationId,
            userId,
            operation: 'application_validation'
          }
        };
      }

      // Store the file using FileUploadService
      const storeResult = await fileUploadService.storeUploadedFile(uploadedFile);
      
      if (!storeResult.success) {
        return {
          success: false,
          statusCode: 500,
          error: 'File Storage Error',
          message: 'Failed to store uploaded file to storage system',
          storageError: storeResult.error,
          details: {
            originalName: uploadedFile.originalName,
            fileSize: uploadedFile.size,
            mimeType: uploadedFile.mimeType,
            operation: 'file_storage'
          }
        };
      }

      // Create document metadata
      const documentData: CreateDocumentRequest = {
        jobApplicationId,
        filename: uploadedFile.filename,
        originalName: uploadedFile.originalName,
        path: storeResult.filePath || uploadedFile.path,
        fileSize: uploadedFile.size,
        mimeType: uploadedFile.mimeType
      };

      const createResult = await this.createDocument(documentData);
      
      if (!createResult.success) {
        // Attempt to clean up stored file if database operation fails
        const cleanupPath = storeResult.filePath || uploadedFile.path;
        let cleanupAttempted = false;
        
        if (cleanupPath) {
          try {
            const cleanupResult = await fileUploadService.deleteFile(cleanupPath);
            cleanupAttempted = true;
          } catch (cleanupError) {
            console.error('Failed to cleanup file after database error:', cleanupError);
          }
        }

        return {
          success: false,
          statusCode: 500,
          error: 'Database Operation Error',
          message: 'Failed to save document metadata to database',
          cleanupAttempted,
          details: {
            originalName: uploadedFile.originalName,
            fileSize: uploadedFile.size,
            jobApplicationId,
            dbError: createResult.error,
            operation: 'document_creation'
          }
        };
      }

      return {
        success: true,
        statusCode: 201,
        message: 'Document uploaded successfully',
        document: createResult.document
      };

    } catch (error) {
      console.error('Document upload error:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred during document upload',
        details: {
          operation: 'document_upload',
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }

  /**
   * List documents with pagination and filtering
   */
  async listDocuments(filters: DocumentListFilters): Promise<ListDocumentsResult> {
    try {
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

      // Validate either userId or jobApplicationId is provided
      if (!userId && !jobApplicationId) {
        return {
          success: false,
          statusCode: 400,
          error: 'Bad Request',
          message: 'Either userId or jobApplicationId is required for listing documents'
        };
      }

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

      let result: DocumentListResponse;

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

        // Return consistent format
        if (Array.isArray(documents)) {
          const total = documents.length;
          const pages = Math.ceil(total / limit);
          result = {
            documents,
            pagination: { total, page, limit, pages }
          };
        } else {
          result = documents as DocumentListResponse;
        }
      } else if (jobApplicationId) {
        const documents = await repositories.document.findByJobApplication(jobApplicationId);
        
        // Apply pagination manually for job application filter
        const total = documents.length;
        const startIndex = (page - 1) * limit;
        const paginatedDocuments = documents.slice(startIndex, startIndex + limit);
        const pages = Math.ceil(total / limit);

        result = {
          documents: paginatedDocuments,
          pagination: { total, page, limit, pages }
        };
      }

      return {
        success: true,
        statusCode: 200,
        message: 'Documents retrieved successfully',
        documents: result!.documents,
        pagination: result!.pagination
      };

    } catch (error) {
      console.error('Error listing documents:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to retrieve documents',
        details: {
          operation: 'list_documents',
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }

  /**
   * Get a single document by ID with relations
   */
  async getDocument(id: number, userId?: number): Promise<GetDocumentResult> {
    try {
      const document = await repositories.document.findByIdWithRelations(id);

      if (!document) {
        return {
          success: false,
          statusCode: 404,
          error: 'Not Found',
          message: 'Document not found'
        };
      }

      // If userId is provided, verify the document belongs to the user through job application
      if (userId && document.jobApplication?.userId !== userId) {
        return {
          success: false,
          statusCode: 404,
          error: 'Not Found',
          message: 'Document not found'
        };
      }

      return {
        success: true,
        statusCode: 200,
        message: 'Document retrieved successfully',
        document
      };

    } catch (error) {
      console.error('Error getting document:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to retrieve document',
        details: {
          operation: 'get_document',
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }

  /**
   * Create a new document with business validation
   */
  async createDocument(data: CreateDocumentRequest): Promise<UpdateDocumentResult> {
    try {
      // Validate required fields
      if (!data.jobApplicationId) {
        return {
          success: false,
          statusCode: 400,
          error: 'Validation Error',
          message: 'Job application ID is required'
        };
      }

      if (!data.filename?.trim()) {
        return {
          success: false,
          statusCode: 400,
          error: 'Validation Error',
          message: 'Filename is required'
        };
      }

      if (!data.originalName?.trim()) {
        return {
          success: false,
          statusCode: 400,
          error: 'Validation Error',
          message: 'Original filename is required'
        };
      }

      if (!data.path?.trim()) {
        return {
          success: false,
          statusCode: 400,
          error: 'Validation Error',
          message: 'File path is required'
        };
      }

      if (!data.fileSize || data.fileSize <= 0) {
        return {
          success: false,
          statusCode: 400,
          error: 'Validation Error',
          message: 'Valid file size is required'
        };
      }

      if (!data.mimeType?.trim()) {
        return {
          success: false,
          statusCode: 400,
          error: 'Validation Error',
          message: 'MIME type is required'
        };
      }

      // Verify job application exists
      const jobApplication = await repositories.jobApplication.findById(data.jobApplicationId);
      if (!jobApplication) {
        return {
          success: false,
          statusCode: 404,
          error: 'Not Found',
          message: 'Job application not found'
        };
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

      const document = await repositories.document.create(createData);
      
      // Fetch the created document with relations
      const documentWithRelations = await repositories.document.findByIdWithRelations(document.id);

      return {
        success: true,
        statusCode: 201,
        message: 'Document created successfully',
        document: documentWithRelations!
      };

    } catch (error) {
      console.error('Error creating document:', error);
      
      if (error instanceof Error && error.message.includes('Foreign key constraint')) {
        return {
          success: false,
          statusCode: 400,
          error: 'Validation Error',
          message: 'Invalid job application ID provided'
        };
      }

      return {
        success: false,
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to create document',
        details: {
          operation: 'create_document',
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }

  /**
   * Update an existing document with business validation
   */
  async updateDocument(id: number, data: UpdateDocumentRequest, userId?: number): Promise<UpdateDocumentResult> {
    try {
      // Check if document exists
      const existingDocument = await repositories.document.findByIdWithRelations(id);
      if (!existingDocument) {
        return {
          success: false,
          statusCode: 404,
          error: 'Not Found',
          message: 'Document not found'
        };
      }

      // If userId is provided, verify the document belongs to the user
      if (userId && existingDocument.jobApplication?.userId !== userId) {
        return {
          success: false,
          statusCode: 404,
          error: 'Not Found',
          message: 'Document not found'
        };
      }

      // Validate data if provided
      if (data.filename !== undefined && !data.filename?.trim()) {
        return {
          success: false,
          statusCode: 400,
          error: 'Validation Error',
          message: 'Filename cannot be empty'
        };
      }

      // Remove undefined values and build update data
      const updateData: any = {};
      if (data.filename !== undefined) updateData.filename = data.filename;
      if (data.type !== undefined) updateData.type = data.type;

      // If no fields to update, return success
      if (Object.keys(updateData).length === 0) {
        return {
          success: true,
          statusCode: 200,
          message: 'Document updated successfully (no changes)',
          document: existingDocument
        };
      }

      await repositories.document.update(id, updateData);
      const documentWithRelations = await repositories.document.findByIdWithRelations(id);

      return {
        success: true,
        statusCode: 200,
        message: 'Document updated successfully',
        document: documentWithRelations!
      };

    } catch (error) {
      console.error('Error updating document:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to update document',
        details: {
          operation: 'update_document',
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }

  /**
   * Delete a document with business validation and file cleanup
   */
  async deleteDocument(id: number, userId?: number): Promise<DeleteDocumentResult> {
    try {
      // Check if document exists
      const existingDocument = await repositories.document.findByIdWithRelations(id);
      if (!existingDocument) {
        return {
          success: false,
          statusCode: 404,
          error: 'Not Found',
          message: 'Document not found'
        };
      }

      // If userId is provided, verify the document belongs to the user
      if (userId && existingDocument.jobApplication?.userId !== userId) {
        return {
          success: false,
          statusCode: 404,
          error: 'Not Found',
          message: 'Document not found'
        };
      }

      // Attempt to delete the physical file
      let fileCleanupSuccess = false;
      const filePath = existingDocument.path || existingDocument.fileUrl;
      
      if (filePath) {
        try {
          const deleteFileResult = await fileUploadService.deleteFile(filePath);
          fileCleanupSuccess = deleteFileResult.success;
          if (!deleteFileResult.success) {
            console.warn('Failed to delete physical file:', deleteFileResult.error);
          }
        } catch (fileError) {
          console.warn('Error deleting physical file:', fileError);
          // Continue with database deletion even if file deletion fails
        }
      }

      // Delete document metadata from database
      await repositories.document.delete(id);

      return {
        success: true,
        statusCode: 200,
        message: 'Document deleted successfully',
        fileCleanupSuccess,
        deletedDocument: {
          id: existingDocument.id,
          filename: existingDocument.filename,
          originalName: existingDocument.originalName
        }
      };

    } catch (error) {
      console.error('Error deleting document:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to delete document',
        details: {
          operation: 'delete_document',
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }

  // ADDITIONAL DOCUMENT OPERATIONS

  /**
   * Get documents by job application ID
   */
  async getDocumentsByJobApplication(jobApplicationId: number, userId?: number): Promise<ListDocumentsResult> {
    return this.listDocuments({ jobApplicationId, userId });
  }

  /**
   * Get document statistics for a user
   */
  async getDocumentStats(userId: number): Promise<DocumentStatsResult> {
    try {
      const stats = await repositories.document.getDocumentStats(userId);
      
      return {
        success: true,
        statusCode: 200,
        message: 'Document statistics retrieved successfully',
        stats
      };

    } catch (error) {
      console.error('Error getting document stats:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to retrieve document statistics',
        details: {
          operation: 'get_document_stats',
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }

  /**
   * Search documents by query
   */
  async searchDocuments(
    query: string, 
    userId?: number, 
    options?: { page?: number; limit?: number }
  ): Promise<SearchDocumentsResult> {
    try {
      if (!query?.trim()) {
        return {
          success: false,
          statusCode: 400,
          error: 'Bad Request',
          message: 'Search query is required'
        };
      }

      const documents = await repositories.document.searchDocuments(query, userId, options ? { pagination: options } : undefined);
      
      // Calculate pagination if options provided
      let pagination;
      if (options?.page && options?.limit) {
        const total = documents.length;
        pagination = {
          total,
          page: options.page,
          limit: options.limit,
          pages: Math.ceil(total / options.limit)
        };
      }

      return {
        success: true,
        statusCode: 200,
        message: 'Document search completed successfully',
        documents,
        pagination
      };

    } catch (error) {
      console.error('Error searching documents:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to search documents',
        details: {
          operation: 'search_documents',
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }

  /**
   * Get documents by type
   */
  async getDocumentsByType(
    type: string, 
    userId?: number, 
    options?: { page?: number; limit?: number }
  ): Promise<SearchDocumentsResult> {
    try {
      if (!type?.trim()) {
        return {
          success: false,
          statusCode: 400,
          error: 'Bad Request',
          message: 'Document type is required'
        };
      }

      const documents = await repositories.document.findByType(type, userId, options ? { pagination: options } : undefined);
      
      // Calculate pagination if options provided
      let pagination;
      if (options?.page && options?.limit) {
        const total = documents.length;
        pagination = {
          total,
          page: options.page,
          limit: options.limit,
          pages: Math.ceil(total / options.limit)
        };
      }

      return {
        success: true,
        statusCode: 200,
        message: 'Documents by type retrieved successfully',
        documents,
        pagination
      };

    } catch (error) {
      console.error('Error getting documents by type:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to retrieve documents by type',
        details: {
          operation: 'get_documents_by_type',
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }

  /**
   * Get recent documents for a user
   */
  async getRecentDocuments(
    userId: number, 
    daysBack: number = 30, 
    limit: number = 10
  ): Promise<SearchDocumentsResult> {
    try {
      if (daysBack <= 0) {
        return {
          success: false,
          statusCode: 400,
          error: 'Bad Request',
          message: 'Days back must be a positive number'
        };
      }

      if (limit <= 0 || limit > 100) {
        return {
          success: false,
          statusCode: 400,
          error: 'Bad Request',
          message: 'Limit must be between 1 and 100'
        };
      }

      const documents = await repositories.document.findRecentDocuments(userId, daysBack, limit);

      return {
        success: true,
        statusCode: 200,
        message: 'Recent documents retrieved successfully',
        documents
      };

    } catch (error) {
      console.error('Error getting recent documents:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to retrieve recent documents',
        details: {
          operation: 'get_recent_documents',
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }

  // HELPER METHODS

  /**
   * Determine document type based on filename and MIME type
   */
  protected determineDocumentType(filename: string, mimeType: string): string {
    const extension = filename.toLowerCase().split('.').pop() || '';
    
    // Map common file types
    const typeMap: { [key: string]: string } = {
      'pdf': 'resume',
      'doc': 'cover_letter',
      'docx': 'cover_letter',
      'txt': 'other',
      'jpg': 'portfolio',
      'jpeg': 'portfolio',
      'png': 'portfolio',
      'gif': 'portfolio'
    };

    // Check by extension first
    if (typeMap[extension]) {
      return typeMap[extension];
    }

    // Fall back to MIME type
    if (mimeType.startsWith('image/')) {
      return 'portfolio';
    } else if (mimeType === 'application/pdf') {
      return 'resume';
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return 'cover_letter';
    }

    return 'other';
  }
}

// Export singleton instance
export const documentService = new DocumentService(); 