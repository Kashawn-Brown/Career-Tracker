/**
 * Job Application Controller
 *
 * Handles HTTP requests for job application CRUD operations.
 * Implements proper error handling, validation, and response formatting.
 * Uses JobApplicationService for business logic to maintain separation of concerns.
 */
import { jobApplicationService } from '../services/index.js';
/**
 * List job applications with pagination and filtering
 */
export async function listJobApplications(request, reply) {
    try {
        const result = await jobApplicationService.listJobApplications(request.query);
        return reply.status(200).send(result);
    }
    catch (error) {
        request.log.error('Error listing job applications:', error);
        return reply.status(500).send({
            error: 'Internal Server Error',
            message: 'Failed to retrieve job applications'
        });
    }
}
/**
 * Get a single job application by ID
 */
export async function getJobApplication(request, reply) {
    try {
        const id = parseInt(request.params.id, 10);
        if (isNaN(id)) {
            return reply.status(400).send({
                error: 'Bad Request',
                message: 'Invalid job application ID'
            });
        }
        const jobApplication = await jobApplicationService.getJobApplication(id);
        return reply.status(200).send(jobApplication);
    }
    catch (error) {
        request.log.error('Error getting job application:', error);
        // Handle specific business logic errors
        if (error instanceof Error && error.message === 'Job application not found') {
            return reply.status(404).send({
                error: 'Not Found',
                message: error.message
            });
        }
        return reply.status(500).send({
            error: 'Internal Server Error',
            message: 'Failed to retrieve job application'
        });
    }
}
/**
 * Create a new job application
 */
export async function createJobApplication(request, reply) {
    try {
        const createdJobApplication = await jobApplicationService.createJobApplication(request.body);
        return reply.status(201).send(createdJobApplication);
    }
    catch (error) {
        request.log.error('Error creating job application:', error);
        // Handle specific business logic errors
        if (error instanceof Error && error.message === 'Invalid user ID provided') {
            return reply.status(400).send({
                error: 'Bad Request',
                message: error.message
            });
        }
        return reply.status(500).send({
            error: 'Internal Server Error',
            message: 'Failed to create job application'
        });
    }
}
/**
 * Update an existing job application
 */
export async function updateJobApplication(request, reply) {
    try {
        const id = parseInt(request.params.id, 10);
        if (isNaN(id)) {
            return reply.status(400).send({
                error: 'Bad Request',
                message: 'Invalid job application ID'
            });
        }
        const finalJobApplication = await jobApplicationService.updateJobApplication(id, request.body);
        return reply.status(200).send(finalJobApplication);
    }
    catch (error) {
        request.log.error('Error updating job application:', error);
        // Handle specific business logic errors
        if (error instanceof Error && error.message === 'Job application not found') {
            return reply.status(404).send({
                error: 'Not Found',
                message: error.message
            });
        }
        return reply.status(500).send({
            error: 'Internal Server Error',
            message: 'Failed to update job application'
        });
    }
}
/**
 * Delete a job application
 */
export async function deleteJobApplication(request, reply) {
    try {
        const id = parseInt(request.params.id, 10);
        if (isNaN(id)) {
            return reply.status(400).send({
                error: 'Bad Request',
                message: 'Invalid job application ID'
            });
        }
        const result = await jobApplicationService.deleteJobApplication(id);
        return reply.status(200).send(result);
    }
    catch (error) {
        request.log.error('Error deleting job application:', error);
        // Handle specific business logic errors
        if (error instanceof Error && error.message === 'Job application not found') {
            return reply.status(404).send({
                error: 'Not Found',
                message: error.message
            });
        }
        return reply.status(500).send({
            error: 'Internal Server Error',
            message: 'Failed to delete job application'
        });
    }
}
//# sourceMappingURL=job-application.controller.js.map