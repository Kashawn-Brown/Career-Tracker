/**
 * File Upload Controller
 * 
 * Handles HTTP requests for file upload operations.
 * Implements clean request/response handling following established auth patterns.
 * Uses FileUploadService for business logic to maintain separation of concerns.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { fileUploadService } from '../services/index.js';
import type { UploadedFileInfo } from '../models/document.models.js';

export class FileUploadController {

  /**
   * Handle single file upload (POST /api/upload/single)
   */
  async uploadSingle(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
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
    const result = await fileUploadService.processSingleFileUpload(uploadedFile);

    // Map service result to HTTP response
    if (!result.success) {
      const response: any = { error: result.error };
      if (result.message) response.message = result.message;
      if (result.details) response.details = result.details;
      return reply.status(result.statusCode).send(response);
    }

    return reply.status(result.statusCode).send({
      message: result.message,
      file: result.file
    });
  }

  /**
   * Handle multiple file upload (POST /api/upload/multiple)
   */
  async uploadMultiple(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    // Check if files were uploaded (handled by upload middleware)
    if (!request.uploadedFiles || request.uploadedFiles.length === 0) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'No files uploaded'
      });
    }

    const uploadedFiles: UploadedFileInfo[] = request.uploadedFiles.map(file => ({
      originalName: file.originalName,
      filename: file.filename,
      path: file.path,
      size: file.size,
      mimeType: file.mimeType,
      uploadDate: new Date()
    }));

    // Call service for business logic
    const result = await fileUploadService.processMultipleFileUpload(uploadedFiles);

    // Map service result to HTTP response
    if (!result.success) {
      const response: any = { error: result.error };
      if (result.message) response.message = result.message;
      if (result.details) response.details = result.details;
      return reply.status(result.statusCode).send(response);
    }

    return reply.status(result.statusCode).send({
      message: result.message,
      files: result.files
    });
  }

  /**
   * Get file info (GET /api/upload/info/:filename)
   */
  async getFileInfo(
    request: FastifyRequest<{ Params: { filename: string } }>,
    reply: FastifyReply
  ) {
    const { filename } = request.params;

    if (!filename) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Filename is required'
      });
    }

    // Call service for business logic
    const result = await fileUploadService.getFileInfo(filename);

    // Map service result to HTTP response
    if (!result.success) {
      const response: any = { error: result.error };
      if (result.message) response.message = result.message;
      return reply.status(result.statusCode).send(response);
    }

    return reply.status(result.statusCode).send({
      file: result.file
    });
  }

  /**
   * Download file (GET /api/upload/download/:filename)
   */
  async downloadFile(
    request: FastifyRequest<{ Params: { filename: string } }>,
    reply: FastifyReply
  ) {
    const { filename } = request.params;

    if (!filename) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Filename is required'
      });
    }

    // Call service for business logic
    const result = await fileUploadService.downloadFile(filename);

    // Map service result to HTTP response
    if (!result.success) {
      const response: any = { error: result.error };
      if (result.message) response.message = result.message;
      return reply.status(result.statusCode).send(response);
    }

    // Set appropriate headers for file download
    if (result.contentType) {
      reply.header('Content-Type', result.contentType);
    }
    if (result.contentLength) {
      reply.header('Content-Length', result.contentLength);
    }
    reply.header('Content-Disposition', `attachment; filename="${result.filename}"`);

    return reply.status(result.statusCode).send(result.stream);
  }

  /**
   * Delete file (DELETE /api/upload/:filename)
   */
  async deleteFile(
    request: FastifyRequest<{ Params: { filename: string } }>,
    reply: FastifyReply
  ) {
    const { filename } = request.params;

    if (!filename) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Filename is required'
      });
    }

    // Call service for business logic
    const result = await fileUploadService.deleteFileByName(filename);

    // Map service result to HTTP response
    if (!result.success) {
      const response: any = { error: result.error };
      if (result.message) response.message = result.message;
      return reply.status(result.statusCode).send(response);
    }

    return reply.status(result.statusCode).send({
      message: result.message
    });
  }

  /**
   * Get upload configuration (GET /api/upload/config)
   */
  async getUploadConfig(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    // Call service for business logic
    const result = await fileUploadService.getUploadConfiguration();

    return reply.status(200).send(result);
  }
}

// Create and export controller instance
const fileUploadController = new FileUploadController();

// Export individual methods for backwards compatibility
export const uploadSingle = fileUploadController.uploadSingle.bind(fileUploadController);
export const uploadMultiple = fileUploadController.uploadMultiple.bind(fileUploadController);
export const getFileInfo = fileUploadController.getFileInfo.bind(fileUploadController);
export const downloadFile = fileUploadController.downloadFile.bind(fileUploadController);
export const deleteFile = fileUploadController.deleteFile.bind(fileUploadController);
export const getUploadConfig = fileUploadController.getUploadConfig.bind(fileUploadController);

export { fileUploadController }; 