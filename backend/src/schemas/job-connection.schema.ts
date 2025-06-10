/**
 * Job Connection API Schemas
 * 
 * Defines JSON schemas for job connection REST API endpoints.
 * These schemas are used by Fastify for request/response validation and automatic OpenAPI documentation.
 */

// Base job connection response schema
const jobConnectionResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    jobApplicationId: { type: 'integer' },
    contactId: { type: ['integer', 'null'] },
    name: { type: 'string' },
    email: { type: ['string', 'null'], format: 'email' },
    phone: { type: ['string', 'null'] },
    company: { type: ['string', 'null'] },
    role: { type: ['string', 'null'] },
    connectionType: { type: 'string' },
    status: { type: 'string' },
    notes: { type: ['string', 'null'] },
    contactedAt: { type: ['string', 'null'], format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};

// Schema for listing job connections for an application
export const listJobConnectionsSchema = {
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
      status: { type: 'string', minLength: 1 },
      connectionType: { type: 'string', minLength: 1 },
      hasContact: { type: 'boolean' },
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'object',
      properties: {
        jobConnections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ...jobConnectionResponseSchema.properties,
              contact: {
                type: ['object', 'null'],
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  email: { type: ['string', 'null'] },
                  company: { type: ['string', 'null'] },
                  role: { type: ['string', 'null'] }
                }
              }
            }
          }
        },
        total: { type: 'integer' },
        page: { type: 'integer' },
        limit: { type: 'integer' },
        pages: { type: 'integer' }
      }
    }
  }
};

// Schema for getting a single job connection
export const getJobConnectionSchema = {
  params: {
    type: 'object',
    required: ['id', 'connectionId'],
    properties: {
      id: { type: 'string', pattern: '^[1-9]\\d*$' },
      connectionId: { type: 'string', pattern: '^[1-9]\\d*$' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        ...jobConnectionResponseSchema.properties,
        contact: {
          type: ['object', 'null'],
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            email: { type: ['string', 'null'] },
            phone: { type: ['string', 'null'] },
            company: { type: ['string', 'null'] },
            role: { type: ['string', 'null'] },
            linkedinUrl: { type: ['string', 'null'] },
            connectionType: { type: ['string', 'null'] }
          }
        },
        jobApplication: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            company: { type: 'string' },
            position: { type: 'string' },
            status: { type: 'string' }
          }
        }
      }
    }
  }
};

// Schema for creating a job connection
export const createJobConnectionSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', pattern: '^[1-9]\\d*$' }
    }
  },
  body: {
    type: 'object',
    required: ['name', 'connectionType'],
    properties: {
      contactId: { type: 'integer', minimum: 1 },
      name: { type: 'string', minLength: 1, maxLength: 255 },
      email: { type: 'string', format: 'email', maxLength: 255 },
      phone: { type: 'string', minLength: 1, maxLength: 50 },
      company: { type: 'string', minLength: 1, maxLength: 255 },
      role: { type: 'string', minLength: 1, maxLength: 255 },
      connectionType: { 
        type: 'string',
        enum: ['referral', 'recruiter', 'hiring_manager', 'employee', 'alumni', 'networking', 'other']
      },
      status: { 
        type: 'string',
        enum: ['not_contacted', 'contacted', 'responded', 'meeting_scheduled', 'no_response', 'rejected'],
        default: 'not_contacted'
      },
      notes: { type: 'string', maxLength: 2000 }
    },
    additionalProperties: false
  },
  response: {
    201: jobConnectionResponseSchema
  }
};

// Schema for updating a job connection
export const updateJobConnectionSchema = {
  params: {
    type: 'object',
    required: ['id', 'connectionId'],
    properties: {
      id: { type: 'string', pattern: '^[1-9]\\d*$' },
      connectionId: { type: 'string', pattern: '^[1-9]\\d*$' }
    }
  },
  body: {
    type: 'object',
    properties: {
      contactId: { type: 'integer', minimum: 1 },
      name: { type: 'string', minLength: 1, maxLength: 255 },
      email: { type: 'string', format: 'email', maxLength: 255 },
      phone: { type: 'string', minLength: 1, maxLength: 50 },
      company: { type: 'string', minLength: 1, maxLength: 255 },
      role: { type: 'string', minLength: 1, maxLength: 255 },
      connectionType: { 
        type: 'string',
        enum: ['referral', 'recruiter', 'hiring_manager', 'employee', 'alumni', 'networking', 'other']
      },
      status: { 
        type: 'string',
        enum: ['not_contacted', 'contacted', 'responded', 'meeting_scheduled', 'no_response', 'rejected']
      },
      notes: { type: 'string', maxLength: 2000 },
      contactedAt: { type: 'string', format: 'date-time' }
    },
    additionalProperties: false,
    minProperties: 1
  },
  response: {
    200: jobConnectionResponseSchema
  }
};

// Schema for deleting a job connection
export const deleteJobConnectionSchema = {
  params: {
    type: 'object',
    required: ['id', 'connectionId'],
    properties: {
      id: { type: 'string', pattern: '^[1-9]\\d*$' },
      connectionId: { type: 'string', pattern: '^[1-9]\\d*$' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        deletedConnectionId: { type: 'integer' }
      }
    }
  }
};

// Schema for updating job connection status (convenience endpoint)
export const updateJobConnectionStatusSchema = {
  params: {
    type: 'object',
    required: ['id', 'connectionId'],
    properties: {
      id: { type: 'string', pattern: '^[1-9]\\d*$' },
      connectionId: { type: 'string', pattern: '^[1-9]\\d*$' }
    }
  },
  body: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { 
        type: 'string',
        enum: ['not_contacted', 'contacted', 'responded', 'meeting_scheduled', 'no_response', 'rejected']
      },
      contactedAt: { type: 'string', format: 'date-time' },
      notes: { type: 'string', maxLength: 2000 }
    },
    additionalProperties: false
  },
  response: {
    200: jobConnectionResponseSchema
  }
};

// Common error response schema for all job connection API endpoints
export const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' }
  }
}; 