/**
 * Job Application API Schemas
 * 
 * Defines JSON schemas for job application REST API endpoints.
 * These schemas are used by Fastify for request/response validation and automatic OpenAPI documentation.
 */

// Base job application fields for validation
const jobApplicationFields = {
  company: { type: 'string', minLength: 1, maxLength: 255 },
  position: { type: 'string', minLength: 1, maxLength: 255 },
  dateApplied: { type: 'string', format: 'date-time' },
  status: { 
    type: 'string', 
    enum: ['applied', 'interview', 'offer', 'rejected', 'withdrawn', 'accepted'] 
  },
  type: { 
    type: 'string', 
    enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance'],
    nullable: true 
  },
  salary: { type: 'integer', minimum: 0, nullable: true },
  jobLink: { type: 'string', format: 'uri', nullable: true },
  compatibilityScore: { type: 'integer', minimum: 0, maximum: 10, nullable: true },
  notes: { type: 'string', maxLength: 5000, nullable: true },
  isStarred: { type: 'boolean' },
  followUpDate: { type: 'string', format: 'date-time', nullable: true },
  deadline: { type: 'string', format: 'date-time', nullable: true }
};

// Schema for creating a new job application
export const createJobApplicationSchema = {
  body: {
    type: 'object',
    required: ['userId', 'company', 'position'],
    properties: {
      userId: { type: 'integer', minimum: 1 },
      ...jobApplicationFields,
      tags: {
        type: 'array',
        items: { type: 'string', minLength: 1, maxLength: 50 },
        maxItems: 20
      }
    },
    additionalProperties: false
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        userId: { type: 'integer' },
        ...jobApplicationFields,
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        tags: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              label: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' }
            }
          }
        },
        documents: { type: 'array', items: { type: 'object' } },
        jobConnections: { type: 'array', items: { type: 'object' } }
      }
    }
  }
};

// Schema for updating a job application
export const updateJobApplicationSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', pattern: '^[1-9]\\d*$' }
    }
  },
  body: {
    type: 'object',
    properties: {
      ...jobApplicationFields,
      tags: {
        type: 'array',
        items: { type: 'string', minLength: 1, maxLength: 50 },
        maxItems: 20
      }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        userId: { type: 'integer' },
        ...jobApplicationFields,
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        tags: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              label: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' }
            }
          }
        },
        documents: { type: 'array', items: { type: 'object' } },
        jobConnections: { type: 'array', items: { type: 'object' } }
      }
    }
  }
};

// Schema for getting a single job application
export const getJobApplicationSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', pattern: '^[1-9]\\d*$' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        userId: { type: 'integer' },
        ...jobApplicationFields,
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        tags: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              label: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' }
            }
          }
        },
        documents: { type: 'array', items: { type: 'object' } },
        jobConnections: { type: 'array', items: { type: 'object' } }
      }
    }
  }
};

// Schema for listing job applications with filtering and pagination
export const listJobApplicationsSchema = {
  querystring: {
    type: 'object',
    properties: {
      // Pagination
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
      
      // Filters
      userId: { type: 'integer', minimum: 1 },
      status: { 
        type: 'string', 
        enum: ['applied', 'interview', 'offer', 'rejected', 'withdrawn', 'accepted'] 
      },
      company: { type: 'string', minLength: 1 },
      position: { type: 'string', minLength: 1 },
      dateFrom: { type: 'string', format: 'date' },
      dateTo: { type: 'string', format: 'date' },
      isStarred: { type: 'boolean' },
      hasFollowUp: { type: 'boolean' },
      salaryMin: { type: 'integer', minimum: 0 },
      salaryMax: { type: 'integer', minimum: 0 },
      compatibilityScoreMin: { type: 'integer', minimum: 0, maximum: 10 },
      
      // Sorting
      sortBy: { 
        type: 'string', 
        enum: ['dateApplied', 'company', 'position', 'status', 'salary', 'compatibilityScore'],
        default: 'dateApplied'
      },
      sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              userId: { type: 'integer' },
              ...jobApplicationFields,
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              tags: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    label: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' }
                  }
                }
              },
              documents: { type: 'array', items: { type: 'object' } },
              jobConnections: { type: 'array', items: { type: 'object' } }
            }
          }
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
            hasNext: { type: 'boolean' },
            hasPrev: { type: 'boolean' }
          }
        }
      }
    }
  }
};

// Schema for deleting a job application
export const deleteJobApplicationSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', pattern: '^[1-9]\\d*$' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        deletedId: { type: 'integer' }
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
    statusCode: { type: 'integer' }
  }
}; 