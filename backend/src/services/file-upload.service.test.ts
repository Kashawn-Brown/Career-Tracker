/**
 * FileUploadService Unit Tests
 * 
 * Tests the file storage operations layer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileUploadService } from './file-upload.service.js';
import fs from 'fs/promises';
import { createReadStream } from 'fs';

// Mock fs and storage config
vi.mock('fs/promises');
vi.mock('fs', () => ({
  createReadStream: vi.fn(),
  createWriteStream: vi.fn(),
}));

vi.mock('../config/storage.js', () => ({
  getValidatedStorageConfig: vi.fn(() => ({
    type: 'local',
    local: {
      uploadDir: 'uploads',
      baseUrl: 'http://localhost:3002',
      maxFileSize: 10485760,
      allowedTypes: ['application/pdf', 'application/msword']
    }
  }))
}));

describe('FileUploadService', () => {
  let fileUploadService: FileUploadService;

  beforeEach(() => {
    fileUploadService = new FileUploadService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('storeFile', () => {
    it('should store file successfully with local storage', async () => {
      // Arrange
      const fileBuffer = Buffer.from('test file content');
      const originalName = 'test-resume.pdf';
      const mimeType = 'application/pdf';

      // Mock fs operations
      vi.mocked(fs.access).mockRejectedValue(new Error('Directory not found'));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      // Act
      const result = await fileUploadService.storeFile(fileBuffer, originalName, mimeType);

      // Assert
      expect(result.success).toBe(true);
      expect(result.filePath).toMatch(/^test-resume-\d+-[a-z0-9]{6}\.pdf$/);
      expect(result.url).toMatch(/^http:\/\/localhost:3002\/uploads\/documents\/test-resume-\d+-[a-z0-9]{6}\.pdf$/);
      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringMatching(/.*[\\\/]uploads[\\\/]documents$/),
        { recursive: true }
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.pdf'),
        fileBuffer
      );
    });

    it('should handle storage errors gracefully', async () => {
      // Arrange
      const fileBuffer = Buffer.from('test content');
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Disk full'));

      // Act
      const result = await fileUploadService.storeFile(fileBuffer, 'test.pdf', 'application/pdf');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Disk full');
    });

    it('should return error for unsupported storage type', async () => {
      // Arrange
      const service = new FileUploadService();
      // Mock config to return unsupported type
      (service as any).config = { type: 'unsupported' };

      // Act
      const result = await service.storeFile(Buffer.from('test'), 'test.pdf', 'application/pdf');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unsupported storage type: unsupported');
    });
  });

  describe('storeUploadedFile', () => {
    it('should store uploaded file successfully', async () => {
      // Arrange
      const uploadedFile = {
        originalName: 'My Resume.pdf',
        filename: 'test-resume-123.pdf',
        path: '/tmp/upload-123.pdf',
        size: 1024,
        mimeType: 'application/pdf',
        uploadDate: new Date()
      };

      const fileBuffer = Buffer.from('test file content');
      vi.mocked(fs.readFile).mockResolvedValue(fileBuffer);
      vi.mocked(fs.access).mockRejectedValue(new Error('Directory not found'));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      // Act
      const result = await fileUploadService.storeUploadedFile(uploadedFile);

      // Assert
      expect(result.success).toBe(true);
      expect(fs.readFile).toHaveBeenCalledWith('/tmp/upload-123.pdf');
      expect(result.filePath).toBe('test-resume-123.pdf');
    });

    it('should handle file read errors', async () => {
      // Arrange
      const uploadedFile = {
        originalName: 'test.pdf',
        filename: 'test.pdf',
        path: '/tmp/test.pdf',
        size: 1024,
        mimeType: 'application/pdf',
        uploadDate: new Date()
      };

      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      // Act
      const result = await fileUploadService.storeUploadedFile(uploadedFile);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });
  });

  describe('retrieveFile', () => {
    it('should retrieve file successfully from local storage', async () => {
      // Arrange
      const filePath = 'test-resume.pdf';
      const mockStats = { size: 1024 };
      const mockStream = { pipe: vi.fn() } as any;

      vi.mocked(fs.stat).mockResolvedValue(mockStats as any);
      vi.mocked(createReadStream).mockReturnValue(mockStream);

      // Act
      const result = await fileUploadService.retrieveFile(filePath);

      // Assert
      expect(result.success).toBe(true);
      expect(result.stream).toBe(mockStream);
      expect(result.contentLength).toBe(1024);
      expect(fs.stat).toHaveBeenCalledWith(
        expect.stringMatching(/.*[\\\/]uploads[\\\/]documents[\\\/]test-resume\.pdf$/)
      );
    });

    it('should handle file not found errors', async () => {
      // Arrange
      vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'));

      // Act
      const result = await fileUploadService.retrieveFile('nonexistent.pdf');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully from local storage', async () => {
      // Arrange
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      // Act
      const result = await fileUploadService.deleteFile('test-resume.pdf');

      // Assert
      expect(result.success).toBe(true);
      expect(fs.unlink).toHaveBeenCalledWith(
        expect.stringMatching(/.*[\\\/]uploads[\\\/]documents[\\\/]test-resume\.pdf$/)
      );
    });

    it('should handle deletion errors gracefully', async () => {
      // Arrange
      vi.mocked(fs.unlink).mockRejectedValue(new Error('Permission denied'));

      // Act
      const result = await fileUploadService.deleteFile('test-resume.pdf');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });
  });

  describe('getFileUrl', () => {
    it('should generate correct URL for local storage', async () => {
      // Act
      const url = await fileUploadService.getFileUrl('test-resume.pdf');

      // Assert
      expect(url).toBe('http://localhost:3002/uploads/documents/test-resume.pdf');
    });

    it('should return null for unsupported storage type', async () => {
      // Arrange
      (fileUploadService as any).config = { type: 'unsupported' };

      // Act
      const url = await fileUploadService.getFileUrl('test.pdf');

      // Assert
      expect(url).toBeNull();
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      // Arrange
      vi.mocked(fs.access).mockResolvedValue(undefined);

      // Act
      const exists = await fileUploadService.fileExists('test-resume.pdf');

      // Assert
      expect(exists).toBe(true);
      expect(fs.access).toHaveBeenCalledWith(
        expect.stringMatching(/.*[\\\/]uploads[\\\/]documents[\\\/]test-resume\.pdf$/)
      );
    });

    it('should return false when file does not exist', async () => {
      // Arrange
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      // Act
      const exists = await fileUploadService.fileExists('nonexistent.pdf');

      // Assert
      expect(exists).toBe(false);
    });

    it('should return false for unsupported storage type', async () => {
      // Arrange
      (fileUploadService as any).config = { type: 'unsupported' };

      // Act
      const exists = await fileUploadService.fileExists('test.pdf');

      // Assert
      expect(exists).toBe(false);
    });
  });

  describe('generateUniqueFilename', () => {
    it('should generate unique filename with timestamp and random suffix', () => {
      // Arrange
      const originalName = 'My Resume.pdf';

      // Act
      const filename1 = fileUploadService.generateUniqueFilename(originalName);
      const filename2 = fileUploadService.generateUniqueFilename(originalName);

      // Assert
      expect(filename1).toMatch(/^My Resume-\d+-[a-z0-9]{6}\.pdf$/);
      expect(filename2).toMatch(/^My Resume-\d+-[a-z0-9]{6}\.pdf$/);
      expect(filename1).not.toBe(filename2); // Should be unique
    });

    it('should handle filenames without extensions', () => {
      // Act
      const filename = fileUploadService.generateUniqueFilename('README');

      // Assert
      expect(filename).toMatch(/^README-\d+-[a-z0-9]{6}$/);
    });

    it('should preserve file extension', () => {
      // Act
      const filename = fileUploadService.generateUniqueFilename('document.docx');

      // Assert
      expect(filename).toMatch(/^document-\d+-[a-z0-9]{6}\.docx$/);
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage configuration information', () => {
      // Act
      const info = fileUploadService.getStorageInfo();

      // Assert
      expect(info).toEqual({
        type: 'local',
        maxFileSize: 10485760,
        allowedTypes: ['application/pdf', 'application/msword']
      });
    });

    it('should return defaults when local config is not available', () => {
      // Arrange
      (fileUploadService as any).config = { type: 'local' }; // No local config

      // Act
      const info = fileUploadService.getStorageInfo();

      // Assert
      expect(info).toEqual({
        type: 'local',
        maxFileSize: 10485760, // Default
        allowedTypes: [] // Default
      });
    });
  });

  describe('cloud storage placeholder methods', () => {
    it('should return not implemented error for Cloudinary storage', async () => {
      // Arrange
      (fileUploadService as any).config = { type: 'cloudinary' };

      // Act
      const result = await fileUploadService.storeFile(Buffer.from('test'), 'test.pdf', 'application/pdf');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cloudinary storage not yet implemented');
    });

    it('should return not implemented error for S3 storage', async () => {
      // Arrange
      (fileUploadService as any).config = { type: 's3' };

      // Act
      const result = await fileUploadService.storeFile(Buffer.from('test'), 'test.pdf', 'application/pdf');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('S3 storage not yet implemented');
    });

    it('should throw error for Cloudinary URL generation', async () => {
      // Arrange
      (fileUploadService as any).config = { type: 'cloudinary' };

      // Act & Assert
      await expect(fileUploadService.getFileUrl('test.pdf'))
        .rejects.toThrow('Cloudinary URL generation not yet implemented');
    });

    it('should throw error for S3 URL generation', async () => {
      // Arrange
      (fileUploadService as any).config = { type: 's3' };

      // Act & Assert
      await expect(fileUploadService.getFileUrl('test.pdf'))
        .rejects.toThrow('S3 URL generation not yet implemented');
    });
  });
}); 