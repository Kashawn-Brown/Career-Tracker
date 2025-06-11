/**
 * Document API Schemas
 * 
 * Defines JSON schemas for document REST API endpoints.
 * These schemas are used by Fastify for request/response validation and automatic OpenAPI documentation.
 */

// Document response object schema
const documentResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    filename: { type: 'string' },
    originalName: { type: 'string' },
    fileUrl: { type: 'string' },
    fileSize: { type: 'integer' },
    mimeType: { type: 'string' },
    type: { type: 'string' },
    jobApplicationId: { type: 'integer' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    jobApplication: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        company: { type: 'string' },
        position: { type: 'string' },
        userId: { type: 'integer' }
      }
    }
  }
};

// Common error response schema
export const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
    statusCode: { type: 'integer' },
    timestamp: { type: 'string', format: 'date-time' },
    path: { type: 'string' }
  },
  required: ['error', 'message']
};

// Schema for uploading a document (POST /api/applications/:id/documents)
export const uploadDocumentSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', pattern: '^[1-9]\\d*$' }
    }
  },
  // Note: Body validation for multipart/form-data is handled by upload middleware
  response: {
    201: documentResponseSchema
  }
};

// Schema for listing documents (GET /api/applications/:id/documents)
export const listDocumentsSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', pattern: '^[1-9]\\d*$' }
    }
  },
  querystring: {
    type: 'object',
    properties: {
      // Pagination
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      
      // Filters
      type: { type: 'string', minLength: 1 },
      filename: { type: 'string', minLength: 1 },
      fileSizeMin: { type: 'integer', minimum: 0 },
      fileSizeMax: { type: 'integer', minimum: 0 },
      createdAfter: { type: 'string', format: 'date-time' },
      createdBefore: { type: 'string', format: 'date-time' },
      
      // Sorting
      sortBy: { 
        type: 'string', 
        enum: ['createdAt', 'filename', 'fileSize', 'type'],
        default: 'createdAt'
      },
      sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'object',
      properties: {
        documents: {
          type: 'array',
          items: documentResponseSchema
        },
        pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            pages: { type: 'integer' }
          }
        }
      }
    }
  }
};

// Schema for getting a single document (GET /api/applications/:id/documents/:documentId)
export const getDocumentSchema = {
  params: {
    type: 'object',
    required: ['id', 'documentId'],
    properties: {
      id: { type: 'string', pattern: '^[1-9]\\d*$' },
      documentId: { type: 'string', pattern: '^[1-9]\\d*$' }
    }
  },
  response: {
    200: documentResponseSchema
  }
};

// Schema for deleting a document (DELETE /api/applications/:id/documents/:documentId)
export const deleteDocumentSchema = {
  params: {
    type: 'object',
    required: ['id', 'documentId'],
    properties: {
      id: { type: 'string', pattern: '^[1-9]\\d*$' },
      documentId: { type: 'string', pattern: '^[1-9]\\d*$' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        deletedDocument: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            filename: { type: 'string' },
            originalName: { type: 'string' }
          }
        }
      }
    }
  }
}; 