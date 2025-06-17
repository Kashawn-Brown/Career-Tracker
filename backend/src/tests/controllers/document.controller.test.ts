/**
 * Document Controller Tests
 * 
 * Unit tests for document controller functions.
 * Tests all endpoints with success and error scenarios.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { uploadDocument, listDocuments, getDocument, deleteDocument } from '../../controllers/document.controller.js';
import { documentService } from '../../services/index.js';

// Mock the services
vi.mock('../../services/index.js', () => ({
  documentService: {
    uploadDocument: vi.fn(),
    listDocuments: vi.fn(),
    getDocument: vi.fn(),
    deleteDocument: vi.fn()
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
    warn: vi.fn(),
    info: vi.fn()
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

      const mockDocument = {
        id: 1,
        filename: 'test-file.pdf',
        originalName: 'resume.pdf',
        jobApplicationId: 1
      };

      const mockResult = {
        success: true,
        statusCode: 201,
        message: 'Document uploaded successfully',
        document: mockDocument
      };

      vi.mocked(documentService.uploadDocument).mockResolvedValue(mockResult);

      await uploadDocument(mockRequest as any, mockReply as any);

      expect(documentService.uploadDocument).toHaveBeenCalledWith(
        1, // jobApplicationId
        1, // userId
        {
          originalName: 'resume.pdf',
          filename: 'test-file.pdf',
          path: '/uploads/test-file.pdf',
          size: 1024,
          mimeType: 'application/pdf',
          uploadDate: expect.any(Date)
        }
      );
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

    test('should handle service error response', async () => {
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

      const mockResult = {
        success: false,
        statusCode: 404,
        error: 'Resource Not Found',
        message: 'The specified job application does not exist or you do not have access to it',
        details: {
          jobApplicationId: 1,
          userId: 1,
          operation: 'application_validation'
        }
      };

      vi.mocked(documentService.uploadDocument).mockResolvedValue(mockResult);

      await uploadDocument(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Resource Not Found',
        message: 'The specified job application does not exist or you do not have access to it',
        details: {
          jobApplicationId: 1,
          userId: 1,
          operation: 'application_validation'
        }
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

      const mockData = {
        documents: [
          { id: 1, filename: 'doc1.pdf' },
          { id: 2, filename: 'doc2.pdf' }
        ],
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          pages: 1
        }
      };

      const mockResult = {
        success: true,
        statusCode: 200,
        message: 'Documents retrieved successfully',
        documents: mockData.documents,
        pagination: mockData.pagination
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
      expect(mockReply.send).toHaveBeenCalledWith(mockData);
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

    test('should handle service error response', async () => {
      const mockRequest = createMockRequest({
        params: { id: '1' },
        query: {}
      });
      const mockReply = createMockReply();

      const mockResult = {
        success: false,
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to retrieve documents'
      };

      vi.mocked(documentService.listDocuments).mockResolvedValue(mockResult);

      await listDocuments(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to retrieve documents'
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
        filename: 'doc.pdf',
        jobApplication: { id: 1 }
      };

      const mockResult = {
        success: true,
        statusCode: 200,
        message: 'Document retrieved successfully',
        document: mockDocument
      };

      vi.mocked(documentService.getDocument).mockResolvedValue(mockResult);

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
        filename: 'doc.pdf',
        jobApplication: { id: 999 } // Different job application
      };

      const mockResult = {
        success: true,
        statusCode: 200,
        message: 'Document retrieved successfully',
        document: mockDocument
      };

      vi.mocked(documentService.getDocument).mockResolvedValue(mockResult);

      await getDocument(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Document not found for this job application'
      });
    });

    test('should handle service error response', async () => {
      const mockRequest = createMockRequest({
        params: { id: '1', documentId: '2' }
      });
      const mockReply = createMockReply();

      const mockResult = {
        success: false,
        statusCode: 404,
        error: 'Not Found',
        message: 'Document not found'
      };

      vi.mocked(documentService.getDocument).mockResolvedValue(mockResult);

      await getDocument(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Document not found'
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
        filename: 'doc.pdf',
        originalName: 'document.pdf',
        jobApplication: { id: 1 }
      };

      const mockGetResult = {
        success: true,
        statusCode: 200,
        message: 'Document retrieved successfully',
        document: mockDocument
      };

      const mockDeleteResult = {
        success: true,
        statusCode: 200,
        message: 'Document deleted successfully',
        deletedDocument: {
          id: 2,
          filename: 'doc.pdf',
          originalName: 'document.pdf'
        }
      };

      vi.mocked(documentService.getDocument).mockResolvedValue(mockGetResult);
      vi.mocked(documentService.deleteDocument).mockResolvedValue(mockDeleteResult);

      await deleteDocument(mockRequest as any, mockReply as any);

      expect(documentService.getDocument).toHaveBeenCalledWith(2, 1);
      expect(documentService.deleteDocument).toHaveBeenCalledWith(2, 1);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        message: 'Document deleted successfully',
        deletedDocument: {
          id: 2,
          filename: 'doc.pdf',
          originalName: 'document.pdf'
        }
      });
    });

    test('should return 400 for invalid IDs', async () => {
      const mockRequest = createMockRequest({
        params: { id: 'invalid', documentId: 'invalid' }
      });
      const mockReply = createMockReply();

      await deleteDocument(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Invalid job application ID or document ID'
      });
    });

    test('should handle get document error', async () => {
      const mockRequest = createMockRequest({
        params: { id: '1', documentId: '2' }
      });
      const mockReply = createMockReply();

      const mockGetResult = {
        success: false,
        statusCode: 404,
        error: 'Not Found',
        message: 'Document not found'
      };

      vi.mocked(documentService.getDocument).mockResolvedValue(mockGetResult);

      await deleteDocument(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Document not found'
      });
    });

    test('should return 404 when document belongs to different job application', async () => {
      const mockRequest = createMockRequest({
        params: { id: '1', documentId: '2' }
      });
      const mockReply = createMockReply();

      const mockDocument = {
        id: 2,
        filename: 'doc.pdf',
        jobApplication: { id: 999 } // Different job application
      };

      const mockGetResult = {
        success: true,
        statusCode: 200,
        message: 'Document retrieved successfully',
        document: mockDocument
      };

      vi.mocked(documentService.getDocument).mockResolvedValue(mockGetResult);

      await deleteDocument(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Document not found for this job application'
      });
    });
  });
}); 