/**
 * Document Controller Tests
 * 
 * Unit tests for document controller functions.
 * Tests all endpoints with success and error scenarios.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { uploadDocument, listDocuments, getDocument, deleteDocument } from '../../controllers/document.controller.js';
import { documentService, fileUploadService } from '../../services/index.js';

// Mock the services
vi.mock('../../services/index.js', () => ({
  documentService: {
    createDocument: vi.fn(),
    listDocuments: vi.fn(),
    getDocument: vi.fn(),
    deleteDocument: vi.fn()
  },
  fileUploadService: {
    storeUploadedFile: vi.fn(),
    deleteFile: vi.fn()
  }
}));

// Mock FastifyRequest and FastifyReply
const createMockRequest = (overrides = {}) => ({
  params: {},
  query: {},
  user: { userId: 1 },
  uploadedFile: null,
  log: {
    error: vi.fn(),
    warn: vi.fn()
  },
  ...overrides
});

const createMockReply = () => {
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn()
  };
  return reply;
};

describe('Document Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadDocument', () => {
    test('should successfully upload a document', async () => {
      const mockRequest = createMockRequest({
        params: { id: '1' },
        uploadedFile: {
          filename: 'test-file.pdf',
          originalName: 'resume.pdf',
          path: '/uploads/test-file.pdf',
          size: 1024,
          mimeType: 'application/pdf'
        }
      });
      const mockReply = createMockReply();

      const mockStoreResult = {
        success: true,
        filePath: '/uploads/stored-file.pdf'
      };

      const mockDocument = {
        id: 1,
        filename: 'test-file.pdf',
        originalName: 'resume.pdf',
        jobApplicationId: 1
      };

      vi.mocked(fileUploadService.storeUploadedFile).mockResolvedValue(mockStoreResult);
      vi.mocked(documentService.createDocument).mockResolvedValue(mockDocument);

      await uploadDocument(mockRequest as any, mockReply as any);

      expect(fileUploadService.storeUploadedFile).toHaveBeenCalledWith(mockRequest.uploadedFile);
      expect(documentService.createDocument).toHaveBeenCalledWith({
        jobApplicationId: 1,
        filename: 'test-file.pdf',
        originalName: 'resume.pdf',
        path: '/uploads/stored-file.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf'
      });
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith(mockDocument);
    });

    test('should return 400 for invalid job application ID', async () => {
      const mockRequest = createMockRequest({
        params: { id: 'invalid' }
      });
      const mockReply = createMockReply();

      await uploadDocument(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Invalid job application ID'
      });
    });

    test('should return 400 when no file uploaded', async () => {
      const mockRequest = createMockRequest({
        params: { id: '1' },
        uploadedFile: null
      });
      const mockReply = createMockReply();

      await uploadDocument(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'No file uploaded'
      });
    });

    test('should return 500 when file storage fails', async () => {
      const mockRequest = createMockRequest({
        params: { id: '1' },
        uploadedFile: {
          filename: 'test-file.pdf',
          originalName: 'resume.pdf',
          path: '/uploads/test-file.pdf',
          size: 1024,
          mimeType: 'application/pdf'
        }
      });
      const mockReply = createMockReply();

      const mockStoreResult = {
        success: false,
        error: 'Storage failed'
      };

      vi.mocked(fileUploadService.storeUploadedFile).mockResolvedValue(mockStoreResult);

      await uploadDocument(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to store uploaded file',
        details: 'Storage failed'
      });
    });
  });

  describe('listDocuments', () => {
    test('should successfully list documents', async () => {
      const mockRequest = createMockRequest({
        params: { id: '1' },
        query: { page: 1, limit: 10 }
      });
      const mockReply = createMockReply();

      const mockResult = {
        documents: [
          { id: 1, filename: 'resume.pdf', jobApplicationId: 1 }
        ],
        pagination: { total: 1, page: 1, limit: 10, pages: 1 }
      };

      vi.mocked(documentService.listDocuments).mockResolvedValue(mockResult);

      await listDocuments(mockRequest as any, mockReply as any);

      expect(documentService.listDocuments).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        jobApplicationId: 1,
        userId: 1
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(mockResult);
    });

    test('should return 400 for invalid job application ID', async () => {
      const mockRequest = createMockRequest({
        params: { id: 'invalid' }
      });
      const mockReply = createMockReply();

      await listDocuments(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Invalid job application ID'
      });
    });
  });

  describe('getDocument', () => {
    test('should successfully get a document', async () => {
      const mockRequest = createMockRequest({
        params: { id: '1', documentId: '2' }
      });
      const mockReply = createMockReply();

      const mockDocument = {
        id: 2,
        filename: 'resume.pdf',
        jobApplication: { id: 1, userId: 1 }
      };

      vi.mocked(documentService.getDocument).mockResolvedValue(mockDocument);

      await getDocument(mockRequest as any, mockReply as any);

      expect(documentService.getDocument).toHaveBeenCalledWith(2, 1);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(mockDocument);
    });

    test('should return 400 for invalid IDs', async () => {
      const mockRequest = createMockRequest({
        params: { id: 'invalid', documentId: 'invalid' }
      });
      const mockReply = createMockReply();

      await getDocument(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Invalid job application ID or document ID'
      });
    });

    test('should return 404 when document belongs to different job application', async () => {
      const mockRequest = createMockRequest({
        params: { id: '1', documentId: '2' }
      });
      const mockReply = createMockReply();

      const mockDocument = {
        id: 2,
        filename: 'resume.pdf',
        jobApplication: { id: 999, userId: 1 } // Different job application
      };

      vi.mocked(documentService.getDocument).mockResolvedValue(mockDocument);

      await getDocument(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Document not found for this job application'
      });
    });
  });

  describe('deleteDocument', () => {
    test('should successfully delete a document', async () => {
      const mockRequest = createMockRequest({
        params: { id: '1', documentId: '2' }
      });
      const mockReply = createMockReply();

      const mockDocument = {
        id: 2,
        filename: 'test-file.pdf',
        originalName: 'resume.pdf',
        path: '/uploads/test-file.pdf',
        jobApplication: { id: 1, userId: 1 }
      };

      const mockDeleteFileResult = { success: true };
      const mockDeleteResult = { success: true };

      vi.mocked(documentService.getDocument).mockResolvedValue(mockDocument);
      vi.mocked(fileUploadService.deleteFile).mockResolvedValue(mockDeleteFileResult);
      vi.mocked(documentService.deleteDocument).mockResolvedValue(mockDeleteResult);

      await deleteDocument(mockRequest as any, mockReply as any);

      expect(documentService.getDocument).toHaveBeenCalledWith(2, 1);
      expect(fileUploadService.deleteFile).toHaveBeenCalledWith('/uploads/test-file.pdf');
      expect(documentService.deleteDocument).toHaveBeenCalledWith(2, 1);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        message: 'Document deleted successfully',
        deletedDocument: {
          id: 2,
          filename: 'test-file.pdf',
          originalName: 'resume.pdf'
        }
      });
    });

    test('should continue deletion even if file deletion fails', async () => {
      const mockRequest = createMockRequest({
        params: { id: '1', documentId: '2' }
      });
      const mockReply = createMockReply();

      const mockDocument = {
        id: 2,
        filename: 'test-file.pdf',
        originalName: 'resume.pdf',
        path: '/uploads/test-file.pdf',
        jobApplication: { id: 1, userId: 1 }
      };

      const mockDeleteFileResult = { success: false, error: 'File not found' };
      const mockDeleteResult = { success: true };

      vi.mocked(documentService.getDocument).mockResolvedValue(mockDocument);
      vi.mocked(fileUploadService.deleteFile).mockResolvedValue(mockDeleteFileResult);
      vi.mocked(documentService.deleteDocument).mockResolvedValue(mockDeleteResult);

      await deleteDocument(mockRequest as any, mockReply as any);

      expect(mockRequest.log.warn).toHaveBeenCalledWith('Failed to delete physical file:', 'File not found');
      expect(documentService.deleteDocument).toHaveBeenCalledWith(2, 1);
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });

    test('should return 404 when document not found', async () => {
      const mockRequest = createMockRequest({
        params: { id: '1', documentId: '2' }
      });
      const mockReply = createMockReply();

      vi.mocked(documentService.getDocument).mockRejectedValue(new Error('Document not found'));

      await deleteDocument(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Document not found'
      });
    });
  });
}); 