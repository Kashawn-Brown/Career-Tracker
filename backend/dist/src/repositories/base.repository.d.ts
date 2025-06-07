/**
 * Base Repository Class
 *
 * Provides generic CRUD operations and common functionality for all repositories.
 * Includes transaction support, error handling, and logging.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { PaginationOptions, PaginatedResult } from '../models/repository.models.js';
export declare abstract class BaseRepository<T, CreateInput, UpdateInput, WhereInput> {
    protected prisma: PrismaClient;
    protected modelName: string;
    constructor(modelName: string);
    /**
     * Create a new record - (generic create method) - This allows any repository extending this base class to inherit standardized record creation functionality
     * @param data - The data to create the record with
     * @param tx - Optional transaction client to use for the operation
     * @returns The created record
     */
    create(data: CreateInput, tx?: Prisma.TransactionClient): Promise<T>;
    /**
     * Find a record by ID - (generic find method) - This allows any repository extending this base class to inherit standardized record retrieval functionality
     * @param id - The ID of the record to find
     * @param include - Optional Prisma include options to include related records
     * @param tx - Optional transaction client to use for the operation
     * @returns The found record or null if not found
     */
    findById(id: number, include?: any, tx?: Prisma.TransactionClient): Promise<T | null>;
    /**
     * Find multiple records with optional filtering, sorting, and pagination - (generic findMany method) - This allows any repository extending this base class to inherit standardized record retrieval functionality
     * @param where - Optional Prisma where options to filter records
     * @param options - Optional options for including related records, sorting, and pagination
     * @param tx - Optional transaction client to use for the operation
     * @returns An array of records matching the criteria
     */
    findMany(where?: WhereInput, options?: {
        include?: any;
        orderBy?: any;
        pagination?: PaginationOptions;
    }, tx?: Prisma.TransactionClient): Promise<T[]>;
    /**
     * Find multiple records with pagination metadata - (generic findManyWithPagination method) - This allows any repository extending this base class to inherit standardized record retrieval functionality with pagination
     * @param where - Optional Prisma where options to filter records
     * @param options - Optional options for including related records, sorting, and pagination
     * @param tx - Optional transaction client to use for the operation
     * @returns A paginated result containing the records, total count, and pagination metadata
     */
    findManyWithPagination(where?: WhereInput, options?: {
        include?: any;
        orderBy?: any;
        pagination?: PaginationOptions;
    }, tx?: Prisma.TransactionClient): Promise<PaginatedResult<T>>;
    /**
     * Find first record matching criteria - (generic findFirst method) - This allows any repository extending this base class to inherit standardized record retrieval functionality
     * @param where - Optional Prisma where options to filter records
     * @param options - Optional options for including related records, sorting
     * @param tx - Optional transaction client to use for the operation
     * @returns The first record matching the criteria or null if not found
     */
    findFirst(where?: WhereInput, options?: {
        include?: any;
        orderBy?: any;
    }, tx?: Prisma.TransactionClient): Promise<T | null>;
    /**
     * Update a record by ID - (generic update method) - This allows any repository extending this base class to inherit standardized record update functionality
     * @param id - The ID of the record to update
     * @param data - The data to update the record with
     * @param include - Optional Prisma include options to include related records
     * @param tx - Optional transaction client to use for the operation
     * @returns The updated record
     */
    update(id: number, data: UpdateInput, include?: any, tx?: Prisma.TransactionClient): Promise<T>;
    /**
     * Update multiple records - (generic updateMany method) - This allows any repository extending this base class to inherit standardized record update functionality
     * @param where - Optional Prisma where options to filter records
     * @param data - The data to update the records with
     * @param tx - Optional transaction client to use for the operation
     * @returns The number of records updated
     */
    updateMany(where: WhereInput, data: Partial<UpdateInput>, tx?: Prisma.TransactionClient): Promise<{
        count: number;
    }>;
    /**
     * Delete a record by ID - (generic delete method) - This allows any repository extending this base class to inherit standardized record deletion functionality
     * @param id - The ID of the record to delete
     * @param tx - Optional transaction client to use for the operation
     * @returns The deleted record
     */
    delete(id: number, tx?: Prisma.TransactionClient): Promise<T>;
    /**
     * Delete multiple records - (generic deleteMany method) - This allows any repository extending this base class to inherit standardized record deletion functionality
     * @param where - Optional Prisma where options to filter records
     * @param tx - Optional transaction client to use for the operation
     * @returns The number of records deleted
     */
    deleteMany(where: WhereInput, tx?: Prisma.TransactionClient): Promise<{
        count: number;
    }>;
    /**
     * Count records matching criteria - (generic count method) - This allows any repository extending this base class to inherit standardized record counting functionality
     * @param where - Optional Prisma where options to filter records
     * @param tx - Optional transaction client to use for the operation
     * @returns The number of records matching the criteria
     */
    count(where?: WhereInput, tx?: Prisma.TransactionClient): Promise<number>;
    /**
     * Check if a record exists - (generic exists method) - This allows any repository extending this base class to inherit standardized record existence checking functionality
     * @param where - Optional Prisma where options to filter records
     * @param tx - Optional transaction client to use for the operation
     * @returns True if a record exists, false otherwise
     */
    exists(where: WhereInput, tx?: Prisma.TransactionClient): Promise<boolean>;
    /**
     * Upsert (create or update) a record - (generic upsert method) - This allows any repository extending this base class to inherit standardized record upsert functionality
     * @param where - The where conditions for the record
     * @param create - The data to create the record with
     * @param update - The data to update the record with
     * @param include - Optional Prisma include options to include related records
     * @param tx - Optional transaction client to use for the operation
     * @returns The upserted record
     */
    upsert(where: {
        id: number;
    }, create: CreateInput, update: UpdateInput, include?: any, tx?: Prisma.TransactionClient): Promise<T>;
    /**
     * Execute a transaction - (generic transaction method) - This allows any repository extending this base class to inherit standardized transaction functionality
     * @param callback - The callback function that will be executed within the transaction
     * @returns The result of the callback function
     */
    transaction<R>(callback: (tx: Prisma.TransactionClient) => Promise<R>): Promise<R>;
    /**
     * Handle and log errors - (generic error handling method) - This allows any repository extending this base class to inherit standardized error handling functionality
     * @param operation - The operation that failed
     * @param error - The error object
     */
    protected handleError(operation: string, error: any): void;
}
//# sourceMappingURL=base.repository.d.ts.map