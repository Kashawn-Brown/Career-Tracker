/**
 * Job Application Controller
 *
 * Handles HTTP requests for job application CRUD operations.
 * Implements proper error handling, validation, and response formatting.
 */
import { repositories } from '../repositories/index.js';
/**
 * List job applications with pagination and filtering
 */
export async function listJobApplications(request, reply) {
    try {
        const { page = 1, limit = 10, userId, status, company, position, dateFrom, dateTo, isStarred, hasFollowUp, salaryMin, salaryMax, compatibilityScoreMin, sortBy = 'dateApplied', sortOrder = 'desc' } = request.query;
        // Build filters
        const filters = {};
        if (userId)
            filters.userId = userId;
        if (status)
            filters.status = status;
        if (company)
            filters.company = company;
        if (position)
            filters.position = position;
        if (dateFrom)
            filters.dateFrom = new Date(dateFrom);
        if (dateTo)
            filters.dateTo = new Date(dateTo);
        if (isStarred !== undefined)
            filters.isStarred = isStarred;
        if (hasFollowUp !== undefined)
            filters.hasFollowUp = hasFollowUp;
        if (salaryMin)
            filters.salaryMin = salaryMin;
        if (salaryMax)
            filters.salaryMax = salaryMax;
        if (compatibilityScoreMin)
            filters.compatibilityScoreMin = compatibilityScoreMin;
        // Build order by
        const orderBy = { [sortBy]: sortOrder };
        // Get paginated results
        const result = await repositories.jobApplication.findManyWithPagination(filters, {
            include: {
                tags: true,
                documents: true,
                jobConnections: {
                    include: {
                        contact: true
                    }
                }
            },
            orderBy,
            pagination: { page, limit }
        });
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
        const jobApplication = await repositories.jobApplication.findById(id, {
            tags: true,
            documents: true,
            jobConnections: {
                include: {
                    contact: true
                }
            }
        });
        if (!jobApplication) {
            return reply.status(404).send({
                error: 'Not Found',
                message: 'Job application not found'
            });
        }
        return reply.status(200).send(jobApplication);
    }
    catch (error) {
        request.log.error('Error getting job application:', error);
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
        const { tags, ...jobApplicationData } = request.body;
        // Convert date strings to Date objects
        const createData = {
            ...jobApplicationData,
            dateApplied: jobApplicationData.dateApplied ? new Date(jobApplicationData.dateApplied) : new Date(),
            followUpDate: jobApplicationData.followUpDate ? new Date(jobApplicationData.followUpDate) : null,
            deadline: jobApplicationData.deadline ? new Date(jobApplicationData.deadline) : null,
            // Connect user relation
            user: { connect: { id: jobApplicationData.userId } }
        };
        // Remove userId from createData since we're using the relation
        delete createData.userId;
        // Create job application with tags if provided
        const jobApplication = await repositories.jobApplication.create(createData);
        // Add tags if provided
        if (tags && tags.length > 0) {
            await repositories.tag.createManyForJobApplication(jobApplication.id, tags);
        }
        // Fetch the created job application with all relations
        const createdJobApplication = await repositories.jobApplication.findById(jobApplication.id, {
            tags: true,
            documents: true,
            jobConnections: {
                include: {
                    contact: true
                }
            }
        });
        return reply.status(201).send(createdJobApplication);
    }
    catch (error) {
        request.log.error('Error creating job application:', error);
        // Handle specific database errors
        if (error instanceof Error) {
            if (error.message.includes('Foreign key constraint')) {
                return reply.status(400).send({
                    error: 'Bad Request',
                    message: 'Invalid user ID provided'
                });
            }
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
        // Check if job application exists
        const existingJobApplication = await repositories.jobApplication.findById(id);
        if (!existingJobApplication) {
            return reply.status(404).send({
                error: 'Not Found',
                message: 'Job application not found'
            });
        }
        const { tags, ...updateData } = request.body;
        // Convert date strings to Date objects
        const formattedUpdateData = {
            ...updateData,
            dateApplied: updateData.dateApplied ? new Date(updateData.dateApplied) : undefined,
            followUpDate: updateData.followUpDate ? new Date(updateData.followUpDate) : undefined,
            deadline: updateData.deadline ? new Date(updateData.deadline) : undefined
        };
        // Remove undefined values
        Object.keys(formattedUpdateData).forEach(key => {
            if (formattedUpdateData[key] === undefined) {
                delete formattedUpdateData[key];
            }
        });
        // Update job application
        const updatedJobApplication = await repositories.jobApplication.update(id, formattedUpdateData);
        // Update tags if provided
        if (tags !== undefined) {
            // Delete existing tags
            await repositories.tag.deleteByJobApplication(id);
            // Create new tags if any provided
            if (tags.length > 0) {
                await repositories.tag.createManyForJobApplication(id, tags);
            }
        }
        // Fetch the updated job application with all relations
        const finalJobApplication = await repositories.jobApplication.findById(id, {
            tags: true,
            documents: true,
            jobConnections: {
                include: {
                    contact: true
                }
            }
        });
        return reply.status(200).send(finalJobApplication);
    }
    catch (error) {
        request.log.error('Error updating job application:', error);
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
        // Check if job application exists
        const existingJobApplication = await repositories.jobApplication.findById(id);
        if (!existingJobApplication) {
            return reply.status(404).send({
                error: 'Not Found',
                message: 'Job application not found'
            });
        }
        // Delete job application (cascade deletes will handle related records)
        await repositories.jobApplication.delete(id);
        return reply.status(200).send({
            message: 'Job application deleted successfully',
            deletedId: id
        });
    }
    catch (error) {
        request.log.error('Error deleting job application:', error);
        return reply.status(500).send({
            error: 'Internal Server Error',
            message: 'Failed to delete job application'
        });
    }
}
//# sourceMappingURL=job-application.controller.js.map