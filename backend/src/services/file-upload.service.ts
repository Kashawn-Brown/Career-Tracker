/**
 * File Upload Service
 * 
 * Business logic layer for file upload operations following the established auth pattern.
 * Handles file processing, validation, storage coordination, and business rules.
 * Provides standardized result types for consistent API responses.
 */

import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import { getValidatedStorageConfig } from '../config/storage.js';
import { UploadedFileInfo } from '../models/document.models.js';
import {
  ProcessSingleFileUploadResult,
  ProcessMultipleFileUploadResult,
  GetFileInfoResult,
  DownloadFileResult,
  DeleteFileResult,
  UploadConfigurationResult,
  FileValidationResult,
  MultipleFileValidationResult,
  FileProcessingOptions,
  FileStorageMetadata,
  FileUploadError
} from '../models/file-upload.models.js';

// Legacy interfaces for backward compatibility
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

  // ===== NEW BUSINESS LOGIC METHODS (AUTH PATTERN) =====

  /**
   * Process a single file upload with validation and storage
   * Main business logic method for single file operations
   */
  async processSingleFileUpload(
    uploadedFile: UploadedFileInfo,
    options: FileProcessingOptions = {}
  ): Promise<ProcessSingleFileUploadResult> {
    try {
      // Validate the uploaded file
      const validation = await this.validateSingleFile(uploadedFile);
      if (!validation.valid) {
        return {
          success: false,
          statusCode: 400,
          error: 'File Validation Failed',
          message: 'The uploaded file failed validation checks',
          details: {
            filename: uploadedFile.originalName,
            errors: validation.errors
          }
        };
      }

      // Store the file using the storage service
      const storeResult = await this.storeUploadedFile(uploadedFile);
      
      if (!storeResult.success) {
        return {
          success: false,
          statusCode: 500,
          error: 'File Storage Error',
          message: 'Failed to store the uploaded file',
          details: {
            filename: uploadedFile.originalName,
            storageError: storeResult.error
          }
        };
      }

      // Generate file URL if requested
      let fileUrl: string | undefined;
      if (options.generateUrl !== false) {
        try {
          fileUrl = await this.getFileUrl(storeResult.filePath || uploadedFile.filename) || undefined;
        } catch (error) {
          // Don't fail the upload if URL generation fails
          console.warn('Failed to generate file URL:', error);
        }
      }

      return {
        success: true,
        statusCode: 201,
        message: 'File uploaded successfully',
        file: {
          filename: uploadedFile.filename,
          originalName: uploadedFile.originalName,
          size: uploadedFile.size,
          mimeType: uploadedFile.mimeType,
          url: fileUrl,
          path: storeResult.filePath || uploadedFile.path,
          uploadDate: uploadedFile.uploadDate
        }
      };

    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred during file upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process multiple file uploads with validation and storage
   * Main business logic method for multiple file operations
   */
  async processMultipleFileUpload(
    uploadedFiles: UploadedFileInfo[],
    options: FileProcessingOptions = {}
  ): Promise<ProcessMultipleFileUploadResult> {
    try {
      if (!uploadedFiles || uploadedFiles.length === 0) {
        return {
          success: false,
          statusCode: 400,
          error: 'No Files Provided',
          message: 'No files were provided for upload'
        };
      }

      // Validate all files
      const validation = await this.validateMultipleFiles(uploadedFiles);
      
      // For partial success scenarios, we should process valid files even if some are invalid
      // Only fail completely if NO files are valid
      if (validation.validFiles.length === 0) {
        return {
          success: false,
          statusCode: 400,
          error: 'File Validation Failed',
          message: 'No valid files to process',
          details: {
            totalFiles: validation.totalFiles,
            errors: validation.errors,
            invalidFiles: validation.invalidFiles.map(invalid => ({
              filename: invalid.file.originalName,
              errors: invalid.errors
            }))
          }
        };
      }

      // Process each valid file
      const processedFiles: Array<NonNullable<ProcessSingleFileUploadResult['file']>> = [];
      const errors: FileUploadError[] = [];
      let totalSize = 0;

      for (const file of validation.validFiles) {
        try {
          const storeResult = await this.storeUploadedFile(file);
          
          if (storeResult.success) {
            // Generate file URL if requested
            let fileUrl: string | undefined;
            if (options.generateUrl !== false) {
              try {
                fileUrl = await this.getFileUrl(storeResult.filePath || file.filename) || undefined;
              } catch (error) {
                console.warn(`Failed to generate URL for ${file.filename}:`, error);
              }
            }

            processedFiles.push({
              filename: file.filename,
              originalName: file.originalName,
              size: file.size,
              mimeType: file.mimeType,
              url: fileUrl,
              path: storeResult.filePath || file.path,
              uploadDate: file.uploadDate
            });

            totalSize += file.size;
          } else {
            errors.push({
              code: 'STORAGE_ERROR',
              message: storeResult.error || 'Failed to store file',
              file: {
                filename: file.originalName,
                size: file.size,
                mimeType: file.mimeType
              }
            });
          }
        } catch (error) {
          errors.push({
            code: 'PROCESSING_ERROR',
            message: error instanceof Error ? error.message : 'Unknown processing error',
            file: {
              filename: file.originalName,
              size: file.size,
              mimeType: file.mimeType
            }
          });
        }
      }

      // Determine overall success
      const allOriginalFilesProcessed = processedFiles.length === uploadedFiles.length;
      const allValidFilesProcessed = processedFiles.length === validation.validFiles.length;
      const hasProcessedFiles = processedFiles.length > 0;

      if (!hasProcessedFiles) {
        return {
          success: false,
          statusCode: 500,
          error: 'File Processing Failed',
          message: 'Failed to process any of the uploaded files',
          details: { errors }
        };
      }

      const result = {
        success: true, // Partial success is still success - any files processed successfully
        statusCode: allOriginalFilesProcessed ? 201 : 207, // 207 Multi-Status for partial success (some files rejected/failed)
        message: allOriginalFilesProcessed 
          ? 'All files uploaded successfully'
          : `${processedFiles.length} of ${uploadedFiles.length} files uploaded successfully`,
        files: processedFiles,
        totalFiles: processedFiles.length,
        totalSize,
        details: errors.length > 0 ? { errors } : undefined
      };
      
      return result;

    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred during multiple file upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get file information and metadata
   * Business logic method for file info retrieval
   */
  async getFileInfo(filename: string): Promise<GetFileInfoResult> {
    try {
      if (!filename || filename.trim() === '') {
        return {
          success: false,
          statusCode: 400,
          error: 'Bad Request',
          message: 'Filename is required'
        };
      }

      // Check if file exists
      const exists = await this.fileExists(filename);
      
      if (!exists) {
        return {
          success: false,
          statusCode: 404,
          error: 'File Not Found',
          message: `File '${filename}' does not exist`
        };
      }

      // Get file details from storage
      const fileInfo = await this.getFileDetails(filename);
      
      if (!fileInfo) {
        return {
          success: false,
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to retrieve file information'
        };
      }

      // Generate file URL
      let fileUrl: string | undefined;
      try {
        fileUrl = await this.getFileUrl(filename) || undefined;
      } catch (error) {
        console.warn(`Failed to generate URL for ${filename}:`, error);
      }

      return {
        success: true,
        statusCode: 200,
        file: {
          filename: fileInfo.filename,
          originalName: fileInfo.originalName || fileInfo.filename,
          size: fileInfo.size,
          mimeType: fileInfo.mimeType || 'application/octet-stream',
          url: fileUrl,
          exists: true,
          uploadDate: fileInfo.uploadDate
        }
      };

    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while retrieving file information',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Download a file with stream handling
   * Business logic method for file download
   */
  async downloadFile(filename: string): Promise<DownloadFileResult> {
    try {
      if (!filename || filename.trim() === '') {
        return {
          success: false,
          statusCode: 400,
          error: 'Bad Request',
          message: 'Filename is required'
        };
      }

      // Check if file exists
      const exists = await this.fileExists(filename);
      
      if (!exists) {
        return {
          success: false,
          statusCode: 404,
          error: 'File Not Found',
          message: `File '${filename}' does not exist`
        };
      }

      // Retrieve file from storage
      const retrievalResult = await this.retrieveFile(filename);
      
      if (!retrievalResult.success || !retrievalResult.stream) {
        return {
          success: false,
          statusCode: 500,
          error: 'File Retrieval Error',
          message: retrievalResult.error || 'Failed to retrieve file for download'
        };
      }

      // Get file details for metadata
      const fileInfo = await this.getFileDetails(filename);

      return {
        success: true,
        statusCode: 200,
        stream: retrievalResult.stream,
        filename: fileInfo?.originalName || filename,
        contentType: retrievalResult.contentType || fileInfo?.mimeType || 'application/octet-stream',
        contentLength: String(retrievalResult.contentLength || fileInfo?.size || 0)
      };

    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred during file download',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete a file from storage
   * Business logic method for file deletion
   */
  async deleteFileByName(filename: string): Promise<DeleteFileResult> {
    try {
      if (!filename || filename.trim() === '') {
        return {
          success: false,
          statusCode: 400,
          error: 'Bad Request',
          message: 'Filename is required'
        };
      }

      // Check if file exists
      const exists = await this.fileExists(filename);
      
      if (!exists) {
        return {
          success: false,
          statusCode: 404,
          error: 'File Not Found',
          message: `File '${filename}' does not exist`
        };
      }

             // Delete the file
       const deleteResult = await this.deleteFileFromStorage(filename);
      
      if (!deleteResult.success) {
        return {
          success: false,
          statusCode: 500,
          error: 'File Deletion Error',
          message: deleteResult.error || 'Failed to delete file'
        };
      }

      return {
        success: true,
        statusCode: 200,
        message: `File '${filename}' deleted successfully`
      };

    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred during file deletion',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get upload configuration for client
   * Business logic method for configuration retrieval
   */
  getUploadConfiguration(): UploadConfigurationResult {
    const storageInfo = this.getStorageInfo();
    
    return {
      maxFileSize: storageInfo.maxFileSize || 10485760,
      maxFileSizeMB: (storageInfo.maxFileSize || 10485760) / (1024 * 1024),
      allowedMimeTypes: storageInfo.allowedTypes || ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
      allowedExtensions: this.getAllowedExtensions(),
      uploadDir: this.config.local?.uploadDir || 'uploads',
      storageType: this.config.type,
      supportedFeatures: {
        multipleFiles: true,
        streamDownload: true,
        urlGeneration: this.config.type === 'local' || this.config.type === 'cloudinary'
      }
    };
  }

  // ===== VALIDATION METHODS =====

  /**
   * Validate a single uploaded file
   */
  private async validateSingleFile(file: UploadedFileInfo): Promise<FileValidationResult> {
    const errors: string[] = [];

    // Check file existence
    if (!file || !file.filename) {
      errors.push('File information is missing or invalid');
      return { valid: false, errors };
    }

    // Validate file size
    const maxSize = this.getStorageInfo().maxFileSize || 10485760;
    if (file.size > maxSize) {
      errors.push(`File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum limit of ${(maxSize / (1024 * 1024)).toFixed(0)}MB`);
    }

    // Validate file type
    const allowedTypes = this.getStorageInfo().allowedTypes || [];
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimeType)) {
      errors.push(`File type '${file.mimeType}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Validate file extension
    const ext = path.extname(file.originalName).toLowerCase();
    const allowedExtensions = this.getAllowedExtensions();
    if (allowedExtensions.length > 0 && !allowedExtensions.includes(ext)) {
      errors.push(`File extension '${ext}' is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      file: {
        filename: file.filename,
        size: file.size,
        mimeType: file.mimeType
      }
    };
  }

  /**
   * Validate multiple uploaded files
   */
  private async validateMultipleFiles(files: UploadedFileInfo[]): Promise<MultipleFileValidationResult> {
    const validFiles: UploadedFileInfo[] = [];
    const invalidFiles: Array<{ file: UploadedFileInfo; errors: string[] }> = [];
    const allErrors: string[] = [];
    let totalSize = 0;

    for (const file of files) {
      const validation = await this.validateSingleFile(file);
      
      if (validation.valid) {
        validFiles.push(file);
        totalSize += file.size;
      } else {
        invalidFiles.push({ file, errors: validation.errors });
        allErrors.push(...validation.errors);
      }
    }

    // Check total size limit (if applicable)
    const maxTotalSize = this.getStorageInfo().maxFileSize * 5; // Allow 5x single file limit for multiple
    if (totalSize > maxTotalSize) {
      allErrors.push(`Total size of all files (${(totalSize / (1024 * 1024)).toFixed(2)}MB) exceeds limit`);
    }

    return {
      valid: invalidFiles.length === 0 && allErrors.length === 0,
      errors: allErrors,
      validFiles,
      invalidFiles,
      totalFiles: files.length,
      totalSize
    };
  }

  /**
   * Get file details for a given filename
   */
  private async getFileDetails(filename: string): Promise<FileStorageMetadata | null> {
    try {
      switch (this.config.type) {
        case 'local':
          return await this.getLocalFileDetails(filename);
        case 'cloudinary':
          return await this.getCloudinaryFileDetails(filename);
        case 's3':
          return await this.getS3FileDetails(filename);
        default:
          return null;
      }
    } catch (error) {
      console.error('Error getting file details:', error);
      return null;
    }
  }

  /**
   * Get local file details
   */
  private async getLocalFileDetails(filename: string): Promise<FileStorageMetadata | null> {
    if (!this.config.local) return null;

    try {
      const filePath = path.join(process.cwd(), this.config.local.uploadDir, 'documents', filename);
      const stats = await fs.stat(filePath);
      
      return {
        filename,
        originalName: filename, // We don't store original names separately in local storage
        size: stats.size,
        mimeType: this.guessMimeType(filename),
        path: filename,
        url: this.getLocalFileUrl(filename),
        storageProvider: 'local',
        uploadDate: stats.birthtime || stats.ctime
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get Cloudinary file details (placeholder)
   */
  private async getCloudinaryFileDetails(filename: string): Promise<FileStorageMetadata | null> {
    // TODO: Implement when Cloudinary is set up
    return null;
  }

  /**
   * Get S3 file details (placeholder)
   */
  private async getS3FileDetails(filename: string): Promise<FileStorageMetadata | null> {
    // TODO: Implement when S3 is set up
    return null;
  }

  /**
   * Wrapper method for deleteFile for clarity
   */
  private async deleteFileFromStorage(filename: string): Promise<{ success: boolean; error?: string }> {
    // Call the existing storage abstraction method
    try {
      switch (this.config.type) {
        case 'local':
          return await this.deleteFileLocally(filename);
        case 'cloudinary':
          return await this.deleteFileCloudinary(filename);
        case 's3':
          return await this.deleteFileS3(filename);
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
   * Get allowed file extensions based on configuration
   */
  private getAllowedExtensions(): string[] {
    // Map common MIME types to extensions
    const mimeToExt: Record<string, string> = {
      'application/pdf': '.pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/msword': '.doc',
      'text/plain': '.txt',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif'
    };

    const allowedTypes = this.getStorageInfo().allowedTypes;
    return allowedTypes.map(type => mimeToExt[type]).filter(Boolean);
  }

  /**
   * Guess MIME type from file extension
   */
  private guessMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const extToMime: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif'
    };

    return extToMime[ext] || 'application/octet-stream';
  }

  // ===== EXISTING METHODS (STORAGE ABSTRACTION) =====

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
      allowedTypes: this.config.local?.allowedTypes || [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'text/plain'
      ]
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