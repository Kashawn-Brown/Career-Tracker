/**
 * Storage configuration for file uploads
 * Supports local storage (MVP) with easy migration to cloud storage
 */

export interface StorageConfig {
  type: 'local' | 'cloudinary' | 's3'
  local?: LocalStorageConfig
  cloudinary?: CloudinaryConfig
  s3?: S3Config
}

export interface LocalStorageConfig {
  uploadDir: string
  baseUrl: string
  maxFileSize: number
  allowedTypes: string[]
}

export interface CloudinaryConfig {
  cloudName: string
  apiKey: string
  apiSecret: string
  folder?: string
}

export interface S3Config {
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  region: string
  endpoint?: string
}

/**
 * Get storage configuration from environment variables
 */
export function getStorageConfig(): StorageConfig {
  const type = (process.env.STORAGE_TYPE || 'local') as StorageConfig['type']
  
  const config: StorageConfig = { type }
  
  switch (type) {
    case 'local':
      config.local = {
        uploadDir: process.env.UPLOAD_DIR || 'uploads',
        baseUrl: process.env.FILE_SERVE_BASE_URL || 'http://localhost:3002',
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
        allowedTypes: (process.env.ALLOWED_FILE_TYPES || '').split(',').map(t => t.trim())
      }
      break
      
    case 'cloudinary':
      config.cloudinary = {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
        apiKey: process.env.CLOUDINARY_API_KEY || '',
        apiSecret: process.env.CLOUDINARY_API_SECRET || '',
        folder: process.env.CLOUDINARY_FOLDER || 'career-tracker'
      }
      break
      
    case 's3':
      config.s3 = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        bucket: process.env.AWS_S3_BUCKET || '',
        region: process.env.AWS_S3_REGION || 'us-east-1',
        endpoint: process.env.AWS_S3_ENDPOINT
      }
      break
      
    default:
      throw new Error(`Unsupported storage type: ${type}`)
  }
  
  return config
}

/**
 * Validate storage configuration
 */
export function validateStorageConfig(config: StorageConfig): void {
  switch (config.type) {
    case 'local':
      if (!config.local?.uploadDir) {
        throw new Error('Local storage requires UPLOAD_DIR to be configured')
      }
      break
      
    case 'cloudinary':
      if (!config.cloudinary?.cloudName || !config.cloudinary?.apiKey || !config.cloudinary?.apiSecret) {
        throw new Error('Cloudinary storage requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET')
      }
      break
      
    case 's3':
      if (!config.s3?.accessKeyId || !config.s3?.secretAccessKey || !config.s3?.bucket) {
        throw new Error('S3 storage requires AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET')
      }
      break
  }
}

/**
 * Get validated storage configuration
 */
export function getValidatedStorageConfig(): StorageConfig {
  const config = getStorageConfig()
  validateStorageConfig(config)
  return config
} 