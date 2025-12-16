/**
 * File Upload Models
 * 
 * Type definitions for file upload operations following the established auth pattern.
 * Defines standardized result types for consistent API responses and error handling.
 */

import { UploadedFileInfo } from './document.models.js';

// ===== BASE RESULT INTERFACES =====

export interface BaseFileUploadResult {
  success: boolean;
  statusCode: number;
  error?: string;
  message?: string;
  details?: any;
}

// ===== FILE UPLOAD RESULT TYPES =====

export interface ProcessSingleFileUploadResult extends BaseFileUploadResult {
  file?: {
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    url?: string;
    path: string;
    uploadDate: Date;
  };
}

export interface ProcessMultipleFileUploadResult extends BaseFileUploadResult {
  files?: Array<{
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    url?: string;
    path: string;
    uploadDate: Date;
  }>;
  totalFiles?: number;
  totalSize?: number;
}

export interface GetFileInfoResult extends BaseFileUploadResult {
  file?: {
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    url?: string;
    exists: boolean;
    uploadDate?: Date;
  };
}

export interface DownloadFileResult extends BaseFileUploadResult {
  stream?: NodeJS.ReadableStream;
  filename?: string;
  contentType?: string;
  contentLength?: string;
}

export interface DeleteFileResult extends BaseFileUploadResult {
  // No additional properties needed - success/error message is sufficient
}

export interface UploadConfigurationResult {
  maxFileSize: number;
  maxFileSizeMB: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  uploadDir: string;
  storageType: 'local' | 'cloudinary' | 's3';
  supportedFeatures: {
    multipleFiles: boolean;
    streamDownload: boolean;
    urlGeneration: boolean;
  };
}

// ===== VALIDATION RESULT TYPES =====

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  file?: {
    filename: string;
    size: number;
    mimeType: string;
  };
}

export interface MultipleFileValidationResult {
  valid: boolean;
  errors: string[];
  validFiles: UploadedFileInfo[];
  invalidFiles: Array<{
    file: UploadedFileInfo;
    errors: string[];
  }>;
  totalFiles: number;
  totalSize: number;
}

// ===== FILE PROCESSING TYPES =====

export interface FileProcessingOptions {
  generateUrl?: boolean;
  validateIntegrity?: boolean;
  preserveOriginalName?: boolean;
  allowOverwrite?: boolean;
}

export interface FileStorageMetadata {
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  path: string;
  url?: string;
  storageProvider: 'local' | 'cloudinary' | 's3';
  uploadDate: Date;
  integrity?: {
    checksum: string;
    algorithm: string;
  };
}

// ===== ERROR TYPES =====

export interface FileUploadError {
  code: string;
  message: string;
  details?: any;
  file?: {
    filename: string;
    size?: number;
    mimeType?: string;
  };
}

export interface FileUploadValidationError extends FileUploadError {
  validationRules: {
    rule: string;
    expected: any;
    actual: any;
  }[];
}

// ===== STORAGE ABSTRACTION TYPES =====

export interface StorageProviderResult {
  success: boolean;
  filePath?: string;
  url?: string;
  error?: string;
  metadata?: FileStorageMetadata;
}

export interface StorageProviderConfig {
  type: 'local' | 'cloudinary' | 's3';
  local?: {
    uploadDir: string;
    baseUrl: string;
    maxFileSize?: number;
    allowedTypes?: string[];
  };
  cloudinary?: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    folder?: string;
  };
  s3?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
  };
}

// ===== REQUEST/RESPONSE TYPES =====

export interface FileUploadRequest {
  files: UploadedFileInfo[];
  options?: FileProcessingOptions;
  metadata?: Record<string, any>;
}

export interface FileUploadResponse {
  success: boolean;
  message: string;
  files: FileStorageMetadata[];
  errors?: FileUploadError[];
}

// ===== UTILITY TYPES =====

export type FileOperation = 'upload' | 'download' | 'delete' | 'info' | 'validate';

export interface FileOperationContext {
  operation: FileOperation;
  timestamp: Date;
  requestId?: string;
  userId?: number;
  metadata?: Record<string, any>;
} 