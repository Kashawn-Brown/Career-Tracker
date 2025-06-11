/**
 * File Upload Service
 * 
 * Business logic layer for file storage operations.
 * Abstracts file storage with support for local storage (MVP) and future cloud storage.
 * Handles storing, retrieving, and deleting files.
 */

import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { getValidatedStorageConfig } from '../config/storage.js';
import { UploadedFileInfo } from '../models/document.models.js';

export interface FileStorageResult {
  success: boolean;
  filePath?: string;
  url?: string;
  error?: string;
}

export interface FileRetrievalResult {
  success: boolean;
  stream?: NodeJS.ReadableStream;
  contentType?: string;
  contentLength?: number;
  error?: string;
}

export class FileUploadService {
  private config = getValidatedStorageConfig();

  /**
   * Store a file using the configured storage provider
   */
  async storeFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    destinationPath?: string
  ): Promise<FileStorageResult> {
    try {
      switch (this.config.type) {
        case 'local':
          return await this.storeFileLocally(fileBuffer, originalName, mimeType, destinationPath);
        case 'cloudinary':
          return await this.storeFileCloudinary(fileBuffer, originalName, mimeType);
        case 's3':
          return await this.storeFileS3(fileBuffer, originalName, mimeType);
        default:
          return {
            success: false,
            error: `Unsupported storage type: ${this.config.type}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown storage error'
      };
    }
  }

  /**
   * Store a file from an uploaded file info object
   */
  async storeUploadedFile(uploadedFile: UploadedFileInfo): Promise<FileStorageResult> {
    try {
      // Read the file from the uploaded path
      const fileBuffer = await fs.readFile(uploadedFile.path);
      
      // Store using the configured storage
      const result = await this.storeFile(
        fileBuffer,
        uploadedFile.originalName,
        uploadedFile.mimeType,
        uploadedFile.filename
      );

      // Clean up temporary file if storage was successful and it's not local storage
      if (result.success && this.config.type !== 'local') {
        await this.cleanupTempFile(uploadedFile.path);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process uploaded file'
      };
    }
  }

  /**
   * Retrieve a file from storage
   */
  async retrieveFile(filePath: string): Promise<FileRetrievalResult> {
    try {
      switch (this.config.type) {
        case 'local':
          return await this.retrieveFileLocally(filePath);
        case 'cloudinary':
          return await this.retrieveFileCloudinary(filePath);
        case 's3':
          return await this.retrieveFileS3(filePath);
        default:
          return {
            success: false,
            error: `Unsupported storage type: ${this.config.type}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown retrieval error'
      };
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      switch (this.config.type) {
        case 'local':
          return await this.deleteFileLocally(filePath);
        case 'cloudinary':
          return await this.deleteFileCloudinary(filePath);
        case 's3':
          return await this.deleteFileS3(filePath);
        default:
          return {
            success: false,
            error: `Unsupported storage type: ${this.config.type}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown deletion error'
      };
    }
  }

  /**
   * Get file URL for serving/downloading
   */
  async getFileUrl(filePath: string): Promise<string | null> {
    try {
      switch (this.config.type) {
        case 'local':
          return this.getLocalFileUrl(filePath);
        case 'cloudinary':
          return this.getCloudinaryFileUrl(filePath);
        case 's3':
          return this.getS3FileUrl(filePath);
        default:
          return null;
      }
    } catch (error) {
      // Re-throw "not implemented" errors to signal unimplemented features
      if (error instanceof Error && error.message.includes('not yet implemented')) {
        throw error;
      }
      // Catch and log actual operational errors
      console.error('Error getting file URL:', error);
      return null;
    }
  }

  /**
   * Check if a file exists in storage
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      switch (this.config.type) {
        case 'local':
          return await this.fileExistsLocally(filePath);
        case 'cloudinary':
          return await this.fileExistsCloudinary(filePath);
        case 's3':
          return await this.fileExistsS3(filePath);
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a unique filename
   */
  generateUniqueFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${name}-${timestamp}-${randomSuffix}${ext}`;
  }

  /**
   * Get storage configuration information
   */
  getStorageInfo() {
    return {
      type: this.config.type,
      maxFileSize: this.config.local?.maxFileSize || 10485760, // Default 10MB
      allowedTypes: this.config.local?.allowedTypes || []
    };
  }

  // ===== LOCAL STORAGE METHODS =====

  /**
   * Store file locally
   */
  private async storeFileLocally(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    destinationPath?: string
  ): Promise<FileStorageResult> {
    if (!this.config.local) {
      return { success: false, error: 'Local storage not configured' };
    }

    const uploadDir = path.join(process.cwd(), this.config.local.uploadDir, 'documents');
    await this.ensureDirectoryExists(uploadDir);

    const filename = destinationPath || this.generateUniqueFilename(originalName);
    const filePath = path.join(uploadDir, filename);

    await fs.writeFile(filePath, fileBuffer);

    return {
      success: true,
      filePath: filename, // Return relative path for database storage
      url: this.getLocalFileUrl(filename)
    };
  }

  /**
   * Retrieve file locally
   */
  private async retrieveFileLocally(filePath: string): Promise<FileRetrievalResult> {
    if (!this.config.local) {
      return { success: false, error: 'Local storage not configured' };
    }

    const fullPath = path.join(process.cwd(), this.config.local.uploadDir, 'documents', filePath);
    
    try {
      const stats = await fs.stat(fullPath);
      const stream = createReadStream(fullPath);
      
      return {
        success: true,
        stream,
        contentLength: stats.size
      };
    } catch (error) {
      return {
        success: false,
        error: 'File not found'
      };
    }
  }

  /**
   * Delete file locally
   */
  private async deleteFileLocally(filePath: string): Promise<{ success: boolean; error?: string }> {
    if (!this.config.local) {
      return { success: false, error: 'Local storage not configured' };
    }

    const fullPath = path.join(process.cwd(), this.config.local.uploadDir, 'documents', filePath);
    
    try {
      await fs.unlink(fullPath);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete file'
      };
    }
  }

  /**
   * Get local file URL
   */
  private getLocalFileUrl(filePath: string): string {
    if (!this.config.local) {
      throw new Error('Local storage not configured');
    }
    return `${this.config.local.baseUrl}/uploads/documents/${filePath}`;
  }

  /**
   * Check if file exists locally
   */
  private async fileExistsLocally(filePath: string): Promise<boolean> {
    if (!this.config.local) {
      return false;
    }

    const fullPath = path.join(process.cwd(), this.config.local.uploadDir, 'documents', filePath);
    
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  // ===== PLACEHOLDER CLOUD STORAGE METHODS =====
  // These will be implemented when migrating to cloud storage

  private async storeFileCloudinary(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<FileStorageResult> {
    // TODO: Implement Cloudinary storage
    return {
      success: false,
      error: 'Cloudinary storage not yet implemented'
    };
  }

  private async retrieveFileCloudinary(filePath: string): Promise<FileRetrievalResult> {
    // TODO: Implement Cloudinary retrieval
    return {
      success: false,
      error: 'Cloudinary retrieval not yet implemented'
    };
  }

  private async deleteFileCloudinary(filePath: string): Promise<{ success: boolean; error?: string }> {
    // TODO: Implement Cloudinary deletion
    return {
      success: false,
      error: 'Cloudinary deletion not yet implemented'
    };
  }

  private getCloudinaryFileUrl(filePath: string): string {
    // TODO: Implement Cloudinary URL generation
    throw new Error('Cloudinary URL generation not yet implemented');
  }

  private async fileExistsCloudinary(filePath: string): Promise<boolean> {
    // TODO: Implement Cloudinary file existence check
    return false;
  }

  private async storeFileS3(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<FileStorageResult> {
    // TODO: Implement S3 storage
    return {
      success: false,
      error: 'S3 storage not yet implemented'
    };
  }

  private async retrieveFileS3(filePath: string): Promise<FileRetrievalResult> {
    // TODO: Implement S3 retrieval
    return {
      success: false,
      error: 'S3 retrieval not yet implemented'
    };
  }

  private async deleteFileS3(filePath: string): Promise<{ success: boolean; error?: string }> {
    // TODO: Implement S3 deletion
    return {
      success: false,
      error: 'S3 deletion not yet implemented'
    };
  }

  private getS3FileUrl(filePath: string): string {
    // TODO: Implement S3 URL generation
    throw new Error('S3 URL generation not yet implemented');
  }

  private async fileExistsS3(filePath: string): Promise<boolean> {
    // TODO: Implement S3 file existence check
    return false;
  }

  // ===== UTILITY METHODS =====

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Clean up temporary file
   */
  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`Failed to cleanup temporary file ${filePath}:`, error);
    }
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService(); 