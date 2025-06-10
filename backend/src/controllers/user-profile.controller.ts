/**
 * User Profile Controller
 * 
 * Handles HTTP requests for user profile operations.
 * Implements proper error handling, validation, and response formatting.
 * Uses UserProfileService for business logic to maintain separation of concerns.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { UserProfileService } from '../services/user-profile.service.js';
import { BusinessLogicError, ValidationError } from '../middleware/error.middleware.js';
import type { UserProfileUpdateRequest } from '../schemas/user-profile.schema.js';

// Create service instance
const userProfileService = new UserProfileService();

/**
 * Get user profile (authenticated user's own profile)
 * GET /api/user
 */
export async function getUserProfile(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // Extract user ID from JWT token
    const userId = request.user!.userId;
    
    const userProfile = await userProfileService.getUserProfile(userId);
    return reply.status(200).send(userProfile);
  } catch (error) {
    request.log.error('Error getting user profile:', error);

    // Handle specific business logic errors
    if (error instanceof BusinessLogicError) {
      return reply.status(error.statusCode).send({
        error: error.statusCode === 404 ? 'Not Found' : 'Bad Request',
        message: error.message
      });
    }

    if (error instanceof ValidationError) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message
      });
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to retrieve user profile'
    });
  }
}

/**
 * Update user profile (authenticated user's own profile)
 * PUT /api/user
 */
export async function updateUserProfile(
  request: FastifyRequest<{ Body: UserProfileUpdateRequest }>,
  reply: FastifyReply
) {
  try {
    // Extract user ID from JWT token
    const userId = request.user!.userId;
    
    const updatedProfile = await userProfileService.updateUserProfile(userId, request.body);
    return reply.status(200).send(updatedProfile);
  } catch (error) {
    request.log.error('Error updating user profile:', error);

    // Handle specific business logic errors
    if (error instanceof BusinessLogicError) {
      let statusCode = 500;
      let errorType = 'Internal Server Error';
      
      if (error.statusCode === 404) {
        statusCode = 404;
        errorType = 'Not Found';
      } else if (error.statusCode === 409) {
        statusCode = 409;
        errorType = 'Conflict';
      } else if (error.statusCode >= 400 && error.statusCode < 500) {
        statusCode = 400;
        errorType = 'Bad Request';
      }
      
      return reply.status(statusCode).send({
        error: errorType,
        message: error.message
      });
    }

    if (error instanceof ValidationError) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message
      });
    }

    // Handle Prisma/database errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'Email address is already in use'
        });
      }
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to update user profile'
    });
  }
} 