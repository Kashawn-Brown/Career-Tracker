# File Storage Migration Guide

## Overview

This document outlines the file storage architecture designed for easy migration from local storage (MVP) to cloud storage (production). The system is built with a service layer abstraction that allows seamless switching between storage providers.

## Current Architecture (MVP - Local Storage)

### Directory Structure
```
backend/
├── uploads/
│   ├── documents/       # Resume and cover letter uploads
│   └── temp/           # Temporary files during processing
├── src/
│   ├── services/
│   │   ├── FileStorageService.ts    # Storage interface + local implementation
│   │   └── DocumentService.ts       # Business logic (storage-agnostic)
│   ├── config/
│   │   └── storage.ts              # Storage configuration
│   └── utils/
│       └── fileUtils.ts            # Path resolution utilities
```

### Database Schema
The Document model is designed to support both local and cloud storage:

```typescript
model Document {
  filename         String         // Internal filename (UUID-based)
  originalName     String         // User's original filename
  path             String         // Local path OR cloud URL
  fileUrl          String         // Serving URL (local endpoint OR CDN)
  mimeType         String         // File MIME type
  fileSize         Int?           // File size in bytes
  uploadDate       DateTime       // Upload timestamp
  // ... other fields
}
```

## Migration Strategy

### Phase 1: Local Storage (Current - Task 3.1)
- **Storage Location**: `backend/uploads/`
- **File Serving**: Express static middleware
- **Configuration**: Environment variables for paths and limits

### Phase 2: Cloud Migration (Future)
- **Target**: Cloudinary (or AWS S3)
- **Migration Process**: Zero-downtime service swap
- **Data Migration**: Optional background job to move existing files

## Service Layer Design

### Storage Interface
```typescript
interface IFileStorageService {
  // Core operations
  save(file: Buffer, metadata: FileMetadata): Promise<StorageResult>
  delete(path: string): Promise<void>
  getUrl(path: string): string
  exists(path: string): Promise<boolean>
  
  // Metadata operations
  getFileInfo(path: string): Promise<FileInfo>
  generatePath(originalName: string, type: string): string
}

interface FileMetadata {
  originalName: string
  mimeType: string
  size: number
  type: 'resume' | 'cover_letter' | 'other'
}

interface StorageResult {
  path: string        // Storage path/identifier
  url: string         // Public URL for serving
  filename: string    // Generated filename
}
```

### Local Implementation (Current)
```typescript
class LocalFileStorageService implements IFileStorageService {
  private uploadDir: string
  
  async save(file: Buffer, metadata: FileMetadata): Promise<StorageResult> {
    // Save to local filesystem
    // Generate UUID-based filename
    // Return local path and serving URL
  }
  
  getUrl(path: string): string {
    // Return localhost URL for development
    return `http://localhost:3002/uploads/${path}`
  }
}
```

### Cloud Implementation (Future)
```typescript
class CloudinaryStorageService implements IFileStorageService {
  private cloudinary: CloudinaryAPI
  
  async save(file: Buffer, metadata: FileMetadata): Promise<StorageResult> {
    // Upload to Cloudinary
    // Apply transformations if needed
    // Return cloud URL and path
  }
  
  getUrl(path: string): string {
    // Return Cloudinary CDN URL
    return this.cloudinary.url(path)
  }
}
```

## Configuration Management

### Environment Variables

#### Current (Local)
```env
# File Storage
STORAGE_TYPE=local
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document

# Serving
FILE_SERVE_BASE_URL=http://localhost:3002
```

#### Future (Cloud)
```env
# File Storage
STORAGE_TYPE=cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Or for AWS S3
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your_bucket_name
AWS_S3_REGION=us-east-1
```

### Configuration Factory
```typescript
// src/config/storage.ts
export function createStorageService(): IFileStorageService {
  const storageType = process.env.STORAGE_TYPE || 'local'
  
  switch (storageType) {
    case 'local':
      return new LocalFileStorageService()
    case 'cloudinary':
      return new CloudinaryStorageService()
    case 's3':
      return new S3StorageService()
    default:
      throw new Error(`Unsupported storage type: ${storageType}`)
  }
}
```

## Migration Checklist

### Pre-Migration (Local to Cloud)
- [ ] Choose cloud provider (Cloudinary/S3)
- [ ] Set up cloud storage account
- [ ] Obtain API credentials
- [ ] Install cloud storage dependencies
- [ ] Implement cloud service class
- [ ] Update environment configuration
- [ ] Test cloud storage in staging

### Migration Process
- [ ] Deploy new version with cloud storage support
- [ ] Update environment variables to use cloud storage
- [ ] Optional: Run background job to migrate existing files
- [ ] Update file URLs in database (if needed)
- [ ] Monitor and verify all uploads work correctly
- [ ] Clean up local files (after verification)

### Post-Migration
- [ ] Remove local storage dependencies
- [ ] Update documentation
- [ ] Set up monitoring for cloud storage usage
- [ ] Configure CDN/caching if needed

## Benefits of This Architecture

### Development Benefits
- **Simple MVP**: Start with local storage for rapid development
- **Easy Testing**: Mock storage service for unit tests
- **Flexible Configuration**: Switch storage via environment variables

### Production Benefits
- **Scalability**: Cloud storage handles scaling automatically
- **Reliability**: Cloud providers offer redundancy and backups
- **Performance**: CDN distribution for fast file serving
- **Cost Effective**: Pay-per-use pricing model

### Migration Benefits
- **Zero Downtime**: Service layer abstraction allows hot swapping
- **Gradual Migration**: Can migrate files incrementally
- **Rollback Capability**: Easy to revert if issues arise
- **Consistent API**: Application code remains unchanged

## Security Considerations

### Local Storage
- File access through controlled endpoints only
- Validate file types and sizes before storage
- Sanitize filenames to prevent directory traversal

### Cloud Storage
- Use signed URLs for secure access
- Configure proper CORS policies
- Implement access controls and permissions
- Monitor usage and costs

## Testing Strategy

### Local Storage Testing
- Unit tests with temporary directories
- Integration tests with real file uploads
- Error handling for disk space issues

### Cloud Storage Testing
- Mock cloud service for unit tests
- Staging environment with real cloud storage
- Test upload/download/delete operations
- Monitor cloud costs during testing

---

*This architecture ensures that the Career Tracker application can start with simple local storage and seamlessly migrate to enterprise-grade cloud storage when needed.* 