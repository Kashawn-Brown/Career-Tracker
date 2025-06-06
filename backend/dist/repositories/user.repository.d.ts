/**
 * User Repository
 *
 * Handles all database operations related to users.
 * Extends BaseRepository with user-specific methods.
 */
import { User, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';
export type UserWithRelations = User & {
    contacts?: any[];
    jobApplications?: any[];
};
export declare class UserRepository extends BaseRepository<User, Prisma.UserCreateInput, Prisma.UserUpdateInput, Prisma.UserWhereInput> {
    constructor();
    /**
     * Find user by email
     */
    findByEmail(email: string, tx?: Prisma.TransactionClient): Promise<User | null>;
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
    findByIdWithRelations(id: number, tx?: Prisma.TransactionClient): Promise<UserWithRelations | null>;
    /**
     * Find user with job applications only
     *
     * Retrieves a user by ID along with their job applications:
     * - Job Applications: ordered by application date (newest first), including:
     *   - Associated tags
     *   - Related documents
     *   - Job connections/referrals
     */
    findByIdWithJobApplications(id: number, tx?: Prisma.TransactionClient): Promise<UserWithRelations | null>;
    /**
     * Find user with contacts only
     *
     * Retrieves a user by ID along with their contacts:
     * - Contacts: ordered by creation date (newest first)
     */
    findByIdWithContacts(id: number, tx?: Prisma.TransactionClient): Promise<UserWithRelations | null>;
    /**
     * Check if email is already taken
     *
     * Checks if a given email is already associated with an existing user record.
     *
     * @param email - The email to check
     * @param excludeUserId - Optional ID of the user to exclude from the check
     * @param tx - Optional transaction client to use for the operation
     */
    isEmailTaken(email: string, excludeUserId?: number, tx?: Prisma.TransactionClient): Promise<boolean>;
    /**
     * Update user profile
     *
     * Updates the profile information for a user.
     *
     * @param id - The ID of the user to update
     * @param data - The data to update the user with
     * @param tx - Optional transaction client to use for the operation
     */
    updateProfile(id: number, data: {
        name?: string;
        resumeLink?: string;
        githubLink?: string;
        linkedinLink?: string;
    }, tx?: Prisma.TransactionClient): Promise<User>;
    /**
     * Get user statistics
     *
     * Retrieves statistics for a user's job applications and contacts:
     * - Total number of job applications
     * - Total number of contacts
     * - Applications grouped by status
     * - Number of recent applications (last 30 days)
     */
    getUserStats(userId: number, tx?: Prisma.TransactionClient): Promise<{
        totalJobApplications: number;
        totalContacts: number;
        applicationsByStatus: {
            status: string;
            count: number;
        }[];
        recentApplications: number;
    }>;
    /**
     * Search users by name or email
     *
     * Searches for users by name or email, with optional pagination.
     *
     * @param query - The search query (name or email)
     * @param options - Optional pagination options
     * @param tx - Optional transaction client to use for the operation
     */
    searchUsers(query: string, options?: {
        pagination?: {
            page?: number;
            limit?: number;
        };
    }, tx?: Prisma.TransactionClient): Promise<User[]>;
}
//# sourceMappingURL=user.repository.d.ts.map