/**
 * User Profile Service
 * 
 * Business logic layer for user profile operations.
 * Handles validation, business rules, and coordinates repository calls.
 */

import { repositories } from '../repositories/index.js';
import { userProfileValidation } from '../schemas/user-profile.schema.js';
import { BusinessLogicError, ValidationError } from '../middleware/error.middleware.js';
import type { UserProfileUpdateRequest } from '../schemas/user-profile.schema.js';

export class UserProfileService {
  /**
   * Get user profile by user ID
   */
  async getUserProfile(userId: number) {
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    const user = await repositories.user.findById(userId);
    
    if (!user) {
      throw new BusinessLogicError('User not found', 404);
    }

    // Return only profile-relevant fields
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      bio: user.bio,
      skills: user.skills as string[] || [], // JSON field conversion
      location: user.location,
      currentJobTitle: user.currentJobTitle,
      githubLink: user.githubLink,
      linkedinLink: user.linkedinLink,
      resumeLink: user.resumeLink
    };
  }

  /**
   * Update user profile with business validation
   */
  async updateUserProfile(userId: number, data: UserProfileUpdateRequest) {
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Check if user exists
    const existingUser = await repositories.user.findById(userId);
    if (!existingUser) {
      throw new BusinessLogicError('User not found', 404);
    }

    // Sanitize the input data
    const sanitizedData = userProfileValidation.sanitizeUpdateData(data);

    // Validate business rules
    this.validateUpdateData(sanitizedData);

    try {
      // Update the user profile using the repository
      const updatedUser = await repositories.user.updateProfile(userId, sanitizedData);

      // Return formatted response (same format as getUserProfile)
      return {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        bio: updatedUser.bio,
        skills: updatedUser.skills as string[] || [],
        location: updatedUser.location,
        currentJobTitle: updatedUser.currentJobTitle,
        githubLink: updatedUser.githubLink,
        linkedinLink: updatedUser.linkedinLink,
        resumeLink: updatedUser.resumeLink
      };
    } catch (error) {
      // Handle Prisma errors
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        throw new BusinessLogicError('Email address is already in use', 409);
      }
      throw error;
    }
  }

  /**
   * Validate update data according to business rules
   */
  private validateUpdateData(data: any) {
    // Validate name if provided
    if (data.name !== undefined) {
      if (!data.name?.trim()) {
        throw new ValidationError('Name cannot be empty');
      }
      if (data.name.length > 100) {
        throw new ValidationError('Name cannot exceed 100 characters');
      }
    }

    // Validate phone if provided
    if (data.phone !== undefined && data.phone !== null) {
      if (data.phone.length > 20) {
        throw new ValidationError('Phone number cannot exceed 20 characters');
      }
    }

    // Validate bio if provided
    if (data.bio !== undefined && data.bio !== null) {
      if (data.bio.length > 1000) {
        throw new ValidationError('Bio cannot exceed 1000 characters');
      }
    }

    // Validate skills if provided
    if (data.skills !== undefined && data.skills !== null) {
      if (!Array.isArray(data.skills)) {
        throw new ValidationError('Skills must be an array');
      }
      if (data.skills.length > 20) {
        throw new ValidationError('Cannot have more than 20 skills');
      }
      data.skills.forEach((skill: any, index: number) => {
        if (typeof skill !== 'string') {
          throw new ValidationError(`Skill at index ${index} must be a string`);
        }
        if (skill.length > 50) {
          throw new ValidationError(`Skill "${skill}" cannot exceed 50 characters`);
        }
      });
    }

    // Validate location if provided
    if (data.location !== undefined && data.location !== null) {
      if (data.location.length > 100) {
        throw new ValidationError('Location cannot exceed 100 characters');
      }
    }

    // Validate current job title if provided
    if (data.currentJobTitle !== undefined && data.currentJobTitle !== null) {
      if (data.currentJobTitle.length > 100) {
        throw new ValidationError('Current job title cannot exceed 100 characters');
      }
    }

    // Validate GitHub URL if provided
    if (data.githubLink !== undefined && data.githubLink !== null) {
      if (!userProfileValidation.isValidGithubUrl(data.githubLink)) {
        throw new ValidationError('Invalid GitHub URL format');
      }
    }

    // Validate LinkedIn URL if provided
    if (data.linkedinLink !== undefined && data.linkedinLink !== null) {
      if (!userProfileValidation.isValidLinkedinUrl(data.linkedinLink)) {
        throw new ValidationError('Invalid LinkedIn URL format');
      }
    }

    // Validate resume URL if provided
    if (data.resumeLink !== undefined && data.resumeLink !== null) {
      if (!userProfileValidation.isValidUrl(data.resumeLink)) {
        throw new ValidationError('Invalid resume URL format');
      }
    }
  }
} 