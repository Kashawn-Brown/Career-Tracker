/**
 * Document Controller
 * 
 * Handles HTTP requests for document CRUD operations.
 * Implements proper error handling, validation, and response formatting.
 * Uses DocumentService and FileUploadService for business logic to maintain separation of concerns.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { documentService, fileUploadService, jobApplicationService } from '../services/index.js';
import type { DocumentListFilters } from '../models/document.models.js';

/**
 * Upload a document to a job application (POST /api/applications/:id/documents)
 */
export async function uploadDocument(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const jobApplicationId = parseInt(request.params.id, 10);
  const userId = request.user!.userId;

  try {

    if (isNaN(jobApplicationId)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid job application ID'
      });
    }

    // Validate that the job application exists and belongs to the user
    const jobApplication = await jobApplicationService.getJobApplication(jobApplicationId);
    if (!jobApplication || jobApplication.userId !== userId) {
      throw new Error('Job application not found');
    }

    // Check if file was uploaded (handled by upload middleware)
    if (!request.uploadedFile) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'No file uploaded'
      });
    }

    const uploadedFile = request.uploadedFile;

    // Store the file using FileUploadService
    const storeResult = await fileUploadService.storeUploadedFile(uploadedFile);
    
    if (!storeResult.success) {
      return reply.status(500).send({
        error: 'File Storage Error',
        message: 'Failed to store uploaded file to storage system',
        details: {
          originalName: uploadedFile.originalName,
          fileSize: uploadedFile.size,
          mimeType: uploadedFile.mimeType,
          storageError: storeResult.error,
          timestamp: new Date().toISOString(),
          operation: 'file_storage'
        }
      });
    }

    // Create document metadata using DocumentService
    const documentData = {
      jobApplicationId,
      filename: uploadedFile.filename,
      originalName: uploadedFile.originalName,
      path: storeResult.filePath || uploadedFile.path,
      fileSize: uploadedFile.size,
      mimeType: uploadedFile.mimeType
    };

    let document;
    try {
      document = await documentService.createDocument(documentData);
    } catch (dbError) {
      // If database operation fails, attempt to clean up stored file
      const cleanupPath = storeResult.filePath || uploadedFile.path;
      if (cleanupPath) {
        try {
          const cleanupResult = await fileUploadService.deleteFile(cleanupPath);
          request.log.info(`File cleanup ${cleanupResult.success ? 'successful' : 'failed'} after database error`);
        } catch (cleanupError) {
          request.log.error('Failed to cleanup file after database error:', cleanupError);
        }
      }

      return reply.status(500).send({
        error: 'Database Operation Error',
        message: 'Failed to save document metadata to database',
        details: {
          originalName: uploadedFile.originalName,
          fileSize: uploadedFile.size,
          jobApplicationId,
          dbError: dbError instanceof Error ? dbError.message : 'Unknown database error',
          cleanupAttempted: !!cleanupPath,
          timestamp: new Date().toISOString(),
          operation: 'document_creation'
        }
      });
    }
    
    return reply.status(201).send(document);
  } catch (error) {
    request.log.error('Error uploading document:', error);

    // Handle specific business logic errors with enhanced responses
    if (error instanceof Error) {
      // Job application not found
      if (error.message === 'Job application not found') {
        console.log('🔍 DEBUG VALUES:');
        console.log('jobApplicationId:', jobApplicationId, 'type:', typeof jobApplicationId);
        console.log('userId:', userId, 'type:', typeof userId);
        console.log('request.user:', request.user);
        
        return reply.status(404).send({
          error: 'Resource Not Found',
          message: 'The specified job application does not exist or you do not have access to it',
          details: {
            jobApplicationId,
            userId,
            timestamp: new Date().toISOString(),
            operation: 'application_validation'
          }
        });
        
        
      }
      
      // Validation errors
      if (error.message.includes('required') || error.message.includes('Invalid')) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.message,
          details: {
            jobApplicationId,
            timestamp: new Date().toISOString(),
            operation: 'input_validation'
          }
        });
      }

      // Permission/Authorization errors
      if (error.message.includes('permission') || error.message.includes('unauthorized') || error.message.includes('access')) {
        return reply.status(403).send({
          error: 'Access Forbidden',
          message: 'You do not have permission to upload documents to this job application',
          details: {
            jobApplicationId,
            userId,
            timestamp: new Date().toISOString(),
            operation: 'authorization_check'
          }
        });
      }

      // File size or type errors
      if (error.message.includes('file size') || error.message.includes('file type') || error.message.includes('mime')) {
        return reply.status(413).send({
          error: 'File Validation Error',
          message: error.message,
          details: {
            timestamp: new Date().toISOString(),
            operation: 'file_validation'
          }
        });
      }
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred during document upload',
      details: {
        timestamp: new Date().toISOString(),
        operation: 'document_upload',
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      }
    });
  }
}

