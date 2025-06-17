/**
 * FileUploadController Unit Tests
 * 
 * Tests the HTTP layer for file upload operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileUploadController } from '../../controllers/file-upload.controller.js';
import { fileUploadService } from '../../services/index.js';
import { FastifyRequest, FastifyReply } from 'fastify';

// Mock the file upload service
vi.mock('../../services/index.js', () => ({
  fileUploadService: {
    processSingleFileUpload: vi.fn(),
    processMultipleFileUpload: vi.fn(),
    getFileInfo: vi.fn(),
    downloadFile: vi.fn(),
    deleteFileByName: vi.fn(),
    getUploadConfiguration: vi.fn()
  }
}));

describe('FileUploadController', () => {
  let controller: FileUploadController;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    controller = new FileUploadController();
    
    mockRequest = {
      params: {},
      body: {},
      log: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
      } as any
    };

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis()
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('uploadSingle', () => {
    it('should handle single file upload successfully', async () => {
      // Arrange
      const uploadedFile = {
        originalName: 'test-resume.pdf',
        filename: 'test-resume-123.pdf',
        path: '/tmp/upload-123.pdf',
        size: 1024,
        mimeType: 'application/pdf',
        uploadDate: new Date()
      };

      mockRequest.uploadedFile = uploadedFile;

      const serviceResult = {
        success: true,
        statusCode: 201,
        message: 'File uploaded successfully',
        file: {
          filename: 'test-resume-123.pdf',
          originalName: 'test-resume.pdf',
          size: 1024,
          mimeType: 'application/pdf',
          url: 'http://localhost:3002/uploads/test-resume-123.pdf',
          path: '/uploads/test-resume-123.pdf',
          uploadDate: uploadedFile.uploadDate
        }
      };

      vi.mocked(fileUploadService.processSingleFileUpload).mockResolvedValue(serviceResult);

      // Act
      await controller.uploadSingle(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(fileUploadService.processSingleFileUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: uploadedFile.filename,
          originalName: uploadedFile.originalName,
          path: uploadedFile.path,
          size: uploadedFile.size,
          mimeType: uploadedFile.mimeType,
          uploadDate: expect.any(Date)
        })
      );
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'File uploaded successfully',
        file: serviceResult.file
      });
    });

    it('should return 400 when no file is uploaded', async () => {
      // Arrange - no uploadedFile in request

      // Act
      await controller.uploadSingle(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'No file uploaded'
      });
      expect(fileUploadService.processSingleFileUpload).not.toHaveBeenCalled();
    });

    it('should handle service errors properly', async () => {
      // Arrange
      mockRequest.uploadedFile = {
        originalName: 'test.exe',
        filename: 'test.exe',
        path: '/tmp/test.exe',
        size: 1024,
        mimeType: 'application/x-executable',
        uploadDate: new Date()
      };

      const serviceError = {
        success: false,
        statusCode: 400,
        error: 'File Validation Failed',
        message: 'Invalid file type',
        details: { filename: 'test.exe', errors: ['Invalid file type'] }
      };

      vi.mocked(fileUploadService.processSingleFileUpload).mockResolvedValue(serviceError);

      // Act
      await controller.uploadSingle(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'File Validation Failed',
        message: 'Invalid file type',
        details: { filename: 'test.exe', errors: ['Invalid file type'] }
      });
    });
  });

  describe('uploadMultiple', () => {
    it('should handle multiple file upload successfully', async () => {
      // Arrange
      const uploadedFiles = [
        {
          originalName: 'resume.pdf',
          filename: 'resume-123.pdf',
          path: '/tmp/resume-123.pdf',
          size: 1024,
          mimeType: 'application/pdf',
          uploadDate: new Date()
        },
        {
          originalName: 'cover-letter.docx',
          filename: 'cover-letter-456.docx',
          path: '/tmp/cover-letter-456.docx',
          size: 2048,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          uploadDate: new Date()
        }
      ];

      mockRequest.uploadedFiles = uploadedFiles;

      const serviceResult = {
        success: true,
        statusCode: 201,
        message: 'Files uploaded successfully',
        files: uploadedFiles.map(file => ({
          filename: file.filename,
          originalName: file.originalName,
          size: file.size,
          mimeType: file.mimeType,
          url: `http://localhost:3002/uploads/${file.filename}`,
          path: `/uploads/${file.filename}`,
          uploadDate: file.uploadDate
        })),
        totalFiles: 2,
        totalSize: 3072
      };

      vi.mocked(fileUploadService.processMultipleFileUpload).mockResolvedValue(serviceResult);

      // Act
      await controller.uploadMultiple(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(fileUploadService.processMultipleFileUpload).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            filename: 'resume-123.pdf',
            originalName: 'resume.pdf',
            path: '/tmp/resume-123.pdf',
            size: 1024,
            mimeType: 'application/pdf',
            uploadDate: expect.any(Date)
          }),
          expect.objectContaining({
            filename: 'cover-letter-456.docx',
            originalName: 'cover-letter.docx',
            path: '/tmp/cover-letter-456.docx',
            size: 2048,
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            uploadDate: expect.any(Date)
          })
        ])
      );
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Files uploaded successfully',
        files: serviceResult.files
      });
    });

    it('should return 400 when no files are uploaded', async () => {
      // Arrange - no uploadedFiles in request

      // Act
      await controller.uploadMultiple(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'No files uploaded'
      });
      expect(fileUploadService.processMultipleFileUpload).not.toHaveBeenCalled();
    });

    it('should return 400 when empty files array is uploaded', async () => {
      // Arrange
      mockRequest.uploadedFiles = [];

      // Act
      await controller.uploadMultiple(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'No files uploaded'
      });
    });
  });

  describe('getFileInfo', () => {
    it('should return file info successfully', async () => {
      // Arrange
      const filename = 'test-resume.pdf';
      mockRequest.params = { filename };

      const serviceResult = {
        success: true,
        statusCode: 200,
        file: {
          filename: 'test-resume.pdf',
          originalName: 'test-resume.pdf',
          size: 1024,
          mimeType: 'application/pdf',
          url: 'http://localhost:3002/uploads/test-resume.pdf',
          path: '/uploads/test-resume.pdf',
          uploadDate: new Date()
        }
      };

      vi.mocked(fileUploadService.getFileInfo).mockResolvedValue(serviceResult);

      // Act
      await controller.getFileInfo(
        mockRequest as FastifyRequest<{ Params: { filename: string } }>,
        mockReply as FastifyReply
      );

      // Assert
      expect(fileUploadService.getFileInfo).toHaveBeenCalledWith(filename);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        file: serviceResult.file
      });
    });

    it('should return 400 when filename is missing', async () => {
      // Arrange - no filename in params
      mockRequest.params = {};

      // Act
      await controller.getFileInfo(
        mockRequest as FastifyRequest<{ Params: { filename: string } }>,
        mockReply as FastifyReply
      );

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Filename is required'
      });
      expect(fileUploadService.getFileInfo).not.toHaveBeenCalled();
    });

    it('should handle file not found error', async () => {
      // Arrange
      mockRequest.params = { filename: 'nonexistent.pdf' };

      const serviceError = {
        success: false,
        statusCode: 404,
        error: 'File Not Found',
        message: 'The requested file does not exist'
      };

      vi.mocked(fileUploadService.getFileInfo).mockResolvedValue(serviceError);

      // Act
      await controller.getFileInfo(
        mockRequest as FastifyRequest<{ Params: { filename: string } }>,
        mockReply as FastifyReply
      );

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'File Not Found',
        message: 'The requested file does not exist'
      });
    });
  });

  describe('downloadFile', () => {
    it('should handle file download successfully', async () => {
      // Arrange
      const filename = 'test-resume.pdf';
      mockRequest.params = { filename };

      const mockStream = { pipe: vi.fn() };
      const serviceResult = {
        success: true,
        statusCode: 200,
        stream: mockStream,
        contentType: 'application/pdf',
        contentLength: '1024',
        filename: 'test-resume.pdf'
      };

      vi.mocked(fileUploadService.downloadFile).mockResolvedValue(serviceResult);

      // Act
      await controller.downloadFile(
        mockRequest as FastifyRequest<{ Params: { filename: string } }>,
        mockReply as FastifyReply
      );

      // Assert
      expect(fileUploadService.downloadFile).toHaveBeenCalledWith(filename);
      expect(mockReply.header).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockReply.header).toHaveBeenCalledWith('Content-Length', '1024');
      expect(mockReply.header).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="test-resume.pdf"');
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(mockStream);
    });

    it('should return 400 when filename is missing', async () => {
      // Arrange
      mockRequest.params = {};

      // Act
      await controller.downloadFile(
        mockRequest as FastifyRequest<{ Params: { filename: string } }>,
        mockReply as FastifyReply
      );

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Filename is required'
      });
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      // Arrange
      const filename = 'test-resume.pdf';
      mockRequest.params = { filename };

      const serviceResult = {
        success: true,
        statusCode: 200,
        message: 'File deleted successfully'
      };

      vi.mocked(fileUploadService.deleteFileByName).mockResolvedValue(serviceResult);

      // Act
      await controller.deleteFile(
        mockRequest as FastifyRequest<{ Params: { filename: string } }>,
        mockReply as FastifyReply
      );

      // Assert
      expect(fileUploadService.deleteFileByName).toHaveBeenCalledWith(filename);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'File deleted successfully'
      });
    });

    it('should return 400 when filename is missing', async () => {
      // Arrange
      mockRequest.params = {};

      // Act
      await controller.deleteFile(
        mockRequest as FastifyRequest<{ Params: { filename: string } }>,
        mockReply as FastifyReply
      );

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Filename is required'
      });
    });
  });

  describe('getUploadConfig', () => {
    it('should return upload configuration', async () => {
      // Arrange
      const configResult = {
        maxFileSize: 10485760,
        maxFileSizeMB: 10,
        allowedMimeTypes: ['application/pdf', 'application/msword'],
        allowedExtensions: ['.pdf', '.doc', '.docx', '.txt'],
        uploadDir: 'uploads/documents',
        storageType: 'local' as const,
        supportedFeatures: {
          multipleFiles: true,
          streamDownload: true,
          urlGeneration: true
        }
      };

      vi.mocked(fileUploadService.getUploadConfiguration).mockReturnValue(configResult);

      // Act
      await controller.getUploadConfig(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(fileUploadService.getUploadConfiguration).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(configResult);
    });
  });
}); 