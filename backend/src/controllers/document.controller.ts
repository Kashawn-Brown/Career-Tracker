/**
 * Document Controller
 * 
 * Handles HTTP requests for document CRUD operations.
 * Implements proper error handling, validation, and response formatting.
 * Uses DocumentService and FileUploadService for business logic to maintain separation of concerns.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { documentService, fileUploadService } from '../services/index.js';
import type { DocumentListFilters } from '../models/document.models.js';

/**
 * Upload a document to a job application (POST /api/applications/:id/documents)
 */
export async function uploadDocument(
  request: FastifyRequest<{ Params: { id: string } }>,
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
        error: 'Internal Server Error',
        message: 'Failed to store uploaded file',
        details: storeResult.error
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

    const document = await documentService.createDocument(documentData);
    
    return reply.status(201).send(document);
  } catch (error) {
    request.log.error('Error uploading document:', error);

    // Handle specific business logic errors
    if (error instanceof Error) {
      if (error.message === 'Job application not found') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      
      if (error.message.includes('required') || error.message.includes('Invalid')) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message
        });
      }
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to upload document'
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