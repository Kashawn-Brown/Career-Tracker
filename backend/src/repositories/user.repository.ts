/**
 * User Repository
 * 
 * Handles all database operations related to users.
 * Extends BaseRepository with user-specific methods.
 */

import { User, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository.js';

// Type definition for User with optional related entities
export type UserWithRelations = User & {
  contacts?: any[];
  jobApplications?: any[];
};

// User repository class extending BaseRepository with User-specific methods
export class UserRepository extends BaseRepository<
  User,
  Prisma.UserCreateInput,
  Prisma.UserUpdateInput,
  Prisma.UserWhereInput
> {
  // Constructor for UserRepository, passing 'user' as the model name
  constructor() {
    super('user');
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    return this.findFirst({ email }, undefined, tx);
  }


  /**
   * Find user with all relations
   * 
   * Retrieves a user by ID along with their complete relational data:
   * - Contacts: ordered by creation date (newest first)
   * - Job Applications: ordered by application date (newest first), including:
   *   - Associated tags
   *   - Related documents
   *   - Job connections/referrals
   * 
   * This method provides a comprehensive view of the user's data for dashboard
   * or profile pages where all related information needs to be displayed.
   */
  async findByIdWithRelations(id: number, tx?: Prisma.TransactionClient): Promise<UserWithRelations | null> {
    return this.findById(
      id,
      {
        contacts: {
          orderBy: { createdAt: 'desc' },
        },
        jobApplications: {
          orderBy: { dateApplied: 'desc' },
          include: {
            tags: true,
            documents: true,
            jobConnections: true,
          },
        },
      },
      tx
    );
  }


  /**
   * Find user with job applications only
   * 
   * Retrieves a user by ID along with their job applications:
   * - Job Applications: ordered by application date (newest first), including:
   *   - Associated tags
   *   - Related documents
   *   - Job connections/referrals
   */
  async findByIdWithJobApplications(id: number, tx?: Prisma.TransactionClient): Promise<UserWithRelations | null> {
    return this.findById(
      id,
      {
        jobApplications: {
          orderBy: { dateApplied: 'desc' },
          include: {
            tags: true,
            documents: true,
            jobConnections: true,
          },
        },
      },
      tx
    );
  }


  /**
   * Find user with contacts only
   * 
   * Retrieves a user by ID along with their contacts:
   * - Contacts: ordered by creation date (newest first)
   */
  async findByIdWithContacts(id: number, tx?: Prisma.TransactionClient): Promise<UserWithRelations | null> {
    return this.findById(
      id,
      {
        contacts: {
          orderBy: { createdAt: 'desc' },
        },
      },
      tx
    );
  }


  /**
   * Check if email is already taken
   * 
   * Checks if a given email is already associated with an existing user record.
   * 
   * @param email - The email to check
   * @param excludeUserId - Optional ID of the user to exclude from the check
   * @param tx - Optional transaction client to use for the operation
   */
  async isEmailTaken(email: string, excludeUserId?: number, tx?: Prisma.TransactionClient): Promise<boolean> {
    // Build the where clause to search for users with the given email
    const where: Prisma.UserWhereInput = { email };
    
    // If we need to exclude a specific user (e.g., when updating an existing user's email),
    // add a NOT condition to exclude that user ID from the search
    if (excludeUserId) {
      where.NOT = { id: excludeUserId };
    }

    // Check if any user exists matching the where conditions
    return this.exists(where, tx);
  }


  /**
   * Update user profile
   * 
   * Updates the profile information for a user.
   * 
   * @param id - The ID of the user to update
   * @param data - The data to update the user with
   * @param tx - Optional transaction client to use for the operation
   */
  async updateProfile(
    id: number,
    data: {
      name?: string;
      resumeLink?: string;
      githubLink?: string;
      linkedinLink?: string;
    },
    tx?: Prisma.TransactionClient
  ): Promise<User> {
    return this.update(id, data, undefined, tx);
  }


  /**
   * Get user statistics
   * 
   * Retrieves statistics for a user's job applications and contacts:
   * - Total number of job applications
   * - Total number of contacts
   * - Applications grouped by status
   * - Number of recent applications (last 30 days)
   */
  async getUserStats(userId: number, tx?: Prisma.TransactionClient): Promise<{
    totalJobApplications: number;
    totalContacts: number;
    applicationsByStatus: { status: string; count: number }[];
    recentApplications: number;
  }> {
    const client = tx || this.prisma;

    const [
      totalJobApplications,
      totalContacts,
      applicationsByStatus,
      recentApplications,
    ] = await Promise.all([
      client.jobApplication.count({ where: { userId } }),
      client.contact.count({ where: { userId } }),
      client.jobApplication.groupBy({
        by: ['status'],
        where: { userId },
        _count: { status: true },
      }),
      client.jobApplication.count({
        where: {
          userId,
          dateApplied: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
    ]);

    return {
      totalJobApplications,
      totalContacts,
      applicationsByStatus: applicationsByStatus.map(item => ({
        status: item.status,
        count: item._count.status,
      })),
      recentApplications,
    };
  }

  
  /**
   * Search users by name or email
   * 
   * Searches for users by name or email, with optional pagination.
   * 
   * @param query - The search query (name or email)
   * @param options - Optional pagination options
   * @param tx - Optional transaction client to use for the operation
   */
  async searchUsers(
    query: string,
    options?: {
      pagination?: { page?: number; limit?: number };
    },
    tx?: Prisma.TransactionClient
  ): Promise<User[]> {
    const where: Prisma.UserWhereInput = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    };

    return this.findMany(where, {
      orderBy: { name: 'asc' },
      pagination: options?.pagination,
    }, tx);
  }
} 