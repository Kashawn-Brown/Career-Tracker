import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getStorageConfig,
  validateStorageConfig,
  getValidatedStorageConfig,
  type StorageConfig
} from '../../config/storage'

describe('storage configuration', () => {
  beforeEach(() => {
    // Clear all environment variables before each test
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('getStorageConfig', () => {
    it('should return local storage config by default', () => {
      const config = getStorageConfig()
      
      expect(config.type).toBe('local')
      expect(config.local).toBeDefined()
      expect(config.local?.uploadDir).toBe('uploads')
      expect(config.local?.baseUrl).toBe('http://localhost:3002')
      expect(config.local?.maxFileSize).toBe(10485760)
      expect(config.local?.allowedTypes).toEqual([''])
    })

    it('should use environment variables for local storage', () => {
      vi.stubEnv('STORAGE_TYPE', 'local')
      vi.stubEnv('UPLOAD_DIR', 'custom-uploads')
      vi.stubEnv('FILE_SERVE_BASE_URL', 'https://example.com')
      vi.stubEnv('MAX_FILE_SIZE', '5242880')
      vi.stubEnv('ALLOWED_FILE_TYPES', 'application/pdf,text/plain')

      const config = getStorageConfig()
      
      expect(config.type).toBe('local')
      expect(config.local?.uploadDir).toBe('custom-uploads')
      expect(config.local?.baseUrl).toBe('https://example.com')
      expect(config.local?.maxFileSize).toBe(5242880)
      expect(config.local?.allowedTypes).toEqual(['application/pdf', 'text/plain'])
    })

    it('should return cloudinary config when specified', () => {
      vi.stubEnv('STORAGE_TYPE', 'cloudinary')
      vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'test-cloud')
      vi.stubEnv('CLOUDINARY_API_KEY', 'test-key')
      vi.stubEnv('CLOUDINARY_API_SECRET', 'test-secret')
      vi.stubEnv('CLOUDINARY_FOLDER', 'custom-folder')

      const config = getStorageConfig()
      
      expect(config.type).toBe('cloudinary')
      expect(config.cloudinary).toBeDefined()
      expect(config.cloudinary?.cloudName).toBe('test-cloud')
      expect(config.cloudinary?.apiKey).toBe('test-key')
      expect(config.cloudinary?.apiSecret).toBe('test-secret')
      expect(config.cloudinary?.folder).toBe('custom-folder')
    })

    it('should use default cloudinary folder when not specified', () => {
      vi.stubEnv('STORAGE_TYPE', 'cloudinary')
      vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'test-cloud')
      vi.stubEnv('CLOUDINARY_API_KEY', 'test-key')
      vi.stubEnv('CLOUDINARY_API_SECRET', 'test-secret')

      const config = getStorageConfig()
      
      expect(config.cloudinary?.folder).toBe('career-tracker')
    })

    it('should return s3 config when specified', () => {
      vi.stubEnv('STORAGE_TYPE', 's3')
      vi.stubEnv('AWS_ACCESS_KEY_ID', 'test-access-key')
      vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'test-secret-key')
      vi.stubEnv('AWS_S3_BUCKET', 'test-bucket')
      vi.stubEnv('AWS_S3_REGION', 'us-west-2')
      vi.stubEnv('AWS_S3_ENDPOINT', 'https://custom-endpoint.com')

      const config = getStorageConfig()
      
      expect(config.type).toBe('s3')
      expect(config.s3).toBeDefined()
      expect(config.s3?.accessKeyId).toBe('test-access-key')
      expect(config.s3?.secretAccessKey).toBe('test-secret-key')
      expect(config.s3?.bucket).toBe('test-bucket')
      expect(config.s3?.region).toBe('us-west-2')
      expect(config.s3?.endpoint).toBe('https://custom-endpoint.com')
    })

    it('should use default s3 region when not specified', () => {
      vi.stubEnv('STORAGE_TYPE', 's3')
      vi.stubEnv('AWS_ACCESS_KEY_ID', 'test-access-key')
      vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'test-secret-key')
      vi.stubEnv('AWS_S3_BUCKET', 'test-bucket')

      const config = getStorageConfig()
      
      expect(config.s3?.region).toBe('us-east-1')
    })

    it('should throw error for unsupported storage type', () => {
      vi.stubEnv('STORAGE_TYPE', 'unsupported')

      expect(() => getStorageConfig()).toThrow('Unsupported storage type: unsupported')
    })
  })

  describe('validateStorageConfig', () => {
    it('should validate local storage config successfully', () => {
      const config: StorageConfig = {
        type: 'local',
        local: {
          uploadDir: 'uploads',
          baseUrl: 'http://localhost:3002',
          maxFileSize: 10485760,
          allowedTypes: ['application/pdf']
        }
      }

      expect(() => validateStorageConfig(config)).not.toThrow()
    })

    it('should throw error for local storage without upload dir', () => {
      const config: StorageConfig = {
        type: 'local',
        local: {
          uploadDir: '',
          baseUrl: 'http://localhost:3002',
          maxFileSize: 10485760,
          allowedTypes: ['application/pdf']
        }
      }

      expect(() => validateStorageConfig(config)).toThrow('Local storage requires UPLOAD_DIR to be configured')
    })

    it('should validate cloudinary config successfully', () => {
      const config: StorageConfig = {
        type: 'cloudinary',
        cloudinary: {
          cloudName: 'test-cloud',
          apiKey: 'test-key',
          apiSecret: 'test-secret'
        }
      }

      expect(() => validateStorageConfig(config)).not.toThrow()
    })

    it('should throw error for incomplete cloudinary config', () => {
      const config: StorageConfig = {
        type: 'cloudinary',
        cloudinary: {
          cloudName: 'test-cloud',
          apiKey: '',
          apiSecret: 'test-secret'
        }
      }

      expect(() => validateStorageConfig(config)).toThrow('Cloudinary storage requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET')
    })

    it('should validate s3 config successfully', () => {
      const config: StorageConfig = {
        type: 's3',
        s3: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key',
          bucket: 'test-bucket',
          region: 'us-east-1'
        }
      }

      expect(() => validateStorageConfig(config)).not.toThrow()
    })

    it('should throw error for incomplete s3 config', () => {
      const config: StorageConfig = {
        type: 's3',
        s3: {
          accessKeyId: 'test-access-key',
          secretAccessKey: '',
          bucket: 'test-bucket',
          region: 'us-east-1'
        }
      }

      expect(() => validateStorageConfig(config)).toThrow('S3 storage requires AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET')
    })
  })

  describe('getValidatedStorageConfig', () => {
    it('should return validated local config', () => {
      vi.stubEnv('UPLOAD_DIR', 'test-uploads')

      const config = getValidatedStorageConfig()
      
      expect(config.type).toBe('local')
      expect(config.local?.uploadDir).toBe('test-uploads')
    })

    it('should throw error for invalid config', () => {
      vi.stubEnv('STORAGE_TYPE', 'cloudinary')
      // Missing required cloudinary env vars

      expect(() => getValidatedStorageConfig()).toThrow()
    })
  })
}) 