/**
 * Contact API Schemas
 * 
 * Defines JSON schemas for contact REST API endpoints.
 * These schemas are used by Fastify for request/response validation and automatic OpenAPI documentation.
 */

// Base contact response schema
const contactResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    userId: { type: 'integer' },
    name: { type: 'string' },
    email: { type: ['string', 'null'], format: 'email' },
    phone: { type: ['string', 'null'] },
    company: { type: ['string', 'null'] },
    role: { type: ['string', 'null'] },
    linkedinUrl: { type: ['string', 'null'], format: 'uri' },
    connectionType: { type: ['string', 'null'] },
    notes: { type: ['string', 'null'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};

// Schema for listing contacts
export const listContactsSchema = {
  querystring: {
    type: 'object',
    properties: {
      search: { type: 'string', minLength: 1 },
      company: { type: 'string', minLength: 1 },
      role: { type: 'string', minLength: 1 },
      connectionType: { type: 'string', minLength: 1 },
      hasEmail: { type: 'boolean' },
      hasPhone: { type: 'boolean' },
      hasLinkedin: { type: 'boolean' },
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'object',
      properties: {
        contacts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ...contactResponseSchema.properties,
              jobConnections: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    jobApplicationId: { type: 'integer' },
                    status: { type: 'string' },
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

// Schema for getting a single contact
export const getContactSchema = {
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
        ...contactResponseSchema.properties,
        jobConnections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              jobApplicationId: { type: 'integer' },
              connectionType: { type: 'string' },
              status: { type: 'string' },
              contactedAt: { type: ['string', 'null'], format: 'date-time' },
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
      }
    }
  }
};

// Schema for creating a contact
export const createContactSchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 },
      email: { type: 'string', format: 'email', maxLength: 255 },
      phone: { type: 'string', minLength: 1, maxLength: 50 },
      company: { type: 'string', minLength: 1, maxLength: 255 },
      role: { type: 'string', minLength: 1, maxLength: 255 },
      linkedinUrl: { type: 'string', format: 'uri', maxLength: 500 },
      connectionType: { type: 'string', minLength: 1, maxLength: 100 },
      notes: { type: 'string', maxLength: 2000 }
    },
    additionalProperties: false
  },
  response: {
    201: contactResponseSchema
  }
};

// Schema for updating a contact
export const updateContactSchema = {
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
      name: { type: 'string', minLength: 1, maxLength: 255 },
      email: { type: 'string', format: 'email', maxLength: 255 },
      phone: { type: 'string', minLength: 1, maxLength: 50 },
      company: { type: 'string', minLength: 1, maxLength: 255 },
      role: { type: 'string', minLength: 1, maxLength: 255 },
      linkedinUrl: { type: 'string', format: 'uri', maxLength: 500 },
      connectionType: { type: 'string', minLength: 1, maxLength: 100 },
      notes: { type: 'string', maxLength: 2000 }
    },
    additionalProperties: false,
    minProperties: 1
  },
  response: {
    200: contactResponseSchema
  }
};

// Schema for deleting a contact
export const deleteContactSchema = {
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
        deletedContactId: { type: 'integer' }
      }
    }
  }
};

// Common error response schema for all contact API endpoints
export const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' }
  }
}; 