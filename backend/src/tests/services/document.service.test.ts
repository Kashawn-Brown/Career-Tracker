/**
 * DocumentService Unit Tests
 * 
 * Tests the business logic layer for document operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DocumentService } from '../../services/document.service.js';
import { repositories } from '../../repositories/index.js';

// Mock the repositories
vi.mock('../../repositories/index.js', () => ({
  repositories: {
    document: {
      create: vi.fn(),
      findByIdWithRelations: vi.fn(),
      findByUser: vi.fn(),
      findByJobApplication: vi.fn(),
      findByType: vi.fn(),
      searchDocuments: vi.fn(),
      findRecentDocuments: vi.fn(),
      getDocumentStats: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateMetadata: vi.fn(),
    },
    jobApplication: {
      findById: vi.fn(),
    },
  },
}));

describe('DocumentService', () => {
  let documentService: DocumentService;

  beforeEach(() => {
    documentService = new DocumentService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createDocument', () => {
    const validCreateRequest = {
      jobApplicationId: 1,
      filename: 'test-resume.pdf',
      originalName: 'My Resume.pdf',
      path: '/uploads/test-resume.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
    };

    it('should create a document with valid data', async () => {
      // Arrange
      const mockJobApp = { id: 1, userId: 1, company: 'Test Corp' };
      const mockCreatedDoc = { id: 1, ...validCreateRequest };
      const mockDocWithRelations = { ...mockCreatedDoc, jobApplication: mockJobApp };

      repositories.jobApplication.findById = vi.fn().mockResolvedValue(mockJobApp);
      repositories.document.create = vi.fn().mockResolvedValue(mockCreatedDoc);
      repositories.document.findByIdWithRelations = vi.fn().mockResolvedValue(mockDocWithRelations);

      // Act
      const result = await documentService.createDocument(validCreateRequest);

      // Assert
      expect(repositories.jobApplication.findById).toHaveBeenCalledWith(1);
      expect(repositories.document.create).toHaveBeenCalledWith({
        filename: 'test-resume.pdf',
        originalName: 'My Resume.pdf',
        path: '/uploads/test-resume.pdf',
        fileUrl: '/uploads/test-resume.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        type: 'resume', // PDF should determine resume type
        jobApplication: { connect: { id: 1 } }
      });
      expect(result).toEqual(mockDocWithRelations);
    });

    it('should throw error when job application ID is missing', async () => {
      // Arrange
      const invalidRequest = { ...validCreateRequest, jobApplicationId: undefined };

      // Act & Assert
      await expect(documentService.createDocument(invalidRequest as any))
        .rejects.toThrow('Job application ID is required');
    });

    it('should throw error when filename is missing', async () => {
      // Arrange
      const invalidRequest = { ...validCreateRequest, filename: '' };

      // Act & Assert
      await expect(documentService.createDocument(invalidRequest))
        .rejects.toThrow('Filename is required');
    });

    it('should throw error when job application does not exist', async () => {
      // Arrange
      repositories.jobApplication.findById = vi.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(documentService.createDocument(validCreateRequest))
        .rejects.toThrow('Job application not found');
    });

    it('should determine document type from MIME type', async () => {
      // Arrange
      const docxRequest = {
        ...validCreateRequest,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        originalName: 'cover-letter.docx'
      };
      const mockJobApp = { id: 1, userId: 1 };
      const mockCreatedDoc = { id: 1, ...docxRequest };

      repositories.jobApplication.findById = vi.fn().mockResolvedValue(mockJobApp);
      repositories.document.create = vi.fn().mockResolvedValue(mockCreatedDoc);
      repositories.document.findByIdWithRelations = vi.fn().mockResolvedValue(mockCreatedDoc);

      // Act
      await documentService.createDocument(docxRequest);

      // Assert
      expect(repositories.document.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'cover_letter' // DOCX should determine cover_letter type
        })
      );
    });
  });

  describe('getDocument', () => {
    it('should return document when found', async () => {
      // Arrange
      const mockDoc = {
        id: 1,
        filename: 'test.pdf',
        jobApplication: { userId: 1 }
      };
      repositories.document.findByIdWithRelations = vi.fn().mockResolvedValue(mockDoc);

      // Act
      const result = await documentService.getDocument(1, 1);

      // Assert
      expect(result).toEqual(mockDoc);
    });

    it('should throw error when document not found', async () => {
      // Arrange
      repositories.document.findByIdWithRelations = vi.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(documentService.getDocument(1))
        .rejects.toThrow('Document not found');
    });

    it('should throw error when user does not own document', async () => {
      // Arrange
      const mockDoc = {
        id: 1,
        filename: 'test.pdf',
        jobApplication: { userId: 2 } // Different user
      };
      repositories.document.findByIdWithRelations = vi.fn().mockResolvedValue(mockDoc);

      // Act & Assert
      await expect(documentService.getDocument(1, 1))
        .rejects.toThrow('Document not found');
    });
  });

  describe('updateDocument', () => {
    it('should update document with valid data', async () => {
      // Arrange
      const mockExistingDoc = {
        id: 1,
        filename: 'old-name.pdf',
        jobApplication: { userId: 1 }
      };
      const mockUpdatedDoc = {
        ...mockExistingDoc,
        filename: 'new-name.pdf'
      };
      const updateData = { filename: 'new-name.pdf' };

      repositories.document.findByIdWithRelations = vi.fn()
        .mockResolvedValueOnce(mockExistingDoc)
        .mockResolvedValueOnce(mockUpdatedDoc);
      repositories.document.update = vi.fn().mockResolvedValue(undefined);

      // Act
      const result = await documentService.updateDocument(1, updateData, 1);

      // Assert
      expect(repositories.document.update).toHaveBeenCalledWith(1, { filename: 'new-name.pdf' });
      expect(result).toEqual(mockUpdatedDoc);
    });

    it('should throw error when filename is empty', async () => {
      // Arrange
      const mockExistingDoc = { id: 1, jobApplication: { userId: 1 } };
      repositories.document.findByIdWithRelations = vi.fn().mockResolvedValue(mockExistingDoc);

      // Act & Assert
      await expect(documentService.updateDocument(1, { filename: '' }, 1))
        .rejects.toThrow('Filename cannot be empty');
    });
  });

  describe('deleteDocument', () => {
    it('should delete document successfully', async () => {
      // Arrange
      const mockDoc = {
        id: 1,
        filename: 'test.pdf',
        jobApplication: { userId: 1 }
      };
      repositories.document.findByIdWithRelations = vi.fn().mockResolvedValue(mockDoc);
      repositories.document.delete = vi.fn().mockResolvedValue(undefined);

      // Act
      const result = await documentService.deleteDocument(1, 1);

      // Assert
      expect(repositories.document.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        success: true,
        message: 'Document deleted successfully'
      });
    });

    it('should throw error when document not found', async () => {
      // Arrange
      repositories.document.findByIdWithRelations = vi.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(documentService.deleteDocument(1))
        .rejects.toThrow('Document not found');
    });
  });

  describe('listDocuments', () => {
    it('should list documents for user with filters', async () => {
      // Arrange
      const mockDocs = [
        { id: 1, filename: 'doc1.pdf' },
        { id: 2, filename: 'doc2.pdf' }
      ];
      repositories.document.findByUser = vi.fn().mockResolvedValue(mockDocs);

      // Act
      const result = await documentService.listDocuments({
        userId: 1,
        page: 1,
        limit: 10,
        type: 'resume'
      });

      // Assert
      expect(repositories.document.findByUser).toHaveBeenCalledWith(
        1,
        { type: 'resume' },
        {
          pagination: { page: 1, limit: 10 },
          orderBy: { createdAt: 'desc' }
        }
      );
      expect(result.documents).toEqual(mockDocs);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.pages).toBe(1);
    });

    it('should list documents for job application', async () => {
      // Arrange
      const mockDocs = [{ id: 1, filename: 'doc1.pdf' }];
      repositories.document.findByJobApplication = vi.fn().mockResolvedValue(mockDocs);

      // Act
      const result = await documentService.listDocuments({
        jobApplicationId: 1,
        page: 1,
        limit: 10
      });

      // Assert
      expect(repositories.document.findByJobApplication).toHaveBeenCalledWith(1);
      expect(result.documents).toEqual(mockDocs);
      expect(result.pagination).toBeDefined();
    });

    it('should throw error when neither userId nor jobApplicationId provided', async () => {
      // Act & Assert
      await expect(documentService.listDocuments({ page: 1, limit: 10 }))
        .rejects.toThrow('Either userId or jobApplicationId is required for listing documents');
    });
  });

  describe('searchDocuments', () => {
    it('should search documents with valid query', async () => {
      // Arrange
      const mockResults = [{ id: 1, filename: 'resume.pdf' }];
      repositories.document.searchDocuments = vi.fn().mockResolvedValue(mockResults);

      // Act
      const result = await documentService.searchDocuments('resume', 1, { page: 1, limit: 10 });

      // Assert
      expect(repositories.document.searchDocuments).toHaveBeenCalledWith(
        'resume',
        1,
        { pagination: { page: 1, limit: 10 } }
      );
      expect(result).toEqual(mockResults);
    });

    it('should throw error for empty query', async () => {
      // Act & Assert
      await expect(documentService.searchDocuments('', 1))
        .rejects.toThrow('Search query is required');
    });
  });

  describe('getDocumentStats', () => {
    it('should return document statistics', async () => {
      // Arrange
      const mockStats = {
        total: 5,
        byType: [{ type: 'resume', count: 3 }],
        byFileExtension: [{ extension: 'pdf', count: 4 }],
        totalSize: 1024000,
        averageSize: 204800,
        recentUploads: 2
      };
      repositories.document.getDocumentStats = vi.fn().mockResolvedValue(mockStats);

      // Act
      const result = await documentService.getDocumentStats(1);

      // Assert
      expect(repositories.document.getDocumentStats).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockStats);
    });
  });

  describe('determineDocumentType', () => {
    it('should determine type from MIME type - PDF', () => {
      const service = new DocumentService();
      // Access protected method for testing (now properly accessible)
      const result = service['determineDocumentType']('resume.pdf', 'application/pdf');
      expect(result).toBe('resume');
    });

    it('should determine type from MIME type - Word document', () => {
      const service = new DocumentService();
      const result = service['determineDocumentType']('cover.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(result).toBe('cover_letter');
    });

    it('should determine type from extension - fallback', () => {
      const service = new DocumentService();
      const result = service['determineDocumentType']('document.txt', 'unknown/type');
      expect(result).toBe('other');
    });

    it('should default to other for unknown types', () => {
      const service = new DocumentService();
      const result = service['determineDocumentType']('unknown.xyz', 'unknown/type');
      expect(result).toBe('other');
    });
  });
}); 