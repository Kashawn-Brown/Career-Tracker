import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import {
  getDirectoryStructure,
  generateUniqueFilename,
  generateFilePath,
  getAbsoluteFilePath,
  getFileUrl,
  ensureDirectoryExists,
  ensureUploadDirectoriesExist,
  isValidFileType,
  getMaxFileSize,
  isValidFileSize,
  sanitizeFilename,
  extractFileMetadata,
  type FilePathOptions
} from '../../utils/fileUtils'

// Mock environment variables
const mockEnv = {
  UPLOAD_DIR: 'test-uploads',
  FILE_SERVE_BASE_URL: 'http://localhost:3002',
  MAX_FILE_SIZE: '5242880', // 5MB for testing
  ALLOWED_FILE_TYPES: 'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'
}

describe('fileUtils', () => {
  beforeEach(() => {
    // Mock environment variables
    Object.entries(mockEnv).forEach(([key, value]) => {
      vi.stubEnv(key, value)
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('getDirectoryStructure', () => {
    it('should return correct directory structure with custom upload dir', () => {
      const result = getDirectoryStructure()
      
      expect(result.uploadsDir).toBe(path.resolve('test-uploads'))
      expect(result.documentsDir).toBe(path.resolve('test-uploads', 'documents'))
      expect(result.tempDir).toBe(path.resolve('test-uploads', 'temp'))
    })

    it('should use default upload dir when env var not set', () => {
      vi.unstubAllEnvs()
      
      const result = getDirectoryStructure()
      
      expect(result.uploadsDir).toBe(path.resolve('uploads'))
      expect(result.documentsDir).toBe(path.resolve('uploads', 'documents'))
      expect(result.tempDir).toBe(path.resolve('uploads', 'temp'))
    })
  })

  describe('generateUniqueFilename', () => {
    it('should generate unique filename with original extension', () => {
      const filename1 = generateUniqueFilename('resume.pdf')
      const filename2 = generateUniqueFilename('resume.pdf')
      
      expect(filename1).toMatch(/^[0-9a-f-]+\.pdf$/)
      expect(filename2).toMatch(/^[0-9a-f-]+\.pdf$/)
      expect(filename1).not.toBe(filename2)
    })

    it('should handle files without extension', () => {
      const filename = generateUniqueFilename('resume')
      
      expect(filename).toMatch(/^[0-9a-f-]+$/)
    })

    it('should preserve complex extensions', () => {
      const filename = generateUniqueFilename('document.tar.gz')
      
      expect(filename).toMatch(/^[0-9a-f-]+\.gz$/)
    })
  })

  describe('generateFilePath', () => {
    it('should generate correct path for resume', () => {
      const options: FilePathOptions = {
        type: 'resume',
        originalName: 'my-resume.pdf'
      }
      
      const result = generateFilePath(options)
      
      expect(result).toMatch(/^documents[/\\]resume[/\\][0-9a-f-]+\.pdf$/)
    })

    it('should generate correct path for cover letter', () => {
      const options: FilePathOptions = {
        type: 'cover_letter',
        originalName: 'cover-letter.docx'
      }
      
      const result = generateFilePath(options)
      
      expect(result).toMatch(/^documents[/\\]cover_letter[/\\][0-9a-f-]+\.docx$/)
    })

    it('should handle other file types', () => {
      const options: FilePathOptions = {
        type: 'other',
        originalName: 'portfolio.pdf'
      }
      
      const result = generateFilePath(options)
      
      expect(result).toMatch(/^documents[/\\]misc[/\\][0-9a-f-]+\.pdf$/)
    })
  })

  describe('getAbsoluteFilePath', () => {
    it('should return absolute path for relative path', () => {
      const relativePath = 'documents/resume/test.pdf'
      const result = getAbsoluteFilePath(relativePath)
      
      expect(result).toBe(path.join(path.resolve('test-uploads'), relativePath))
    })
  })

  describe('getFileUrl', () => {
    it('should generate correct serving URL', () => {
      const relativePath = 'documents/resume/test.pdf'
      const result = getFileUrl(relativePath)
      
      expect(result).toBe('http://localhost:3002/uploads/documents/resume/test.pdf')
    })

    it('should handle paths with leading slash', () => {
      const relativePath = '/documents/resume/test.pdf'
      const result = getFileUrl(relativePath)
      
      expect(result).toBe('http://localhost:3002/uploads/documents/resume/test.pdf')
    })

    it('should use default base URL when env var not set', () => {
      vi.unstubAllEnvs()
      
      const relativePath = 'documents/resume/test.pdf'
      const result = getFileUrl(relativePath)
      
      expect(result).toBe('http://localhost:3002/uploads/documents/resume/test.pdf')
    })
  })

  describe('ensureDirectoryExists', () => {
    const testDir = path.join(process.cwd(), 'test-temp-dir')

    afterEach(async () => {
      try {
        await fs.rmdir(testDir, { recursive: true })
      } catch {
        // Directory might not exist, ignore error
      }
    })

    it('should create directory if it does not exist', async () => {
      await ensureDirectoryExists(testDir)
      
      const stats = await fs.stat(testDir)
      expect(stats.isDirectory()).toBe(true)
    })

    it('should not fail if directory already exists', async () => {
      await fs.mkdir(testDir, { recursive: true })
      
      await expect(ensureDirectoryExists(testDir)).resolves.not.toThrow()
    })
  })

  describe('isValidFileType', () => {
    it('should validate PDF files', () => {
      expect(isValidFileType('resume.pdf', 'application/pdf')).toBe(true)
    })

    it('should validate DOCX files', () => {
      expect(isValidFileType('resume.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true)
    })

    it('should validate text files', () => {
      expect(isValidFileType('readme.txt', 'text/plain')).toBe(true)
    })

    it('should reject invalid file types', () => {
      expect(isValidFileType('image.jpg', 'image/jpeg')).toBe(false)
      expect(isValidFileType('script.exe', 'application/octet-stream')).toBe(false)
    })

    it('should fallback to extension checking when mime type fails', () => {
      expect(isValidFileType('resume.pdf', 'application/octet-stream')).toBe(true)
    })
  })

  describe('getMaxFileSize', () => {
    it('should return configured max file size', () => {
      expect(getMaxFileSize()).toBe(5242880) // 5MB from mock env
    })

    it('should return default when env var not set', () => {
      vi.unstubAllEnvs()
      expect(getMaxFileSize()).toBe(10485760) // 10MB default
    })
  })

  describe('isValidFileSize', () => {
    it('should accept files within size limit', () => {
      expect(isValidFileSize(1000000)).toBe(true) // 1MB
      expect(isValidFileSize(5242880)).toBe(true) // Exactly 5MB
    })

    it('should reject files over size limit', () => {
      expect(isValidFileSize(6000000)).toBe(false) // 6MB > 5MB limit
    })
  })

  describe('sanitizeFilename', () => {
    it('should remove dangerous characters', () => {
      const dangerous = 'file/with\\bad?chars*name|"<>.txt'
      const result = sanitizeFilename(dangerous)
      
      expect(result).toBe('filewithbadcharsname.txt')
    })

    it('should remove directory traversal attempts', () => {
      const malicious = '../../../etc/passwd'
      const result = sanitizeFilename(malicious)
      
      expect(result).toBe('etcpasswd') // Slashes are removed for security
    })

    it('should trim whitespace', () => {
      const withWhitespace = '  filename.txt  '
      const result = sanitizeFilename(withWhitespace)
      
      expect(result).toBe('filename.txt')
    })
  })

  describe('extractFileMetadata', () => {
    it('should extract correct metadata', () => {
      const originalName = 'My Resume (2024).pdf'
      const fileBuffer = Buffer.from('fake pdf content')
      
      const result = extractFileMetadata(originalName, fileBuffer)
      
      expect(result.originalName).toBe('My Resume (2024).pdf')
      expect(result.sanitizedName).toBe('My Resume (2024).pdf')
      expect(result.size).toBe(fileBuffer.length)
      expect(result.extension).toBe('.pdf')
    })

    it('should sanitize filename in metadata', () => {
      const originalName = 'file/with\\bad?chars.txt'
      const fileBuffer = Buffer.from('content')
      
      const result = extractFileMetadata(originalName, fileBuffer)
      
      expect(result.originalName).toBe('file/with\\bad?chars.txt')
      expect(result.sanitizedName).toBe('filewithbadchars.txt')
      expect(result.extension).toBe('.txt')
    })
  })
}) 