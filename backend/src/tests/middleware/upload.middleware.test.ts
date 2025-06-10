/**
 * File Upload Middleware Tests
 * 
 * Comprehensive tests for the file upload middleware functions including:
 * - Single file upload with validation
 * - Multiple file upload with validation
 * - File type validation
 * - File size validation
 * - Error handling scenarios
 * - File naming and storage functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { Readable } from 'stream';
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream } from 'fs';

// Helper function to create a BusboyFileStream-compatible mock
function createMockFileStream(content: string): any {
  const stream = new Readable({
    read() {
      this.push(content);
      this.push(null);
    }
  });
  
  // Add required BusboyFileStream properties
  (stream as any).truncated = false;
  (stream as any).bytesRead = content.length;
  
  return stream;
}
import {
  uploadSingle,
  uploadMultiple,
  cleanupFile,
  getFileInfo,
  UploadedFileInfo
} from '../../middleware/upload.middleware.js';

// Mock the file system operations
vi.mock('fs/promises');
vi.mock('fs');
vi.mock('stream/promises');

describe('Upload Middleware', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let mockLog: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLog = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn()
    };

    mockRequest = {
      url: '/api/test',
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data' },
      body: {},
      query: {},
      params: {},
      log: mockLog,
      isMultipart: vi.fn().mockReturnValue(true),
      file: vi.fn(),
      files: vi.fn()
    };

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };

    // Mock fs operations
    (fs.access as Mock).mockResolvedValue(undefined);
    (fs.mkdir as Mock).mockResolvedValue(undefined);
    (fs.stat as Mock).mockResolvedValue({ size: 5000 });
    (fs.unlink as Mock).mockResolvedValue(undefined);
    
    // Mock createWriteStream
    const mockWriteStream = {
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      emit: vi.fn()
    };
    (createWriteStream as Mock).mockReturnValue(mockWriteStream);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadSingle middleware', () => {
    it('should successfully upload a valid PDF file', async () => {
      const mockFile: Partial<MultipartFile> = {
        filename: 'test-resume.pdf',
        mimetype: 'application/pdf',
        file: createMockFileStream('fake pdf content')
      };

      mockRequest.file = vi.fn().mockResolvedValue(mockFile);

      // Mock pipeline to resolve successfully
      const { pipeline } = await import('stream/promises');
      (pipeline as Mock).mockResolvedValue(undefined);

      const middleware = uploadSingle('document');
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockRequest.uploadedFile).toBeDefined();
      expect(mockRequest.uploadedFile?.originalName).toBe('test-resume.pdf');
      expect(mockRequest.uploadedFile?.mimeType).toBe('application/pdf');
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });

    it('should successfully upload a valid DOCX file', async () => {
      const mockFile: Partial<MultipartFile> = {
        filename: 'test-cover-letter.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        file: createMockFileStream('fake docx content')
      };

      mockRequest.file = vi.fn().mockResolvedValue(mockFile);

      const { pipeline } = await import('stream/promises');
      (pipeline as Mock).mockResolvedValue(undefined);

      const middleware = uploadSingle('document');
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockRequest.uploadedFile).toBeDefined();
      expect(mockRequest.uploadedFile?.originalName).toBe('test-cover-letter.docx');
      expect(mockRequest.uploadedFile?.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should reject non-multipart requests', async () => {
      mockRequest.isMultipart = vi.fn().mockReturnValue(false);

      const middleware = uploadSingle('document');
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid content type',
          message: 'Request must be multipart/form-data',
          statusCode: 400
        })
      );
    });

    it('should reject requests with no file', async () => {
      mockRequest.file = vi.fn().mockResolvedValue(null);

      const middleware = uploadSingle('document');
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'No file provided',
          message: "Please provide a file in the 'document' field",
          statusCode: 400
        })
      );
    });

    it('should reject invalid file types', async () => {
      const mockFile: Partial<MultipartFile> = {
        filename: 'test-image.jpg',
        mimetype: 'image/jpeg',
        file: createMockFileStream('fake image content')
      };

      mockRequest.file = vi.fn().mockResolvedValue(mockFile);

      const middleware = uploadSingle('document');
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid file type',
          message: expect.stringContaining('Invalid file extension'),
          statusCode: 400
        })
      );
    });

    it('should reject files with invalid MIME types', async () => {
      const mockFile: Partial<MultipartFile> = {
        filename: 'test-file.pdf',
        mimetype: 'image/jpeg', // Wrong MIME type for PDF
        file: createMockFileStream('fake content')
      };

      mockRequest.file = vi.fn().mockResolvedValue(mockFile);

      const middleware = uploadSingle('document');
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid file type',
          message: expect.stringContaining('Invalid file type'),
          statusCode: 400
        })
      );
    });

    it('should handle file size limit errors', async () => {
      const error: any = new Error('File too large');
      error.code = 'FST_FILES_LIMIT';
      
      mockRequest.file = vi.fn().mockRejectedValue(error);

      const middleware = uploadSingle('document');
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'File too large',
          message: expect.stringContaining('File size exceeds the maximum limit'),
          statusCode: 400
        })
      );
    });

    it('should handle too many parts error', async () => {
      const error: any = new Error('Too many parts');
      error.code = 'FST_PARTS_LIMIT';
      
      mockRequest.file = vi.fn().mockRejectedValue(error);

      const middleware = uploadSingle('document');
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too many parts',
          message: 'Request contains too many multipart parts',
          statusCode: 400
        })
      );
    });

    it('should handle generic upload errors', async () => {
      const error = new Error('Unknown error');
      
      mockRequest.file = vi.fn().mockRejectedValue(error);

      const middleware = uploadSingle('document');
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Upload failed',
          message: 'An error occurred during file upload',
          statusCode: 500
        })
      );
    });
  });

  describe('uploadMultiple middleware', () => {
    it('should successfully upload multiple valid files', async () => {
      const mockFiles = [
        {
          filename: 'resume.pdf',
          mimetype: 'application/pdf',
          file: createMockFileStream('pdf content')
        },
        {
          filename: 'cover-letter.docx',
          mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          file: createMockFileStream('docx content')
        }
      ];

      const mockAsyncGenerator = async function* () {
        for (const file of mockFiles) {
          yield file;
        }
      };

      mockRequest.files = vi.fn().mockReturnValue(mockAsyncGenerator());

      const { pipeline } = await import('stream/promises');
      (pipeline as Mock).mockResolvedValue(undefined);

      const middleware = uploadMultiple('documents', 5);
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockRequest.uploadedFiles).toBeDefined();
      expect(mockRequest.uploadedFiles?.length).toBe(2);
      expect(mockRequest.uploadedFiles?.[0].originalName).toBe('resume.pdf');
      expect(mockRequest.uploadedFiles?.[1].originalName).toBe('cover-letter.docx');
    });

    it('should reject when no files are provided', async () => {
      const mockAsyncGenerator = async function* () {
        // Empty generator - no files
      };

      mockRequest.files = vi.fn().mockReturnValue(mockAsyncGenerator());

      const middleware = uploadMultiple('documents', 5);
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'No files provided',
          message: "Please provide files in the 'documents' field",
          statusCode: 400
        })
      );
    });

    it('should reject when exceeding file count limit', async () => {
      const mockFiles = Array.from({ length: 6 }, (_, i) => ({
        filename: `file${i}.pdf`,
        mimetype: 'application/pdf',
        file: createMockFileStream('content')
      }));

      const mockAsyncGenerator = async function* () {
        for (const file of mockFiles) {
          yield file;
        }
      };

      mockRequest.files = vi.fn().mockReturnValue(mockAsyncGenerator());

      const { pipeline } = await import('stream/promises');
      (pipeline as Mock).mockResolvedValue(undefined);

      const middleware = uploadMultiple('documents', 5);
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too many files',
          message: 'Maximum 5 files can be uploaded at once',
          statusCode: 400
        })
      );
    });

    it('should cleanup uploaded files when one file fails validation', async () => {
      const mockFiles = [
        {
          filename: 'resume.pdf',
          mimetype: 'application/pdf',
          file: createMockFileStream('pdf content')
        },
        {
          filename: 'invalid.jpg', // Invalid file type
          mimetype: 'image/jpeg',
          file: createMockFileStream('image content')
        }
      ];

      const mockAsyncGenerator = async function* () {
        for (const file of mockFiles) {
          yield file;
        }
      };

      mockRequest.files = vi.fn().mockReturnValue(mockAsyncGenerator());

      const { pipeline } = await import('stream/promises');
      (pipeline as Mock).mockResolvedValue(undefined);

      const middleware = uploadMultiple('documents', 5);
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid file type',
          statusCode: 400
        })
      );

      // Should attempt to cleanup the already uploaded file
      expect(fs.unlink).toHaveBeenCalled();
    });
  });

  describe('cleanupFile utility', () => {
    it('should successfully delete a file', async () => {
      const filePath = '/uploads/test-file.pdf';
      
      await cleanupFile(filePath);

      expect(fs.unlink).toHaveBeenCalledWith(filePath);
    });

    it('should handle file deletion errors gracefully', async () => {
      const filePath = '/uploads/non-existent-file.pdf';
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      (fs.unlink as Mock).mockRejectedValue(new Error('File not found'));

      await cleanupFile(filePath);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to cleanup file'),
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('getFileInfo utility', () => {
    it('should create proper file info object', () => {
      const mockFile: Partial<MultipartFile> = {
        filename: 'test-resume.pdf',
        mimetype: 'application/pdf'
      };

      const savedPath = '/uploads/documents/test-resume-123456-abc123.pdf';

      const fileInfo = getFileInfo(mockFile as MultipartFile, savedPath);

      expect(fileInfo).toEqual({
        originalName: 'test-resume.pdf',
        filename: 'test-resume-123456-abc123.pdf',
        path: savedPath,
        size: 0,
        mimeType: 'application/pdf',
        uploadDate: expect.any(Date)
      });
    });
  });

  describe('File validation edge cases', () => {
    it('should accept all allowed file types', async () => {
      const allowedFiles = [
        { name: 'test.pdf', mime: 'application/pdf' },
        { name: 'test.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        { name: 'test.doc', mime: 'application/msword' },
        { name: 'test.txt', mime: 'text/plain' }
      ];

      for (const fileType of allowedFiles) {
        const mockFile: Partial<MultipartFile> = {
          filename: fileType.name,
          mimetype: fileType.mime,
          file: createMockFileStream('content')
        };

        mockRequest.file = vi.fn().mockResolvedValue(mockFile);

        const { pipeline } = await import('stream/promises');
        (pipeline as Mock).mockResolvedValue(undefined);

        const middleware = uploadSingle('document');
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

        expect(mockRequest.uploadedFile).toBeDefined();
        expect(mockRequest.uploadedFile?.originalName).toBe(fileType.name);
      }
    });

    it('should generate unique filenames with timestamp and random suffix', async () => {
      const mockFile: Partial<MultipartFile> = {
        filename: 'test-resume.pdf',
        mimetype: 'application/pdf',
        file: createMockFileStream('content')
      };

      mockRequest.file = vi.fn().mockResolvedValue(mockFile);

      const { pipeline } = await import('stream/promises');
      (pipeline as Mock).mockResolvedValue(undefined);

      const middleware = uploadSingle('document');
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockRequest.uploadedFile?.filename).toMatch(/^test-resume-\d+-[a-z0-9]+\.pdf$/);
    });
  });
}); 