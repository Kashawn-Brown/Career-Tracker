/**
 * File Upload Routes
 * 
 * Defines REST API routes for standalone file upload operations.
 * Registers routes with Fastify including validation schemas, rate limiting, middleware, and handlers.
 * Uses the FileUploadController for business logic separation following auth patterns.
 */

import { FastifyInstance } from 'fastify';
import { fileUploadController } from '../controllers/index.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { uploadSingle, uploadMultiple } from '../middleware/upload.middleware.js';
import { securityMiddleware } from '../middleware/security.middleware.js';
import { fileUploadErrorResponses } from '../utils/errorSchemas.js';

// Rate limiting configuration
const fileUploadRateLimit = {
  max: 10, // 10 uploads per 5 minutes (resource-intensive)
  timeWindow: 5 * 60 * 1000 // 5 minutes
};

const fileReadRateLimit = {
  max: 60, // 60 file reads per minute
  timeWindow: 60 * 1000 // 1 minute
};

const fileModificationRateLimit = {
  max: 30, // 30 file modifications per minute
  timeWindow: 60 * 1000 // 1 minute
};

const configRateLimit = {
  max: 20, // 20 config requests per minute
  timeWindow: 60 * 1000 // 1 minute
};

/**
 * File upload route schemas for validation and documentation
 */
const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
    statusCode: { type: 'number' },
    timestamp: { type: 'string' },
    path: { type: 'string' },
    details: { type: 'object' }
  },
  required: ['error', 'message', 'statusCode', 'timestamp', 'path']
};

const fileInfoSchema = {
  type: 'object',
  properties: {
    filename: { type: 'string' },
    originalName: { type: 'string' },
    size: { type: 'number' },
    mimeType: { type: 'string' },
    url: { type: 'string' },
    path: { type: 'string' },
    uploadDate: { type: 'string', format: 'date-time' }
  },
  required: ['filename', 'originalName', 'size', 'mimeType', 'path', 'uploadDate']
};

const singleUploadSchema = {
  params: {
    type: 'object',
    properties: {}
  },
  response: {
    201: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        file: fileInfoSchema
      },
      required: ['message', 'file']
    }
  }
};

const multipleUploadSchema = {
  params: {
    type: 'object',
    properties: {}
  },
  response: {
    201: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        files: {
          type: 'array',
          items: fileInfoSchema
        },
        totalFiles: { type: 'number' },
        totalSize: { type: 'number' }
      },
      required: ['message', 'files']
    }
  }
};

const getFileInfoSchema = {
  params: {
    type: 'object',
    properties: {
      filename: { type: 'string' }
    },
    required: ['filename']
  },
  response: {
    200: {
      type: 'object',
      properties: {
        file: fileInfoSchema
      },
      required: ['file']
    }
  }
};

const downloadFileSchema = {
  params: {
    type: 'object',
    properties: {
      filename: { type: 'string' }
    },
    required: ['filename']
  },
  response: {
    200: {
      type: 'object',
      properties: {
        // File stream response - no schema validation needed
      }
    }
  }
};

const deleteFileSchema = {
  params: {
    type: 'object',
    properties: {
      filename: { type: 'string' }
    },
    required: ['filename']
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      },
      required: ['message']
    }
  }
};

const uploadConfigSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        maxFileSize: { type: 'number' },
        maxFileSizeMB: { type: 'number' },
        allowedMimeTypes: {
          type: 'array',
          items: { type: 'string' }
        },
        allowedExtensions: {
          type: 'array',
          items: { type: 'string' }
        },
        uploadDir: { type: 'string' },
        storageType: {
          type: 'string',
          enum: ['local', 'cloudinary', 's3']
        },
        supportedFeatures: {
          type: 'object',
          properties: {
            multipleFiles: { type: 'boolean' },
            streamDownload: { type: 'boolean' },
            urlGeneration: { type: 'boolean' }
          },
          required: ['multipleFiles', 'streamDownload', 'urlGeneration']
        }
      },
      required: ['maxFileSize', 'maxFileSizeMB', 'allowedMimeTypes', 'allowedExtensions', 'uploadDir', 'storageType', 'supportedFeatures']
    }
  }
};

/**
 * Register file upload routes
 */
export default async function fileUploadRoutes(fastify: FastifyInstance) {
  // Register rate limiting plugin
  await fastify.register(import('@fastify/rate-limit'));

  // Using shared file upload error response schemas

  // POST /upload/single - Upload a single file
  fastify.post('/upload/single', {
    config: {
      rateLimit: fileUploadRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.fileUploadRateLimit(), uploadSingle('file')],
    schema: {
      ...singleUploadSchema,
      response: {
        ...singleUploadSchema.response,
        ...fileUploadErrorResponses
      }
    },
    handler: fileUploadController.uploadSingle
  });

  // POST /upload/multiple - Upload multiple files
  fastify.post('/upload/multiple', {
    config: {
      rateLimit: fileUploadRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.fileUploadRateLimit(), uploadMultiple('files', 10)],
    schema: {
      ...multipleUploadSchema,
      response: {
        ...multipleUploadSchema.response,
        ...fileUploadErrorResponses
      }
    },
    handler: fileUploadController.uploadMultiple
  });

  // GET /files/:filename - Get file information
  fastify.get('/files/:filename', {
    config: {
      rateLimit: fileReadRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataAccessRateLimit()],
    schema: {
      ...getFileInfoSchema,
      response: {
        ...getFileInfoSchema.response,
        ...fileUploadErrorResponses
      }
    },
    handler: fileUploadController.getFileInfo
  });

  // GET /files/:filename/download - Download a file
  fastify.get('/files/:filename/download', {
    config: {
      rateLimit: fileReadRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataAccessRateLimit()],
    schema: {
      ...downloadFileSchema,
      response: {
        ...downloadFileSchema.response,
        ...fileUploadErrorResponses
      }
    },
    handler: fileUploadController.downloadFile
  });

  // DELETE /files/:filename - Delete a file
  fastify.delete('/files/:filename', {
    config: {
      rateLimit: fileModificationRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataModificationRateLimit()],
    schema: {
      ...deleteFileSchema,
      response: {
        ...deleteFileSchema.response,
        ...fileUploadErrorResponses
      }
    },
    handler: fileUploadController.deleteFile
  });

  // GET /upload/config - Get upload configuration
  fastify.get('/upload/config', {
    config: {
      rateLimit: configRateLimit
    },
    preHandler: [requireAuth],
    schema: {
      ...uploadConfigSchema,
      response: {
        ...uploadConfigSchema.response,
        ...fileUploadErrorResponses
      }
    },
    handler: fileUploadController.getUploadConfig
  });
} 