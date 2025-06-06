/**
 * Contact Repository
 *
 * Handles all database operations related to contacts.
 * Extends BaseRepository with contact-specific methods.
 */
import { Contact, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';
export type ContactWithRelations = Contact & {
    user?: any;
    jobConnections?: any[];
};
export interface ContactFilters {
    userId?: number;
    company?: string;
    role?: string;
    connectionType?: string;
    hasEmail?: boolean;
    hasPhone?: boolean;
    hasLinkedin?: boolean;
}
export declare class ContactRepository extends BaseRepository<Contact, Prisma.ContactCreateInput, Prisma.ContactUpdateInput, Prisma.ContactWhereInput> {
    constructor();
    /**
     * Find contact with all relations
     */
    findByIdWithRelations(id: number, tx?: Prisma.TransactionClient): Promise<ContactWithRelations | null>;
    /**
     * Find contacts by user with filters
     */
    findByUserWithFilters(userId: number, filters?: ContactFilters, options?: {
        pagination?: {
            page?: number;
            limit?: number;
        };
        orderBy?: Prisma.ContactOrderByWithRelationInput;
    }, tx?: Prisma.TransactionClient): Promise<ContactWithRelations[]>;
    /**
     * Find contacts by company
     */
    findByCompany(company: string, userId?: number, tx?: Prisma.TransactionClient): Promise<ContactWithRelations[]>;
    /**
     * Find contacts by connection type
     */
    findByConnectionType(connectionType: string, userId?: number, tx?: Prisma.TransactionClient): Promise<ContactWithRelations[]>;
    /**
     * Search contacts
     */
    searchContacts(query: string, userId?: number, options?: {
        pagination?: {
            page?: number;
            limit?: number;
        };
    }, tx?: Prisma.TransactionClient): Promise<ContactWithRelations[]>;
    /**
     * Find contact by email
     */
    findByEmail(email: string, userId?: number, tx?: Prisma.TransactionClient): Promise<Contact | null>;
    /**
     * Find contacts with LinkedIn profiles
     */
    findWithLinkedIn(userId?: number, tx?: Prisma.TransactionClient): Promise<ContactWithRelations[]>;
    /**
     * Get contact statistics for a user
     */
    getContactStats(userId: number, tx?: Prisma.TransactionClient): Promise<{
        total: number;
        byCompany: {
            company: string;
            count: number;
        }[];
        byConnectionType: {
            connectionType: string;
            count: number;
        }[];
        withEmail: number;
        withPhone: number;
        withLinkedIn: number;
    }>;
    /**
     * Update contact information
     */
    updateContactInfo(id: number, data: {
        name?: string;
        email?: string;
        phone?: string;
        company?: string;
        role?: string;
        linkedinUrl?: string;
        connectionType?: string;
        notes?: string;
    }, tx?: Prisma.TransactionClient): Promise<Contact>;
    /**
     * Build filters for where clause
     */
    private buildFiltersWhere;
}
//# sourceMappingURL=contact.repository.d.ts.map