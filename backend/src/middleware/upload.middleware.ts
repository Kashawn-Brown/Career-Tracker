/**
 * File Upload Middleware
 * 
 * Middleware functions for handling file uploads using @fastify/multipart with proper validation and error handling.
 * Enhanced with comprehensive logging, automatic cleanup for failed uploads, and consistent error responses.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

// Extend FastifyRequest to include uploaded file information
declare module 'fastify' {
  interface FastifyRequest {
    uploadedFile?: UploadedFileInfo;
    uploadedFiles?: UploadedFileInfo[];
  }
}

// Configuration constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'documents');
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'text/plain' // .txt
];

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt'];

// Interface for uploaded file information
export interface UploadedFileInfo {
  originalName: string;
  filename: string;
  path: string;
  size: number;
  mimeType: string;
  uploadDate: Date;
}

/**
 * Standard error response format matching global error handler
 */
interface UploadErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  details?: any;
}

/**
 * Create standardized error response
 */
function createErrorResponse(
  error: string,
  message: string,
  statusCode: number,
  path: string,
  details?: any
): UploadErrorResponse {
  return {
    error,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    path,
    ...(details && { details })
  };
}

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir(): Promise<void> {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Generate unique filename with timestamp and random suffix
 */
function generateFileName(originalName: string): string {
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${name}-${timestamp}-${randomSuffix}${ext}`;
}

/**
 * Validate file type based on mimetype and extension
 */
function validateFileType(file: MultipartFile): { valid: boolean; error?: string } {
  const ext = path.extname(file.filename).toLowerCase();
  
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Invalid file extension '${ext}'. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`
    };
  }
  
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type '${file.mimetype}'. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
    };
  }
  
  return { valid: true };
}

/**
 * Validate file size
 */
function validateFileSize(file: MultipartFile): { valid: boolean; error?: string } {
  if (file.file.readableLength && file.file.readableLength > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${(file.file.readableLength / (1024 * 1024)).toFixed(2)}MB) exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    };
  }
  
  return { valid: true };
}

/**
 * Save uploaded file to disk with enhanced error handling
 */
