/**
 * Tag Controller
 *
 * Handles HTTP requests for tag management operations.
 * Implements proper error handling, validation, and response formatting.
 */
import { repositories } from '../repositories/index.js';
/**
 * List all tags with optional filtering
 */
export async function listTags(request, reply) {
    try {
        const userId = parseInt(request.params.userId, 10);
        const { search, limit = 50 } = request.query;
        if (isNaN(userId)) {
            return reply.status(400).send({
                error: 'Bad Request',
                message: 'Invalid user ID'
            });
        }
        let tags;
        if (search) {
            // Search tags for the specific user
            tags = await repositories.tag.searchTags(search, userId);
        }
        else {
            // Get all tags for the specific user
            tags = await repositories.tag.findByUser(userId);
        }
        return reply.status(200).send(tags);
    }
    catch (error) {
        request.log.error('Error listing tags:', error);
        return reply.status(500).send({
            error: 'Internal Server Error',
            message: 'Failed to retrieve tags'
        });
    }
}
/**
 * Add tags to a job application
 */
export async function addTagsToApplication(request, reply) {
    try {
        const jobApplicationId = parseInt(request.params.id, 10);
        const { tags } = request.body;
        if (isNaN(jobApplicationId)) {
            return reply.status(400).send({
                error: 'Bad Request',
                message: 'Invalid job application ID'
            });
        }
        // Verify job application exists
        const jobApplication = await repositories.jobApplication.findById(jobApplicationId);
        if (!jobApplication) {
            return reply.status(404).send({
                error: 'Not Found',
                message: 'Job application not found'
            });
        }
        // Filter out empty tags and trim whitespace
        const validTags = tags
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
        if (validTags.length === 0) {
            return reply.status(400).send({
                error: 'Bad Request',
                message: 'At least one valid tag is required'
            });
        }
        // Add tags to the job application
        const createdTags = await repositories.tag.createManyForJobApplication(jobApplicationId, validTags);
        return reply.status(200).send(createdTags);
    }
    catch (error) {
        request.log.error('Error adding tags to application:', error);
        return reply.status(500).send({
            error: 'Internal Server Error',
            message: 'Failed to add tags to job application'
        });
    }
}
/**
 * Remove a tag from a job application
 */
export async function removeTagFromApplication(request, reply) {
    try {
        const jobApplicationId = parseInt(request.params.id, 10);
        const tagId = parseInt(request.params.tagId, 10);
        if (isNaN(jobApplicationId) || isNaN(tagId)) {
            return reply.status(400).send({
                error: 'Bad Request',
                message: 'Invalid job application ID or tag ID'
            });
        }
        // Verify job application exists
        const jobApplication = await repositories.jobApplication.findById(jobApplicationId);
        if (!jobApplication) {
            return reply.status(404).send({
                error: 'Not Found',
                message: 'Job application not found'
            });
        }
        // Verify tag exists and belongs to the job application
        const tag = await repositories.tag.findById(tagId);
        if (!tag) {
            return reply.status(404).send({
                error: 'Not Found',
                message: 'Tag not found'
            });
        }
        if (tag.jobApplicationId !== jobApplicationId) {
            return reply.status(400).send({
                error: 'Bad Request',
                message: 'Tag does not belong to the specified job application'
            });
        }
        // Delete the tag
        await repositories.tag.delete(tagId);
        return reply.status(200).send({
            message: 'Tag removed successfully',
            deletedTagId: tagId
        });
    }
    catch (error) {
        request.log.error('Error removing tag from application:', error);
        return reply.status(500).send({
            error: 'Internal Server Error',
            message: 'Failed to remove tag from job application'
        });
    }
}
//# sourceMappingURL=tag.controller.js.map