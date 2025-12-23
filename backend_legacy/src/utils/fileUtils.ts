import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

/**
 * File storage utility functions for local file system
 * Designed to be easily replaceable with cloud storage utilities
 */

export interface FilePathOptions {
  type: 'resume' | 'cover_letter' | 'other'
  originalName: string
  userId?: number
  applicationId?: number
}

export interface DirectoryStructure {
  uploadsDir: string
  documentsDir: string
  tempDir: string
}

/**
 * Get the configured upload directory paths
 */
export function getDirectoryStructure(): DirectoryStructure {
  const uploadsDir = process.env.UPLOAD_DIR || 'uploads'
  
  return {
    uploadsDir: path.resolve(uploadsDir),
    documentsDir: path.resolve(uploadsDir, 'documents'),
    tempDir: path.resolve(uploadsDir, 'temp')
  }
}

/**
 * Generate a unique filename while preserving the original extension
 */
export function generateUniqueFilename(originalName: string): string {
  const extension = path.extname(originalName)
  const uuid = randomUUID()
  return `${uuid}${extension}`
}

/**
 * Generate the storage path for a file
 */
export function generateFilePath(options: FilePathOptions): string {
  const { type, originalName } = options
  const dirs = getDirectoryStructure()
  const filename = generateUniqueFilename(originalName)
  
  // Create subdirectory based on file type
  const subdirectory = type === 'other' ? 'misc' : type
  const relativePath = path.join('documents', subdirectory, filename)
  
  return relativePath
}

/**
 * Get the absolute file path for storage
 */
export function getAbsoluteFilePath(relativePath: string): string {
  const dirs = getDirectoryStructure()
  return path.join(dirs.uploadsDir, relativePath)
}

/**
 * Get the serving URL for a file
 */
export function getFileUrl(relativePath: string): string {
  const baseUrl = process.env.FILE_SERVE_BASE_URL || 'http://localhost:3002'
  // Remove any leading slash from relativePath and ensure baseUrl doesn't end with slash
  const cleanBaseUrl = baseUrl.replace(/\/$/, '')
  const cleanPath = relativePath.replace(/^\//, '')
  return `${cleanBaseUrl}/uploads/${cleanPath}`
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath)
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.mkdir(dirPath, { recursive: true })
  }
}

/**
 * Ensure all required upload directories exist
 */
export async function ensureUploadDirectoriesExist(): Promise<void> {
  const dirs = getDirectoryStructure()
  
  // Create main directories
  await ensureDirectoryExists(dirs.uploadsDir)
  await ensureDirectoryExists(dirs.documentsDir)
  await ensureDirectoryExists(dirs.tempDir)
  
  // Create document type subdirectories
  await ensureDirectoryExists(path.join(dirs.documentsDir, 'resume'))
  await ensureDirectoryExists(path.join(dirs.documentsDir, 'cover_letter'))
  await ensureDirectoryExists(path.join(dirs.documentsDir, 'misc'))
}

/**
 * Validate file extension against allowed types
 */
export function isValidFileType(filename: string, mimeType: string): boolean {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || '').split(',').map(type => type.trim())
  
  // Check MIME type
  if (allowedTypes.includes(mimeType)) {
    return true
  }
  
  // Fallback: check file extension
  const extension = path.extname(filename).toLowerCase()
  const extensionMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.txt': 'text/plain'
  }
  
  return allowedTypes.includes(extensionMap[extension])
}

/**
 * Get maximum allowed file size in bytes
 */
export function getMaxFileSize(): number {
  return parseInt(process.env.MAX_FILE_SIZE || '10485760', 10) // Default 10MB
}

/**
 * Validate file size
 */
export function isValidFileSize(fileSize: number): boolean {
  return fileSize <= getMaxFileSize()
}

/**
 * Sanitize filename to prevent directory traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove any path separators and dangerous characters
  return filename
    .replace(/[/\\?%*:|"<>]/g, '')
    .replace(/\.\./g, '')
    .trim()
}

/**
 * Extract file metadata from file buffer and original name
 */
export interface FileMetadata {
  originalName: string
  sanitizedName: string
  size: number
  extension: string
}

export function extractFileMetadata(originalName: string, fileBuffer: Buffer): FileMetadata {
  const sanitizedName = sanitizeFilename(originalName)
  const extension = path.extname(sanitizedName).toLowerCase()
  
  return {
    originalName,
    sanitizedName,
    size: fileBuffer.length,
    extension
  }
} 