async function saveFile(file: MultipartFile, request: FastifyRequest): Promise<UploadedFileInfo> {
  await ensureUploadDir();
  
  const filename = generateFileName(file.filename);
  const filePath = path.join(UPLOAD_DIR, filename);
  
  request.log.info({
    originalName: file.filename,
    filename,
    mimeType: file.mimetype,
    filePath,
    uploadDir: UPLOAD_DIR
  }, 'Starting file upload operation');
  
  try {
    // Write file to disk
    await pipeline(file.file, createWriteStream(filePath));
    
    // Get file stats for size information
    const stats = await fs.stat(filePath);
    
    const fileInfo: UploadedFileInfo = {
      originalName: file.filename,
      filename,
      path: filePath,
      size: stats.size,
      mimeType: file.mimetype,
      uploadDate: new Date()
    };
    
    request.log.info({
      ...fileInfo,
      sizeKB: (stats.size / 1024).toFixed(2)
    }, 'File upload completed successfully');
    
    return fileInfo;
    
  } catch (error) {
    // Cleanup failed upload
    await cleanupFile(filePath);
    
    request.log.error({
      originalName: file.filename,
      filename,
      filePath,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 'File upload failed - file cleaned up');
    
    throw new Error(`Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Middleware: Handle single file upload
 * 
 * Processes a single file upload with validation and error handling.
 * The uploaded file info will be available in request.uploadedFile
 * Enhanced with comprehensive logging and automatic cleanup for failed uploads.
 */
export function uploadSingle(fieldName: string = 'document') {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const operationId = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    request.log.info({
      operationId,
      fieldName,
      url: request.url,
      method: request.method
    }, 'Starting single file upload operation');
    
    try {
      // Check if request has multipart data
      if (!request.isMultipart()) {
        const errorResponse = createErrorResponse(
          'Invalid Content Type',
          'Request must be multipart/form-data for file uploads',
          400,
          request.url
        );
        
        request.log.warn({
          operationId,
          contentType: request.headers['content-type']
        }, 'File upload rejected - invalid content type');
        
        return reply.status(400).send(errorResponse);
      }
      
      // Get the file from multipart data
      const data = await request.file({ limits: { fileSize: MAX_FILE_SIZE } });
      
      if (!data) {
        const errorResponse = createErrorResponse(
          'No File Provided',
          `Please provide a file in the '${fieldName}' field`,
          400,
          request.url
        );
        
        request.log.warn({
          operationId,
          fieldName
        }, 'File upload rejected - no file provided');
        
        return reply.status(400).send(errorResponse);
      }
      
      request.log.info({
        operationId,
        originalName: data.filename,
        mimeType: data.mimetype,
        estimatedSize: data.file.readableLength || 'unknown'
      }, 'File received, starting validation');
      
      // Validate file type
      const typeValidation = validateFileType(data);
      if (!typeValidation.valid) {
        const errorResponse = createErrorResponse(
          'Invalid File Type',
          typeValidation.error!,
          400,
          request.url,
          {
            filename: data.filename,
            mimeType: data.mimetype,
            allowedTypes: ALLOWED_MIME_TYPES,
            allowedExtensions: ALLOWED_EXTENSIONS
          }
        );
        
        request.log.warn({
          operationId,
          filename: data.filename,
          mimeType: data.mimetype,
          error: typeValidation.error
        }, 'File upload rejected - invalid file type');
        
        return reply.status(400).send(errorResponse);
      }
      
      // Validate file size (additional check beyond limits)
      const sizeValidation = validateFileSize(data);
      if (!sizeValidation.valid) {
        const errorResponse = createErrorResponse(
          'File Too Large',
          sizeValidation.error!,
          400,
          request.url,
          {
            filename: data.filename,
            size: data.file.readableLength,
            maxSize: MAX_FILE_SIZE
          }
        );
        
        request.log.warn({
          operationId,
          filename: data.filename,
          size: data.file.readableLength,
          maxSize: MAX_FILE_SIZE,
          error: sizeValidation.error
        }, 'File upload rejected - file too large');
        
        return reply.status(400).send(errorResponse);
      }
      
      // Save the file
      const fileInfo = await saveFile(data, request);
      
      // Add file info to request for access in route handlers
      request.uploadedFile = fileInfo;
      
      request.log.info({
        operationId,
        uploadedFile: {
          originalName: fileInfo.originalName,
          filename: fileInfo.filename,
          size: fileInfo.size,
          mimeType: fileInfo.mimeType
        }
      }, 'Single file upload operation completed successfully');
      
    } catch (error: any) {
      request.log.error({
        operationId,
        error: error.message,
        stack: error.stack,
        errorCode: error.code
      }, 'Single file upload operation failed');
      
      // Handle specific multipart errors
      if (error.code === 'FST_FILES_LIMIT') {
        const errorResponse = createErrorResponse(
          'File Too Large',
          `File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          413,
          request.url,
          { maxSize: MAX_FILE_SIZE }
        );
        return reply.status(413).send(errorResponse);
      }
      
      if (error.code === 'FST_PARTS_LIMIT') {
        const errorResponse = createErrorResponse(
          'Too Many Parts',
          'Request contains too many multipart parts',
          400,
          request.url
        );
        return reply.status(400).send(errorResponse);
      }
      
      if (error.code === 'FST_FIELD_SIZE_LIMIT') {
        const errorResponse = createErrorResponse(
          'Field Too Large',
          'One or more form fields exceed the size limit',
          400,
          request.url
        );
        return reply.status(400).send(errorResponse);
      }
      
      // Handle file system errors
      if (error.code === 'ENOSPC') {
        const errorResponse = createErrorResponse(
          'Storage Full',
          'Not enough storage space available for file upload',
          507,
          request.url
        );
        return reply.status(507).send(errorResponse);
      }
      
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        const errorResponse = createErrorResponse(
          'Storage Permission Error',
          'Permission denied while saving file',
          500,
          request.url
        );
        return reply.status(500).send(errorResponse);
      }
      
      // Generic upload error
      const errorResponse = createErrorResponse(
        'Upload Failed',
        error.message || 'An unexpected error occurred during file upload',
        500,
        request.url,
        process.env.NODE_ENV !== 'production' ? { errorCode: error.code } : undefined
      );
      return reply.status(500).send(errorResponse);
    }
  };
}

/**
 * Middleware: Handle multiple file uploads
 * 
 * Processes multiple file uploads with validation and error handling.
 * The uploaded files info will be available in request.uploadedFiles
 * Enhanced with comprehensive logging and automatic cleanup for failed uploads.
 */