/**
 * List documents for a job application (GET /api/applications/:id/documents)
 */
export async function listDocuments(
  request: FastifyRequest<{ 
    Params: { id: string };
    Querystring: DocumentListFilters;
  }>,
  reply: FastifyReply
) {
  try {
    const jobApplicationId = parseInt(request.params.id, 10);
    const userId = request.user!.userId;

    if (isNaN(jobApplicationId)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid job application ID'
      });
    }

    // Build filters including jobApplicationId
    const filters: DocumentListFilters = {
      ...request.query,
      jobApplicationId,
      userId // Ensure user can only see their own documents
    };

    const result = await documentService.listDocuments(filters);
    return reply.status(200).send(result);
  } catch (error) {
    request.log.error('Error listing documents:', error);

    // Handle specific business logic errors
    if (error instanceof Error) {
      if (error.message.includes('required')) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message
        });
      }
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to retrieve documents'
    });
  }
}

/**
 * Get a single document by ID (GET /api/applications/:id/documents/:documentId)
 */
export async function getDocument(
  request: FastifyRequest<{ Params: { id: string; documentId: string } }>,
  reply: FastifyReply
) {
  try {
    const jobApplicationId = parseInt(request.params.id, 10);
    const documentId = parseInt(request.params.documentId, 10);
    const userId = request.user!.userId;

    if (isNaN(jobApplicationId) || isNaN(documentId)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid job application ID or document ID'
      });
    }

    const document = await documentService.getDocument(documentId, userId);

    // Verify document belongs to the specified job application
    if (document.jobApplication?.id !== jobApplicationId) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Document not found for this job application'
      });
    }

    return reply.status(200).send(document);
  } catch (error) {
    request.log.error('Error getting document:', error);

    // Handle specific business logic errors
    if (error instanceof Error && error.message === 'Document not found') {
      return reply.status(404).send({
        error: 'Not Found',
        message: error.message
      });
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to retrieve document'
    });
  }
}

/**
 * Delete a document by ID (DELETE /api/applications/:id/documents/:documentId)
 */
export async function deleteDocument(
  request: FastifyRequest<{ Params: { id: string; documentId: string } }>,
  reply: FastifyReply
) {
  try {
    const jobApplicationId = parseInt(request.params.id, 10);
    const documentId = parseInt(request.params.documentId, 10);
    const userId = request.user!.userId;

    if (isNaN(jobApplicationId) || isNaN(documentId)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid job application ID or document ID'
      });
    }

    // First get the document to verify ownership and get file path
    const document = await documentService.getDocument(documentId, userId);

    // Verify document belongs to the specified job application
    if (document.jobApplication?.id !== jobApplicationId) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Document not found for this job application'
      });
    }

    // Delete the physical file using FileUploadService
    const filePath = document.path || document.fileUrl;
    if (filePath) {
      const deleteFileResult = await fileUploadService.deleteFile(filePath);
      if (!deleteFileResult.success) {
        request.log.warn('Failed to delete physical file:', deleteFileResult.error);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete document metadata using DocumentService
    const result = await documentService.deleteDocument(documentId, userId);

    return reply.status(200).send({
      success: true,
      message: 'Document deleted successfully',
      deletedDocument: {
        id: document.id,
        filename: document.filename,
        originalName: document.originalName
      }
    });
  } catch (error) {
    request.log.error('Error deleting document:', error);

    // Handle specific business logic errors
    if (error instanceof Error && error.message === 'Document not found') {
      return reply.status(404).send({
        error: 'Not Found',
        message: error.message
      });
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to delete document'
    });
  }
} 