/**
 * Document Controller
 * 
 * Handles HTTP requests for document CRUD operations.
 * Implements clean request/response handling following established auth patterns.
 * Uses DocumentService for business logic to maintain separation of concerns.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { documentService } from '../services/index.js';
import type { DocumentListFilters, UploadedFileInfo } from '../models/document.models.js';

export class DocumentController {

  /**
   * Upload a document to a job application (POST /api/applications/:id/documents)
   */
  async uploadDocument(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    // Validate route parameters
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

    const uploadedFile: UploadedFileInfo = {
      originalName: request.uploadedFile.originalName,
      filename: request.uploadedFile.filename,
      path: request.uploadedFile.path,
      size: request.uploadedFile.size,
      mimeType: request.uploadedFile.mimeType,
      uploadDate: new Date()
    };

    // Call service for business logic
    const result = await documentService.uploadDocument(jobApplicationId, userId, uploadedFile);

    // Map service result to HTTP response
    if (!result.success) {
      const response: any = { error: result.error };
      if (result.message) response.message = result.message;
      if (result.details) response.details = result.details;
      return reply.status(result.statusCode).send(response);
    }

    return reply.status(result.statusCode).send(result.document);
  }

  /**
   * List documents for a job application (GET /api/applications/:id/documents)
   */
  async listDocuments(
    request: FastifyRequest<{ 
      Params: { id: string };
      Querystring: DocumentListFilters;
    }>,
    reply: FastifyReply
  ) {
    // Validate route parameters
    const jobApplicationId = parseInt(request.params.id, 10);
    const userId = request.user!.userId;

    if (isNaN(jobApplicationId)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid job application ID'
      });
    }

    // Build filters including jobApplicationId and userId
    const filters: DocumentListFilters = {
      ...request.query,
      jobApplicationId,
      userId // Ensure user can only see their own documents
    };

    // Call service for business logic
    const result = await documentService.listDocuments(filters);

    // Map service result to HTTP response
    if (!result.success) {
      const response: any = { error: result.error };
      if (result.message) response.message = result.message;
      if (result.details) response.details = result.details;
      return reply.status(result.statusCode).send(response);
    }

    return reply.status(result.statusCode).send({
      documents: result.documents,
      pagination: result.pagination
    });
  }

  /**
   * Get a single document by ID (GET /api/applications/:id/documents/:documentId)
   */
  async getDocument(
    request: FastifyRequest<{ Params: { id: string; documentId: string } }>,
    reply: FastifyReply
  ) {
    // Validate route parameters
    const jobApplicationId = parseInt(request.params.id, 10);
    const documentId = parseInt(request.params.documentId, 10);
    const userId = request.user!.userId;

    if (isNaN(jobApplicationId) || isNaN(documentId)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid job application ID or document ID'
      });
    }

    // Call service for business logic
    const result = await documentService.getDocument(documentId, userId);

    // Map service result to HTTP response
    if (!result.success) {
      const response: any = { error: result.error };
      if (result.message) response.message = result.message;
      return reply.status(result.statusCode).send(response);
    }

    // Verify document belongs to the specified job application
    if (result.document!.jobApplication?.id !== jobApplicationId) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Document not found for this job application'
      });
    }

    return reply.status(result.statusCode).send(result.document);
  }

  /**
   * Delete a document by ID (DELETE /api/applications/:id/documents/:documentId)
   */
  async deleteDocument(
    request: FastifyRequest<{ Params: { id: string; documentId: string } }>,
    reply: FastifyReply
  ) {
    // Validate route parameters
    const jobApplicationId = parseInt(request.params.id, 10);
    const documentId = parseInt(request.params.documentId, 10);
    const userId = request.user!.userId;

    if (isNaN(jobApplicationId) || isNaN(documentId)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid job application ID or document ID'
      });
    }

    // First get the document to verify ownership and job application association
    const getResult = await documentService.getDocument(documentId, userId);
    
    if (!getResult.success) {
      const response: any = { error: getResult.error };
      if (getResult.message) response.message = getResult.message;
      return reply.status(getResult.statusCode).send(response);
    }

    // Verify document belongs to the specified job application
    if (getResult.document!.jobApplication?.id !== jobApplicationId) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Document not found for this job application'
      });
    }

    // Call service for business logic
    const result = await documentService.deleteDocument(documentId, userId);

    // Map service result to HTTP response
    if (!result.success) {
      const response: any = { error: result.error };
      if (result.message) response.message = result.message;
      return reply.status(result.statusCode).send(response);
    }

    return reply.status(result.statusCode).send({
      success: true,
      message: result.message,
      deletedDocument: result.deletedDocument
    });
  }
}

// Create and export controller instance
export const documentController = new DocumentController();

// Export individual methods for backwards compatibility
export const uploadDocument = documentController.uploadDocument.bind(documentController);
export const listDocuments = documentController.listDocuments.bind(documentController);
export const getDocument = documentController.getDocument.bind(documentController);
export const deleteDocument = documentController.deleteDocument.bind(documentController); 