export function uploadMultiple(fieldName: string = 'documents', maxCount: number = 5) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const operationId = `upload-multi-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    request.log.info({
      operationId,
      fieldName,
      maxCount,
      url: request.url,
      method: request.method
    }, 'Starting multiple file upload operation');
    
    try {
      // Check if request has multipart data
      if (!request.isMultipart()) {
        const errorResponse = createErrorResponse(
          'Invalid Content Type',
          'Request must be multipart/form-data for file uploads',
          400,
          request.url
        );
        
        request.log.warn({
          operationId,
          contentType: request.headers['content-type']
        }, 'Multiple file upload rejected - invalid content type');
        
        return reply.status(400).send(errorResponse);
      }
      
      const uploadedFiles: UploadedFileInfo[] = [];
      let fileCount = 0;
      
      // Process all files in the multipart request
      const parts = request.files({ limits: { fileSize: MAX_FILE_SIZE } });
      
      for await (const part of parts) {
        fileCount++;
        
        request.log.info({
          operationId,
          fileNumber: fileCount,
          originalName: part.filename,
          mimeType: part.mimetype,
          estimatedSize: part.file.readableLength || 'unknown'
        }, `Processing file ${fileCount} of multiple upload`);
        
        // Check file count limit
        if (fileCount > maxCount) {
          // Clean up already uploaded files
          await cleanupFiles(uploadedFiles.map(file => file.path));
          
          const errorResponse = createErrorResponse(
            'Too Many Files',
            `Maximum ${maxCount} files can be uploaded at once`,
            400,
            request.url,
            {
              fileCount,
              maxCount,
              uploadedFiles: uploadedFiles.length
            }
          );
          
          request.log.warn({
            operationId,
            fileCount,
            maxCount,
            cleanedUpFiles: uploadedFiles.length
          }, 'Multiple file upload rejected - too many files, cleaned up uploaded files');
          
          return reply.status(400).send(errorResponse);
        }
        
        // Validate file type
        const typeValidation = validateFileType(part);
        if (!typeValidation.valid) {
          // Clean up already uploaded files
          await cleanupFiles(uploadedFiles.map(file => file.path));
          
          const errorResponse = createErrorResponse(
            'Invalid File Type',
            typeValidation.error!,
            400,
            request.url,
            {
              rejectedFile: {
                filename: part.filename,
                mimeType: part.mimetype
              },
              allowedTypes: ALLOWED_MIME_TYPES,
              allowedExtensions: ALLOWED_EXTENSIONS,
              uploadedFiles: uploadedFiles.length
            }
          );
          
          request.log.warn({
            operationId,
            rejectedFile: part.filename,
            mimeType: part.mimetype,
            error: typeValidation.error,
            cleanedUpFiles: uploadedFiles.length
          }, 'Multiple file upload rejected - invalid file type, cleaned up uploaded files');
          
          return reply.status(400).send(errorResponse);
        }
        
        // Validate file size
        const sizeValidation = validateFileSize(part);
        if (!sizeValidation.valid) {
          // Clean up already uploaded files
          await cleanupFiles(uploadedFiles.map(file => file.path));
          
          const errorResponse = createErrorResponse(
            'File Too Large',
            sizeValidation.error!,
            400,
            request.url,
            {
              rejectedFile: {
                filename: part.filename,
                size: part.file.readableLength
              },
              maxSize: MAX_FILE_SIZE,
              uploadedFiles: uploadedFiles.length
            }
          );
          
          request.log.warn({
            operationId,
            rejectedFile: part.filename,
            size: part.file.readableLength,
            maxSize: MAX_FILE_SIZE,
            error: sizeValidation.error,
            cleanedUpFiles: uploadedFiles.length
          }, 'Multiple file upload rejected - file too large, cleaned up uploaded files');
          
          return reply.status(400).send(errorResponse);
        }
        
        try {
          // Save the file
          const fileInfo = await saveFile(part, request);
          uploadedFiles.push(fileInfo);
          
          request.log.info({
            operationId,
            fileNumber: fileCount,
            uploadedFile: {
              originalName: fileInfo.originalName,
              filename: fileInfo.filename,
              size: fileInfo.size
            },
            totalUploaded: uploadedFiles.length
          }, `File ${fileCount} uploaded successfully`);
          
        } catch (saveError) {
          // Clean up already uploaded files
          await cleanupFiles(uploadedFiles.map(file => file.path));
          
          request.log.error({
            operationId,
            fileNumber: fileCount,
            filename: part.filename,
            error: saveError instanceof Error ? saveError.message : 'Unknown error',
            cleanedUpFiles: uploadedFiles.length
          }, 'File save failed during multiple upload - cleaned up uploaded files');
          
          throw saveError;
        }
      }
      
      if (uploadedFiles.length === 0) {
        const errorResponse = createErrorResponse(
          'No Files Provided',
          `Please provide files in the '${fieldName}' field`,
          400,
          request.url
        );
        
        request.log.warn({
          operationId,
          fieldName
        }, 'Multiple file upload rejected - no files provided');
        
        return reply.status(400).send(errorResponse);
      }
      
      // Add files info to request for access in route handlers
      request.uploadedFiles = uploadedFiles;
      
      request.log.info({
        operationId,
        totalFiles: uploadedFiles.length,
        totalSize: uploadedFiles.reduce((sum, file) => sum + file.size, 0),
        files: uploadedFiles.map(file => ({
          originalName: file.originalName,
          filename: file.filename,
          size: file.size
        }))
      }, 'Multiple file upload operation completed successfully');
      
    } catch (error: any) {
      request.log.error({
        operationId,
        error: error.message,
        stack: error.stack,
        errorCode: error.code
      }, 'Multiple file upload operation failed');
      
      // Handle specific multipart errors
      if (error.code === 'FST_FILES_LIMIT') {
        const errorResponse = createErrorResponse(
          'File Too Large',
          `One or more files exceed the maximum size limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          413,
          request.url,
          { maxSize: MAX_FILE_SIZE }
        );
        return reply.status(413).send(errorResponse);
      }
      
      if (error.code === 'FST_PARTS_LIMIT') {
        const errorResponse = createErrorResponse(
          'Too Many Parts',
          'Request contains too many multipart parts',
          400,
          request.url
        );
        return reply.status(400).send(errorResponse);
      }
      
      if (error.code === 'FST_FIELD_SIZE_LIMIT') {
        const errorResponse = createErrorResponse(
          'Field Too Large',
          'One or more form fields exceed the size limit',
          400,
          request.url
        );
        return reply.status(400).send(errorResponse);
      }
      
      // Handle file system errors
      if (error.code === 'ENOSPC') {
        const errorResponse = createErrorResponse(
          'Storage Full',
          'Not enough storage space available for file upload',
          507,
          request.url
        );
        return reply.status(507).send(errorResponse);
      }
      
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        const errorResponse = createErrorResponse(
          'Storage Permission Error',
          'Permission denied while saving file',
          500,
          request.url
        );
        return reply.status(500).send(errorResponse);
      }
      
      // Generic upload error
      const errorResponse = createErrorResponse(
        'Upload Failed',
        error.message || 'An unexpected error occurred during file upload',
        500,
        request.url,
        process.env.NODE_ENV !== 'production' ? { errorCode: error.code } : undefined
      );
      return reply.status(500).send(errorResponse);
    }
  };
}

