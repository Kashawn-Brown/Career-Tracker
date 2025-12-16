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
  cleanupFiles,
  getFileInfo,
  getUploadConfig,
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
  let mockFile: Partial<MultipartFile>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLog = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn()
    };

    mockFile = {
      filename: 'test-resume.pdf',
      mimetype: 'application/pdf',
      file: createMockFileStream('fake pdf content')
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
          error: 'Invalid Content Type',
          message: 'Request must be multipart/form-data for file uploads',
          statusCode: 400,
          path: '/api/test',
          timestamp: expect.any(String)
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
          error: 'No File Provided',
          message: "Please provide a file in the 'document' field",
          statusCode: 400,
          path: '/api/test',
          timestamp: expect.any(String)
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
          error: 'Invalid File Type',
          message: expect.stringContaining('Invalid file extension'),
          statusCode: 400,
          path: '/api/test',
          timestamp: expect.any(String),
          details: expect.objectContaining({
            allowedExtensions: expect.arrayContaining(['.pdf', '.docx', '.doc', '.txt']),
            allowedTypes: expect.arrayContaining(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain']),
            filename: 'test-image.jpg',
            mimeType: 'image/jpeg'
          })
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
          error: 'Invalid File Type',
          message: expect.stringContaining('Invalid file type'),
          statusCode: 400,
          path: '/api/test',
          timestamp: expect.any(String),
          details: expect.objectContaining({
            allowedExtensions: expect.arrayContaining(['.pdf', '.docx', '.doc', '.txt']),
            allowedTypes: expect.arrayContaining(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain']),
            filename: 'test-file.pdf',
            mimeType: 'image/jpeg'
          })
        })
      );
    });

    it('should handle file size limit errors', async () => {
      const error: any = new Error('File too large');
      error.code = 'FST_FILES_LIMIT';
      
      mockRequest.file = vi.fn().mockRejectedValue(error);

      const middleware = uploadSingle('document');
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(413);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('File Too Large'),
          message: expect.stringContaining('File size exceeds the maximum limit'),
          statusCode: 413
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
          error: 'Too Many Parts',
          message: 'Request contains too many multipart parts',
          statusCode: 400,
          path: '/api/test',
          timestamp: expect.any(String)
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
          error: 'Upload Failed',
          message: 'Unknown error',
          statusCode: 500,
          path: '/api/test',
          timestamp: expect.any(String),
          details: expect.objectContaining({
            errorCode: undefined
          })
        })
      );
    });
  });

  describe('uploadMultiple middleware', () => {
    it('should handle successful multiple file upload with logging', async () => {
      const middleware = uploadMultiple('documents', 3);
      
      const mockFiles = [
        { ...mockFile, filename: 'resume1.pdf' },
        { ...mockFile, filename: 'resume2.pdf' }
      ];
      
      const asyncGenerator = async function* () {
        for (const file of mockFiles) {
          yield file;
        }
      };
      
      (mockRequest.files as Mock).mockReturnValue(asyncGenerator());
      
      // Mock pipeline to resolve for each file
      const { pipeline } = await import('stream/promises');
      (pipeline as Mock).mockResolvedValue(undefined);
      
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockRequest.log!.info).toHaveBeenCalledWith(
        expect.objectContaining({
          operationId: expect.stringMatching(/^upload-multi-\d+-[a-z0-9]+$/),
          fieldName: 'documents',
          maxCount: 3
        }),
        'Starting multiple file upload operation'
      );
      
      expect(mockRequest.log!.info).toHaveBeenCalledWith(
        expect.objectContaining({
          totalFiles: 2,
          totalSize: expect.any(Number)
        }),
        'Multiple file upload operation completed successfully'
      );
      
      expect(mockRequest.uploadedFiles).toBeDefined();
      expect(mockRequest.uploadedFiles).toHaveLength(2);
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
          error: 'No Files Provided',
          message: "Please provide files in the 'documents' field",
          statusCode: 400,
          path: '/api/test',
          timestamp: expect.any(String)
        })
      );
    });

    it('should cleanup files when too many are uploaded', async () => {
      const middleware = uploadMultiple('documents', 2);
      
      const mockFiles = [
        { ...mockFile, filename: 'file1.pdf' },
        { ...mockFile, filename: 'file2.pdf' },
        { ...mockFile, filename: 'file3.pdf' } // This should trigger the limit
      ];
      
      const asyncGenerator = async function* () {
        for (const file of mockFiles) {
          yield file;
        }
      };
      
      (mockRequest.files as Mock).mockReturnValue(asyncGenerator());
      
      // Mock pipeline to resolve for the first 2 files
      const { pipeline } = await import('stream/promises');
      (pipeline as Mock).mockResolvedValue(undefined);
      
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockRequest.log!.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          fileCount: 3,
          maxCount: 2,
          cleanedUpFiles: 2
        }),
        'Multiple file upload rejected - too many files, cleaned up uploaded files'
      );
      
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too Many Files',
          details: expect.objectContaining({
            fileCount: 3,
            maxCount: 2,
            uploadedFiles: 2
          })
        })
      );
    });

    it('should cleanup files when invalid file type is encountered', async () => {
      const middleware = uploadMultiple('documents', 3);
      
      const mockFiles = [
        { ...mockFile, filename: 'resume.pdf' },
        { ...mockFile, filename: 'malware.exe', mimetype: 'application/x-executable' }
      ];
      
      const asyncGenerator = async function* () {
        for (const file of mockFiles) {
          yield file;
        }
      };
      
      (mockRequest.files as Mock).mockReturnValue(asyncGenerator());
      
      // Mock pipeline to resolve for the first file only
      const { pipeline } = await import('stream/promises');
      (pipeline as Mock).mockResolvedValue(undefined);
      
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockRequest.log!.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          rejectedFile: 'malware.exe',
          mimeType: 'application/x-executable',
          cleanedUpFiles: 1
        }),
        'Multiple file upload rejected - invalid file type, cleaned up uploaded files'
      );
      
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid File Type',
          details: expect.objectContaining({
            rejectedFile: {
              filename: 'malware.exe',
              mimeType: 'application/x-executable'
            },
            uploadedFiles: 1
          })
        })
      );
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
        'Failed to cleanup file /uploads/non-existent-file.pdf: File not found',
        expect.objectContaining({
          error: 'File not found',
          errorCode: undefined,
          filePath: '/uploads/non-existent-file.pdf'
        })
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

