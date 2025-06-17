/**
 * File Upload Routes
 * 
 * Defines REST API routes for standalone file upload operations.
 * Registers routes with Fastify including validation schemas, middleware, and handlers.
 * Uses the FileUploadController for business logic separation following auth patterns.
 */

import { FastifyInstance } from 'fastify';
import { fileUploadController } from '../controllers/index.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { uploadSingle, uploadMultiple } from '../middleware/upload.middleware.js';

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
  // Add common error response schemas to all routes
  const commonErrorResponses = {
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  };

  // ROUTES

  /**
   * POST /api/upload/single
   * Upload a single file
   */
  fastify.post('/upload/single', {
    preHandler: [requireAuth, uploadSingle('file')],
    schema: {
      ...singleUploadSchema,
      response: {
        ...singleUploadSchema.response,
        ...commonErrorResponses
      }
    },
    handler: fileUploadController.uploadSingle
  });

  /**
   * POST /api/upload/multiple
   * Upload multiple files
   */
  fastify.post('/upload/multiple', {
    preHandler: [requireAuth, uploadMultiple('files', 10)],
    schema: {
      ...multipleUploadSchema,
      response: {
        ...multipleUploadSchema.response,
        ...commonErrorResponses
      }
    },
    handler: fileUploadController.uploadMultiple
  });

  /**
   * GET /api/upload/info/:filename
   * Get file information
   */
  fastify.get('/upload/info/:filename', {
    preHandler: requireAuth,
    schema: {
      ...getFileInfoSchema,
      response: {
        ...getFileInfoSchema.response,
        ...commonErrorResponses
      }
    },
    handler: fileUploadController.getFileInfo
  });

  /**
   * GET /api/upload/:filename
   * Download a file
   */
  fastify.get('/upload/:filename', {
    preHandler: requireAuth,
    schema: {
      ...downloadFileSchema,
      response: {
        ...downloadFileSchema.response,
        ...commonErrorResponses
      }
    },
    handler: fileUploadController.downloadFile
  });

  /**
   * DELETE /api/upload/:filename
   * Delete a file
   */
  fastify.delete('/upload/:filename', {
    preHandler: requireAuth,
    schema: {
      ...deleteFileSchema,
      response: {
        ...deleteFileSchema.response,
        ...commonErrorResponses
      }
    },
    handler: fileUploadController.deleteFile
  });

  /**
   * GET /api/upload/config
   * Get upload configuration (public endpoint)
   */
  fastify.get('/upload/config', {
    schema: {
      ...uploadConfigSchema,
      response: {
        ...uploadConfigSchema.response,
        ...commonErrorResponses
      }
    },
    handler: fileUploadController.getUploadConfig
  });
} 