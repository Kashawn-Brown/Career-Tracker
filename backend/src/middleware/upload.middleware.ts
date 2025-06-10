/**
 * File Upload Middleware
 * 
 * Middleware functions for handling file uploads using @fastify/multipart with proper validation and error handling.
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
      error: `Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`
    };
  }
  
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
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
      error: `File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    };
  }
  
  return { valid: true };
}

/**
 * Save uploaded file to disk
 */
async function saveFile(file: MultipartFile): Promise<UploadedFileInfo> {
  await ensureUploadDir();
  
  const filename = generateFileName(file.filename);
  const filePath = path.join(UPLOAD_DIR, filename);
  
  // Write file to disk
  await pipeline(file.file, createWriteStream(filePath));
  
  // Get file stats for size information
  const stats = await fs.stat(filePath);
  
  return {
    originalName: file.filename,
    filename,
    path: filePath,
    size: stats.size,
    mimeType: file.mimetype,
    uploadDate: new Date()
  };
}

/**
 * Middleware: Handle single file upload
 * 
 * Processes a single file upload with validation and error handling.
 * The uploaded file info will be available in request.uploadedFile
 */
export function uploadSingle(fieldName: string = 'document') {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      // Check if request has multipart data
      if (!request.isMultipart()) {
        return reply.status(400).send({
          error: 'Invalid content type',
          message: 'Request must be multipart/form-data',
          statusCode: 400,
          timestamp: new Date().toISOString(),
          path: request.url
        });
      }
      
      // Get the file from multipart data
      const data = await request.file({ limits: { fileSize: MAX_FILE_SIZE } });
      
      if (!data) {
        return reply.status(400).send({
          error: 'No file provided',
          message: `Please provide a file in the '${fieldName}' field`,
          statusCode: 400,
          timestamp: new Date().toISOString(),
          path: request.url
        });
      }
      
      // Validate file type
      const typeValidation = validateFileType(data);
      if (!typeValidation.valid) {
        return reply.status(400).send({
          error: 'Invalid file type',
          message: typeValidation.error,
          statusCode: 400,
          timestamp: new Date().toISOString(),
          path: request.url
        });
      }
      
      // Validate file size (additional check beyond limits)
      const sizeValidation = validateFileSize(data);
      if (!sizeValidation.valid) {
        return reply.status(400).send({
          error: 'File too large',
          message: sizeValidation.error,
          statusCode: 400,
          timestamp: new Date().toISOString(),
          path: request.url
        });
      }
      
      // Save the file
      const fileInfo = await saveFile(data);
      
      // Add file info to request for access in route handlers
      request.uploadedFile = fileInfo;
      
    } catch (error: any) {
      // Handle specific multipart errors
      if (error.code === 'FST_FILES_LIMIT') {
        return reply.status(400).send({
          error: 'File too large',
          message: `File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          statusCode: 400,
          timestamp: new Date().toISOString(),
          path: request.url
        });
      }
      
      if (error.code === 'FST_PARTS_LIMIT') {
        return reply.status(400).send({
          error: 'Too many parts',
          message: 'Request contains too many multipart parts',
          statusCode: 400,
          timestamp: new Date().toISOString(),
          path: request.url
        });
      }
      
      // Generic upload error
      return reply.status(500).send({
        error: 'Upload failed',
        message: 'An error occurred during file upload',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url
      });
    }
  };
}

/**
 * Middleware: Handle multiple file uploads
 * 
 * Processes multiple file uploads with validation and error handling.
 * The uploaded files info will be available in request.uploadedFiles
 */
export function uploadMultiple(fieldName: string = 'documents', maxCount: number = 5) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      // Check if request has multipart data
      if (!request.isMultipart()) {
        return reply.status(400).send({
          error: 'Invalid content type',
          message: 'Request must be multipart/form-data',
          statusCode: 400,
          timestamp: new Date().toISOString(),
          path: request.url
        });
      }
      
      const uploadedFiles: UploadedFileInfo[] = [];
      let fileCount = 0;
      
      // Process all files in the multipart request
      const parts = request.files({ limits: { fileSize: MAX_FILE_SIZE } });
      
      for await (const part of parts) {
        fileCount++;
        
        // Check file count limit
        if (fileCount > maxCount) {
          // Clean up already uploaded files
          await Promise.all(uploadedFiles.map(file => cleanupFile(file.path)));
          
          return reply.status(400).send({
            error: 'Too many files',
            message: `Maximum ${maxCount} files can be uploaded at once`,
            statusCode: 400,
            timestamp: new Date().toISOString(),
            path: request.url
          });
        }
        
        // Validate file type
        const typeValidation = validateFileType(part);
        if (!typeValidation.valid) {
          // Clean up already uploaded files
          await Promise.all(uploadedFiles.map(file => cleanupFile(file.path)));
          
          return reply.status(400).send({
            error: 'Invalid file type',
            message: typeValidation.error,
            statusCode: 400,
            timestamp: new Date().toISOString(),
            path: request.url
          });
        }
        
        // Validate file size
        const sizeValidation = validateFileSize(part);
        if (!sizeValidation.valid) {
          // Clean up already uploaded files
          await Promise.all(uploadedFiles.map(file => cleanupFile(file.path)));
          
          return reply.status(400).send({
            error: 'File too large',
            message: sizeValidation.error,
            statusCode: 400,
            timestamp: new Date().toISOString(),
            path: request.url
          });
        }
        
        try {
          // Save the file
          const fileInfo = await saveFile(part);
          uploadedFiles.push(fileInfo);
        } catch (saveError) {
          // Clean up already uploaded files
          await Promise.all(uploadedFiles.map(file => cleanupFile(file.path)));
          throw saveError;
        }
      }
      
      if (uploadedFiles.length === 0) {
        return reply.status(400).send({
          error: 'No files provided',
          message: `Please provide files in the '${fieldName}' field`,
          statusCode: 400,
          timestamp: new Date().toISOString(),
          path: request.url
        });
      }
      
      // Add files info to request for access in route handlers
      request.uploadedFiles = uploadedFiles;
      
    } catch (error: any) {
      // Handle specific multipart errors
      if (error.code === 'FST_FILES_LIMIT') {
        return reply.status(400).send({
          error: 'File too large',
          message: `One or more files exceed the maximum size limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          statusCode: 400,
          timestamp: new Date().toISOString(),
          path: request.url
        });
      }
      
      if (error.code === 'FST_PARTS_LIMIT') {
        return reply.status(400).send({
          error: 'Too many parts',
          message: 'Request contains too many multipart parts',
          statusCode: 400,
          timestamp: new Date().toISOString(),
          path: request.url
        });
      }
      
      // Generic upload error
      return reply.status(500).send({
        error: 'Upload failed',
        message: 'An error occurred during file upload',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url
      });
    }
  };
}

/**
 * Utility function: Clean up uploaded file
 * 
 * Removes a file from the uploads directory.
 * Useful for cleaning up after failed operations.
 */
export async function cleanupFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Log error but don't throw - file might already be deleted
    console.warn(`Failed to cleanup file ${filePath}:`, error);
  }
}

/**
 * Utility function: Get file info from MultipartFile
 * 
 * Converts MultipartFile to UploadedFileInfo format.
 */
export function getFileInfo(file: MultipartFile, savedPath: string): UploadedFileInfo {
  return {
    originalName: file.filename,
    filename: path.basename(savedPath),
    path: savedPath,
    size: 0, // Will be updated after saving
    mimeType: file.mimetype,
    uploadDate: new Date()
  };
} 