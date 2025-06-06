/**
 * Job Application Routes
 *
 * Defines REST API routes for job application CRUD operations.
 * Registers routes with Fastify including validation schemas and handlers.
 */
import { listJobApplications, getJobApplication, createJobApplication, updateJobApplication, deleteJobApplication } from '../controllers/job-application.controller.js';
import { listJobApplicationsSchema, getJobApplicationSchema, createJobApplicationSchema, updateJobApplicationSchema, deleteJobApplicationSchema, errorResponseSchema } from '../schemas/job-application.schema.js';
/**
 * Register job application routes
 */
export default async function jobApplicationRoutes(fastify) {
    // Add common error response schemas to all routes
    const commonErrorResponses = {
        400: errorResponseSchema,
        500: errorResponseSchema
    };
    /**
     * GET /api/applications
     * List job applications with pagination and filtering
     */
    fastify.get('/applications', {
        schema: {
            ...listJobApplicationsSchema,
            response: {
                ...listJobApplicationsSchema.response,
                ...commonErrorResponses
            }
        },
        handler: listJobApplications
    });
    /**
     * GET /api/applications/:id
     * Get a single job application by ID
     */
    fastify.get('/applications/:id', {
        schema: {
            ...getJobApplicationSchema,
            response: {
                ...getJobApplicationSchema.response,
                404: errorResponseSchema,
                ...commonErrorResponses
            }
        },
        handler: getJobApplication
    });
    /**
     * POST /api/applications
     * Create a new job application
     */
    fastify.post('/applications', {
        schema: {
            ...createJobApplicationSchema,
            response: {
                ...createJobApplicationSchema.response,
                ...commonErrorResponses
            }
        },
        handler: createJobApplication
    });
    /**
     * PUT /api/applications/:id
     * Update an existing job application
     */
    fastify.put('/applications/:id', {
        schema: {
            ...updateJobApplicationSchema,
            response: {
                ...updateJobApplicationSchema.response,
                404: errorResponseSchema,
                ...commonErrorResponses
            }
        },
        handler: updateJobApplication
    });
    /**
     * DELETE /api/applications/:id
     * Delete a job application
     */
    fastify.delete('/applications/:id', {
        schema: {
            ...deleteJobApplicationSchema,
            response: {
                ...deleteJobApplicationSchema.response,
                404: errorResponseSchema,
                ...commonErrorResponses
            }
        },
        handler: deleteJobApplication
    });
}
//# sourceMappingURL=job-applications.js.map