describe('Upload Middleware Enhanced Error Handling', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let mockFile: Partial<MultipartFile>;
  
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock request
    mockRequest = {
      url: '/api/applications/1/documents',
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data' },
      log: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      },
      isMultipart: vi.fn().mockReturnValue(true),
      file: vi.fn(),
      files: vi.fn()
    };
    
    // Mock reply
    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };
    
    // Mock file
    mockFile = {
      filename: 'test-resume.pdf',
      mimetype: 'application/pdf',
      file: new Readable({
        read() {
          this.push('test content');
          this.push(null);
        }
      })
    };
    
    // Set up mock implementations
    require('fs').createWriteStream = vi.fn().mockReturnValue({
      write: vi.fn(),
      end: vi.fn()
    });
    
    require('stream/promises').pipeline = vi.fn().mockResolvedValue(undefined);
    
    fs.access = vi.fn().mockResolvedValue(undefined);
    fs.stat = vi.fn().mockResolvedValue({ size: 1024 });
    fs.unlink = vi.fn().mockResolvedValue(undefined);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadSingle middleware', () => {
    it('should handle successful single file upload with logging', async () => {
      const middleware = uploadSingle('document');
      
      (mockRequest.file as Mock).mockResolvedValue(mockFile);
      
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      // Verify logging was called
      expect(mockRequest.log!.info).toHaveBeenCalledWith(
        expect.objectContaining({
          operationId: expect.stringMatching(/^upload-\d+-[a-z0-9]+$/),
          fieldName: 'document',
          url: '/api/applications/1/documents',
          method: 'POST'
        }),
        'Starting single file upload operation'
      );
      
      expect(mockRequest.log!.info).toHaveBeenCalledWith(
        expect.objectContaining({
          originalName: 'test-resume.pdf',
          mimeType: 'application/pdf'
        }),
        'File received, starting validation'
      );
      
      expect(mockRequest.log!.info).toHaveBeenCalledWith(
        expect.objectContaining({
          operationId: expect.any(String)
        }),
        'Single file upload operation completed successfully'
      );
      
      // Verify file was attached to request
      expect(mockRequest.uploadedFile).toBeDefined();
      expect(mockRequest.uploadedFile!.originalName).toBe('test-resume.pdf');
    });

    it('should reject non-multipart requests with proper logging', async () => {
      const middleware = uploadSingle('document');
      
      (mockRequest.isMultipart as Mock).mockReturnValue(false);
      
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockRequest.log!.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          operationId: expect.any(String),
          contentType: 'multipart/form-data'
        }),
        'File upload rejected - invalid content type'
      );
      
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid Content Type',
          message: 'Request must be multipart/form-data for file uploads',
          statusCode: 400,
          path: '/api/applications/1/documents',
          timestamp: expect.any(String)
        })
      );
    });

    it('should reject uploads with no file and log appropriately', async () => {
      const middleware = uploadSingle('document');
      
      (mockRequest.file as Mock).mockResolvedValue(null);
      
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockRequest.log!.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          operationId: expect.any(String),
          fieldName: 'document'
        }),
        'File upload rejected - no file provided'
      );
      
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'No File Provided',
          message: "Please provide a file in the 'document' field",
          statusCode: 400,
          path: '/api/applications/1/documents',
          timestamp: expect.any(String)
        })
      );
    });

    it('should reject invalid file types with detailed logging', async () => {
      const middleware = uploadSingle('document');
      
      const invalidFile = {
        ...mockFile,
        filename: 'test.exe',
        mimetype: 'application/x-executable'
      };
      
      (mockRequest.file as Mock).mockResolvedValue(invalidFile);
      
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockRequest.log!.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          operationId: expect.any(String),
          filename: 'test.exe',
          mimeType: 'application/x-executable',
          error: expect.stringContaining('Invalid file extension')
        }),
        'File upload rejected - invalid file type'
      );
      
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid File Type',
          details: expect.objectContaining({
            filename: 'test.exe',
            mimeType: 'application/x-executable',
            allowedTypes: expect.any(Array),
            allowedExtensions: expect.any(Array)
          })
        })
      );
    });

    it('should reject files that are too large with size details', async () => {
      const middleware = uploadSingle('document');
      
      const largeFile = {
        ...mockFile,
        file: {
          ...mockFile.file,
          readableLength: 15 * 1024 * 1024 // 15MB
        }
      };
      
      (mockRequest.file as Mock).mockResolvedValue(largeFile);
      
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockRequest.log!.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'test-resume.pdf',
          size: 15 * 1024 * 1024,
          maxSize: 10 * 1024 * 1024,
          error: expect.stringContaining('File size (15.00MB) exceeds')
        }),
        'File upload rejected - file too large'
      );
      
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'File Too Large',
          details: expect.objectContaining({
            filename: 'test-resume.pdf',
            size: 15 * 1024 * 1024,
            maxSize: 10 * 1024 * 1024
          })
        })
      );
    });

    it('should handle file save errors with cleanup and logging', async () => {
      const middleware = uploadSingle('document');
      
      (mockRequest.file as Mock).mockResolvedValue(mockFile);
      
      // Mock pipeline to reject with disk error
      const { pipeline } = await import('stream/promises');
      (pipeline as Mock).mockRejectedValue(new Error('Disk full'));
      
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      // Verify error logging
      expect(mockRequest.log!.error).toHaveBeenCalledWith(
        expect.objectContaining({
          operationId: expect.any(String),
          error: expect.stringContaining('Failed to save file'),
          stack: expect.any(String)
        }),
        'Single file upload operation failed'
      );
      
      // Verify error response
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Upload Failed',
          message: expect.stringContaining('Failed to save file'),
          statusCode: 500,
          timestamp: expect.any(String),
          path: '/api/applications/1/documents'
        })
      );
    });

    it('should handle FST_FILES_LIMIT error with proper status code', async () => {
      const middleware = uploadSingle('document');
      
      const limitError = new Error('File too large');
      (limitError as any).code = 'FST_FILES_LIMIT';
      
      (mockRequest.file as Mock).mockRejectedValue(limitError);
      
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockReply.status).toHaveBeenCalledWith(413);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'File Too Large',
          statusCode: 413,
          details: expect.objectContaining({
            maxSize: 10 * 1024 * 1024
          })
        })
      );
    });

    it('should handle storage permission errors', async () => {
      const middleware = uploadSingle('document');
      
      const permError = new Error('Permission denied');
      (permError as any).code = 'EACCES';
      
      (mockRequest.file as Mock).mockRejectedValue(permError);
      
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Storage Permission Error',
          message: 'Permission denied while saving file'
        })
      );
    });

    it('should handle storage full errors', async () => {
      const middleware = uploadSingle('document');
      
      const spaceError = new Error('No space left on device');
      (spaceError as any).code = 'ENOSPC';
      
      (mockRequest.file as Mock).mockRejectedValue(spaceError);
      
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockReply.status).toHaveBeenCalledWith(507);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Storage Full',
          message: 'Not enough storage space available for file upload'
        })
      );
    });
  });

  describe('uploadMultiple middleware', () => {
    it('should handle successful multiple file upload with logging', async () => {
      const middleware = uploadMultiple('documents', 3);
      
      const mockFiles = [
        { ...mockFile, filename: 'resume1.pdf' },
        { ...mockFile, filename: 'resume2.pdf' }
      ];
      
      const asyncGenerator = async function* () {
        for (const file of mockFiles) {
          yield file;
        }
      };
      
      (mockRequest.files as Mock).mockReturnValue(asyncGenerator());
      
      // Mock pipeline to resolve for each file
      const { pipeline } = await import('stream/promises');
      (pipeline as Mock).mockResolvedValue(undefined);
      
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockRequest.log!.info).toHaveBeenCalledWith(
        expect.objectContaining({
          operationId: expect.stringMatching(/^upload-multi-\d+-[a-z0-9]+$/),
          fieldName: 'documents',
          maxCount: 3
        }),
        'Starting multiple file upload operation'
      );
      
      expect(mockRequest.log!.info).toHaveBeenCalledWith(
        expect.objectContaining({
          totalFiles: 2,
          totalSize: expect.any(Number)
        }),
        'Multiple file upload operation completed successfully'
      );
      
      expect(mockRequest.uploadedFiles).toBeDefined();
      expect(mockRequest.uploadedFiles).toHaveLength(2);
    });

    it('should cleanup files when too many are uploaded', async () => {
      const middleware = uploadMultiple('documents', 2);
      
      const mockFiles = [
        { ...mockFile, filename: 'file1.pdf' },
        { ...mockFile, filename: 'file2.pdf' },
        { ...mockFile, filename: 'file3.pdf' } // This should trigger the limit
      ];
      
      const asyncGenerator = async function* () {
        for (const file of mockFiles) {
          yield file;
        }
      };
      
      (mockRequest.files as Mock).mockReturnValue(asyncGenerator());
      
      // Mock pipeline to resolve for the first 2 files
      const { pipeline } = await import('stream/promises');
      (pipeline as Mock).mockResolvedValue(undefined);
      
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockRequest.log!.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          fileCount: 3,
          maxCount: 2,
          cleanedUpFiles: 2
        }),
        'Multiple file upload rejected - too many files, cleaned up uploaded files'
      );
      
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too Many Files',
          details: expect.objectContaining({
            fileCount: 3,
            maxCount: 2,
            uploadedFiles: 2
          })
        })
      );
    });

    it('should cleanup files when invalid file type is encountered', async () => {
      const middleware = uploadMultiple('documents', 3);
      
      const mockFiles = [
        { ...mockFile, filename: 'resume.pdf' },
        { ...mockFile, filename: 'malware.exe', mimetype: 'application/x-executable' }
      ];
      
      const asyncGenerator = async function* () {
        for (const file of mockFiles) {
          yield file;
        }
      };
      
      (mockRequest.files as Mock).mockReturnValue(asyncGenerator());
      
      // Mock pipeline to resolve for the first file only
      const { pipeline } = await import('stream/promises');
      (pipeline as Mock).mockResolvedValue(undefined);
      
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockRequest.log!.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          rejectedFile: 'malware.exe',
          mimeType: 'application/x-executable',
          cleanedUpFiles: 1
        }),
        'Multiple file upload rejected - invalid file type, cleaned up uploaded files'
      );
      
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid File Type',
          details: expect.objectContaining({
            rejectedFile: {
              filename: 'malware.exe',
              mimeType: 'application/x-executable'
            },
            uploadedFiles: 1
          })
        })
      );
    });
  });

  describe('Cleanup utilities', () => {
    it('should successfully cleanup a file', async () => {
      const result = await cleanupFile('/path/to/file.pdf');
      
      expect(result.success).toBe(true);
      expect(fs.unlink).toHaveBeenCalledWith('/path/to/file.pdf');
    });

    it('should handle ENOENT errors gracefully', async () => {
      const error = new Error('File not found');
      (error as any).code = 'ENOENT';
      fs.unlink.mockRejectedValue(error);
      
      const result = await cleanupFile('/path/to/missing-file.pdf');
      
      expect(result.success).toBe(true);
    });

    it('should handle other cleanup errors', async () => {
      const error = new Error('Permission denied');
      (error as any).code = 'EACCES';
      fs.unlink.mockRejectedValue(error);
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = await cleanupFile('/path/to/protected-file.pdf');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to cleanup file'),
        expect.objectContaining({
          filePath: '/path/to/protected-file.pdf',
          errorCode: 'EACCES'
        })
      );
      
      consoleSpy.mockRestore();
    });

    it('should cleanup multiple files and return results', async () => {
      const filePaths = ['/file1.pdf', '/file2.pdf', '/missing.pdf'];
      
      // Mock different results for each file
      fs.unlink
        .mockResolvedValueOnce(undefined) // file1.pdf success
        .mockResolvedValueOnce(undefined) // file2.pdf success
        .mockRejectedValueOnce(Object.assign(new Error('File not found'), { code: 'ENOENT' })); // missing.pdf not found
      
      const results = await cleanupFiles(filePaths);
      
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ filePath: '/file1.pdf', success: true });
      expect(results[1]).toEqual({ filePath: '/file2.pdf', success: true });
      expect(results[2]).toEqual({ filePath: '/missing.pdf', success: true }); // ENOENT treated as success
    });
  });

  describe('Utility functions', () => {
    it('should create file info correctly', () => {
      const mockMultipartFile = {
        filename: 'test.pdf',
        mimetype: 'application/pdf'
      } as MultipartFile;
      
      const fileInfo = getFileInfo(mockMultipartFile, '/uploads/test-123.pdf');
      
      expect(fileInfo).toEqual({
        originalName: 'test.pdf',
        filename: 'test-123.pdf',
        path: '/uploads/test-123.pdf',
        size: 0,
        mimeType: 'application/pdf',
        uploadDate: expect.any(Date)
      });
    });

    it('should handle file info with missing mimetype', () => {
      const mockMultipartFile = {
        filename: 'test.pdf',
        mimetype: undefined
      } as MultipartFile;
      
      const fileInfo = getFileInfo(mockMultipartFile, '/uploads/test-123.pdf');
      
      expect(fileInfo.mimeType).toBe('application/octet-stream');
    });

    it('should throw error for invalid file object', () => {
      expect(() => {
        getFileInfo(null as any, '/path');
      }).toThrow('Invalid file object provided');
      
      expect(() => {
        getFileInfo({ filename: '' } as MultipartFile, '/path');
      }).toThrow('Invalid file object provided');
    });

    it('should throw error for missing saved path', () => {
      const mockMultipartFile = {
        filename: 'test.pdf',
        mimetype: 'application/pdf'
      } as MultipartFile;
      
      expect(() => {
        getFileInfo(mockMultipartFile, '');
      }).toThrow('Saved path is required');
    });

    it('should return upload configuration', () => {
      const config = getUploadConfig();
      
      expect(config).toEqual({
        maxFileSize: 10 * 1024 * 1024,
        maxFileSizeMB: 10,
        uploadDir: expect.stringContaining('uploads'),
        allowedMimeTypes: expect.arrayContaining(['application/pdf']),
        allowedExtensions: expect.arrayContaining(['.pdf'])
      });
    });
  });
}); 