/**
 * Utility function: Clean up uploaded file
 * 
 * Removes a file from the uploads directory.
 * Useful for cleaning up after failed operations.
 * Enhanced with better logging and error handling.
 */
export async function cleanupFile(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    await fs.unlink(filePath);
    return { success: true };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Don't log ENOENT errors (file already deleted) as warnings
    if (error.code === 'ENOENT') {
      return { success: true }; // File already deleted, consider it successful
    }
    
    // Log other errors but don't throw - cleanup should be non-blocking
    console.warn(`Failed to cleanup file ${filePath}: ${errorMessage}`, {
      filePath,
      errorCode: error.code,
      error: errorMessage
    });
    
    return { 
      success: false, 
      error: errorMessage 
    };
  }
}

/**
 * Utility function: Safely clean up multiple files
 * 
 * Cleans up multiple files and returns results for each
 */
export async function cleanupFiles(filePaths: string[]): Promise<Array<{ filePath: string; success: boolean; error?: string }>> {
  const results = await Promise.allSettled(
    filePaths.map(async (filePath) => {
      const result = await cleanupFile(filePath);
      return { filePath, ...result };
    })
  );
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        filePath: filePaths[index],
        success: false,
        error: result.reason instanceof Error ? result.reason.message : 'Cleanup failed'
      };
    }
  });
}

/**
 * Utility function: Get file info from MultipartFile
 * 
 * Converts MultipartFile to UploadedFileInfo format.
 * Enhanced with validation and error handling.
 */
export function getFileInfo(file: MultipartFile, savedPath: string): UploadedFileInfo {
  if (!file || !file.filename) {
    throw new Error('Invalid file object provided');
  }
  
  if (!savedPath) {
    throw new Error('Saved path is required');
  }
  
  return {
    originalName: file.filename,
    filename: path.basename(savedPath),
    path: savedPath,
    size: 0, // Will be updated after saving
    mimeType: file.mimetype || 'application/octet-stream',
    uploadDate: new Date()
  };
}

/**
 * Utility function: Get upload configuration info
 * 
 * Returns current upload configuration for debugging and monitoring
 */
export function getUploadConfig() {
  return {
    maxFileSize: MAX_FILE_SIZE,
    maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024),
    uploadDir: UPLOAD_DIR,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
    allowedExtensions: ALLOWED_EXTENSIONS
  };
} 