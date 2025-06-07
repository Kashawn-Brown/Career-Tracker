/**
 * Document Repository
 *
 * Handles all database operations related to documents.
 * Extends BaseRepository with document-specific methods.
 */
import { Document, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository.js';
export type DocumentWithRelations = Document & {
    jobApplication?: any;
};
export interface DocumentFilters {
    jobApplicationId?: number;
    type?: string;
    fileName?: string;
    fileSizeMin?: number;
    fileSizeMax?: number;
    createdAfter?: Date;
    createdBefore?: Date;
}
export declare class DocumentRepository extends BaseRepository<Document, Prisma.DocumentCreateInput, Prisma.DocumentUpdateInput, Prisma.DocumentWhereInput> {
    constructor();
    /**
     * Find document with job application relation
     */
    findByIdWithRelations(id: number, tx?: Prisma.TransactionClient): Promise<DocumentWithRelations | null>;
    /**
     * Find documents by job application
     */
    findByJobApplication(jobApplicationId: number, tx?: Prisma.TransactionClient): Promise<Document[]>;
    /**
     * Find documents by user (through job applications)
     */
    findByUser(userId: number, filters?: DocumentFilters, options?: {
        pagination?: {
            page?: number;
            limit?: number;
        };
        orderBy?: Prisma.DocumentOrderByWithRelationInput;
    }, tx?: Prisma.TransactionClient): Promise<DocumentWithRelations[]>;
    /**
     * Find documents by type
     */
    findByType(type: string, userId?: number, options?: {
        pagination?: {
            page?: number;
            limit?: number;
        };
    }, tx?: Prisma.TransactionClient): Promise<DocumentWithRelations[]>;
    /**
     * Search documents by filename
     */
    searchDocuments(query: string, userId?: number, options?: {
        pagination?: {
            page?: number;
            limit?: number;
        };
    }, tx?: Prisma.TransactionClient): Promise<DocumentWithRelations[]>;
    /**
     * Find documents by file extension
     */
    findByFileExtension(extension: string, userId?: number, tx?: Prisma.TransactionClient): Promise<DocumentWithRelations[]>;
    /**
     * Get document statistics for a user
     */
    getDocumentStats(userId: number, tx?: Prisma.TransactionClient): Promise<{
        total: number;
        byType: {
            type: string;
            count: number;
        }[];
        byFileExtension: {
            extension: string;
            count: number;
        }[];
        totalSize: number;
        averageSize: number;
        recentUploads: number;
    }>;
    /**
     * Find large documents
     */
    findLargeDocuments(minSizeBytes: number, userId?: number, tx?: Prisma.TransactionClient): Promise<DocumentWithRelations[]>;
    /**
     * Find recent documents
     */
    findRecentDocuments(userId?: number, daysBack?: number, limit?: number, tx?: Prisma.TransactionClient): Promise<DocumentWithRelations[]>;
    /**
     * Update document metadata
     */
    updateMetadata(id: number, data: {
        fileName?: string;
        fileSize?: number;
        type?: string;
    }, tx?: Prisma.TransactionClient): Promise<Document>;
    /**
     * Build filters for where clause
     */
    private buildFiltersWhere;
}
//# sourceMappingURL=document.repository.d.ts.map