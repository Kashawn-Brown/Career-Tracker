/**
 * Base Repository Class
 * 
 * Provides generic CRUD operations and common functionality for all repositories.
 * Includes transaction support, error handling, and logging.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

// Interface for pagination parameters when querying data
export interface PaginationOptions {
  page?: number;    // Current page number (optional, defaults handled in implementation)
  limit?: number;   // Number of records per page (optional, defaults handled in implementation)
}

// Interface for paginated query results with metadata
export interface PaginatedResult<T> {
  data: T[];        // Array of records for the current page
  total: number;    // Total number of records across all pages
  page: number;     // Current page number
  limit: number;    // Number of records per page used in this query
  totalPages: number; // Total number of pages available
}

// Interface for sorting options when querying data
export interface SortOptions {
  field: string;              // Name of the field to sort by
  direction: 'asc' | 'desc';  // Sort direction: ascending or descending
}

// Abstract base repository class providing common CRUD operations for all entity repositories
export abstract class BaseRepository<T, CreateInput, UpdateInput, WhereInput> {
  protected prisma: PrismaClient;  // Prisma client instance for database operations
  protected modelName: string;     // Name of the Prisma model this repository manages

  constructor(modelName: string) {
    this.prisma = prisma;          // Initialize with shared Prisma client instance
    this.modelName = modelName;    // Store model name for dynamic Prisma operations
  }


  /**
   * Create a new record - (generic create method) - This allows any repository extending this base class to inherit standardized record creation functionality
   * @param data - The data to create the record with
   * @param tx - Optional transaction client to use for the operation
   * @returns The created record
   */
  async create(data: CreateInput, tx?: Prisma.TransactionClient): Promise<T> {
    try {
      // Use transaction client if provided, otherwise use default prisma client
      const client = tx || this.prisma;
      
      // Dynamically access the Prisma model and create a new record with the provided data
      const result = await (client as any)[this.modelName].create({
        data,
      });
      
      // Return the newly created record
      return result;
      
    } catch (error) {
      // Handle and log the error using the base error handler
      this.handleError('create', error);
      throw error;
    }
  }


  /**
   * Find a record by ID - (generic find method) - This allows any repository extending this base class to inherit standardized record retrieval functionality
   * @param id - The ID of the record to find
   * @param include - Optional Prisma include options to include related records
   * @param tx - Optional transaction client to use for the operation
   * @returns The found record or null if not found
   */
  async findById(id: number, include?: any, tx?: Prisma.TransactionClient): Promise<T | null> {
    try {
      // Use transaction client if provided, otherwise use default prisma client
      const client = tx || this.prisma;
      
      // Dynamically access the Prisma model and find a unique record by ID
      const result = await (client as any)[this.modelName].findUnique({
        where: { id },    // Filter by the provided ID
        include,          // Include related records if specified
      });

      // Return the found record (or null if not found)
      return result;

    } catch (error) {
      this.handleError('findById', error);
      throw error;
    }
  }


  /**
   * Find multiple records with optional filtering, sorting, and pagination - (generic findMany method) - This allows any repository extending this base class to inherit standardized record retrieval functionality
   * @param where - Optional Prisma where options to filter records
   * @param options - Optional options for including related records, sorting, and pagination
   * @param tx - Optional transaction client to use for the operation
   * @returns An array of records matching the criteria
   */
  async findMany(
    where?: WhereInput,
    options?: {
      include?: any;
      orderBy?: any;
      pagination?: PaginationOptions;
    },
    tx?: Prisma.TransactionClient
  ): Promise<T[]> {
    try {
      // Use transaction client if provided, otherwise use default prisma client
      const client = tx || this.prisma;
      const { include, orderBy, pagination } = options || {};
      
      // Build base query options with filtering, includes, and sorting
      const queryOptions: any = {
        where,
        include,
        orderBy,
      };

      // Add pagination if specified (skip/take pattern)
      if (pagination) {
        const { page = 1, limit = 10 } = pagination;
        queryOptions.skip = (page - 1) * limit;
        queryOptions.take = limit;
      }

      // Execute the query using the dynamic model name
      const result = await (client as any)[this.modelName].findMany(queryOptions);
      return result;

    } catch (error) {
      this.handleError('findMany', error);
      throw error;
    }
  }

  /**
   * Find multiple records with pagination metadata - (generic findManyWithPagination method) - This allows any repository extending this base class to inherit standardized record retrieval functionality with pagination
   * @param where - Optional Prisma where options to filter records
   * @param options - Optional options for including related records, sorting, and pagination
   * @param tx - Optional transaction client to use for the operation
   * @returns A paginated result containing the records, total count, and pagination metadata
   */
  async findManyWithPagination(
    where?: WhereInput,
    options?: {
      include?: any;
      orderBy?: any;
      pagination?: PaginationOptions;
    },
    tx?: Prisma.TransactionClient
  ): Promise<PaginatedResult<T>> {
    try {
      // Use transaction client if provided, otherwise use default prisma client
      const client = tx || this.prisma;
      
      // Extract include, orderBy, and pagination options from the options parameter
      const { include, orderBy, pagination = { page: 1, limit: 10 } } = options || {};
      const { page = 1, limit = 10 } = pagination;

      // Execute both data retrieval and count queries in parallel for better performance
      const [data, total] = await Promise.all([
        this.findMany(where, { include, orderBy, pagination }, tx),
        this.count(where, tx),
      ]);

      // Return paginated result with metadata
      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };

    } catch (error) {
      this.handleError('findManyWithPagination', error);
      throw error;
    }
  }

  /**
   * Find first record matching criteria - (generic findFirst method) - This allows any repository extending this base class to inherit standardized record retrieval functionality
   * @param where - Optional Prisma where options to filter records
   * @param options - Optional options for including related records, sorting
   * @param tx - Optional transaction client to use for the operation
   * @returns The first record matching the criteria or null if not found
   */
  async findFirst(
    where?: WhereInput,
    options?: {
      include?: any;
      orderBy?: any;
    },
    tx?: Prisma.TransactionClient
  ): Promise<T | null> {
    try {
      // Use transaction client if provided, otherwise use default prisma client
      const client = tx || this.prisma;
      
      // Extract include and orderBy options from the options parameter
      const { include, orderBy } = options || {};
      
      // Execute findFirst query with the specified criteria
      const result = await (client as any)[this.modelName].findFirst({
        where,
        include,
        orderBy,
      });
      // Return the first matching record or null if none found
      return result;
      
    } catch (error) {
      this.handleError('findFirst', error);
      throw error;
    }
  }

  /**
   * Update a record by ID - (generic update method) - This allows any repository extending this base class to inherit standardized record update functionality
   * @param id - The ID of the record to update
   * @param data - The data to update the record with
   * @param include - Optional Prisma include options to include related records
   * @param tx - Optional transaction client to use for the operation
   * @returns The updated record
   */
  async update(
    id: number,
    data: UpdateInput,
    include?: any,
    tx?: Prisma.TransactionClient
  ): Promise<T> {
    try {
      // Use transaction client if provided, otherwise use default prisma client
      const client = tx || this.prisma;
      
      // Execute update query with the specified ID, data, and include options
      const result = await (client as any)[this.modelName].update({
        where: { id },
        data,
        include,
      });
      
      // Return the updated record
      return result;

    } catch (error) {
      // Handle and log the error using the base error handler
      this.handleError('update', error);
      throw error;
    }
  }

  /**
   * Update multiple records - (generic updateMany method) - This allows any repository extending this base class to inherit standardized record update functionality
   * @param where - Optional Prisma where options to filter records
   * @param data - The data to update the records with
   * @param tx - Optional transaction client to use for the operation
   * @returns The number of records updated
   */
  async updateMany(
    where: WhereInput,
    data: Partial<UpdateInput>,
    tx?: Prisma.TransactionClient
  ): Promise<{ count: number }> {
    try {
      // Use transaction client if provided, otherwise use default prisma client
      const client = tx || this.prisma;
      
      // Execute updateMany query with the specified where conditions and data
      const result = await (client as any)[this.modelName].updateMany({
        where,
        data,
      });
      
      // Return the result containing the count of updated records
      return result;
      
    } catch (error) {
      // Handle and log the error using the base error handler
      this.handleError('updateMany', error);
      throw error;
    }
  }

  /**
   * Delete a record by ID - (generic delete method) - This allows any repository extending this base class to inherit standardized record deletion functionality
   * @param id - The ID of the record to delete
   * @param tx - Optional transaction client to use for the operation
   * @returns The deleted record
   */
  async delete(id: number, tx?: Prisma.TransactionClient): Promise<T> {
    try {
      // Use transaction client if provided, otherwise use default prisma client
      const client = tx || this.prisma;
      
      // Execute delete query with the specified ID
      const result = await (client as any)[this.modelName].delete({
        where: { id },
      });
      
      // Return the deleted record
      return result;
      
    } catch (error) {
      this.handleError('delete', error);
      throw error;
    }
  }

  /**
   * Delete multiple records - (generic deleteMany method) - This allows any repository extending this base class to inherit standardized record deletion functionality
   * @param where - Optional Prisma where options to filter records
   * @param tx - Optional transaction client to use for the operation
   * @returns The number of records deleted
   */
  async deleteMany(where: WhereInput, tx?: Prisma.TransactionClient): Promise<{ count: number }> {
    try {
      // Use transaction client if provided, otherwise use default prisma client
      const client = tx || this.prisma;
      
      // Execute deleteMany query with the specified where conditions
      const result = await (client as any)[this.modelName].deleteMany({
        where,
      });
      
      // Return the result containing the count of deleted records
      return result;
      
    } catch (error) {
      // Handle and log the error using the base error handler
      this.handleError('deleteMany', error);
      throw error;
    }
  }

  /**
   * Count records matching criteria - (generic count method) - This allows any repository extending this base class to inherit standardized record counting functionality
   * @param where - Optional Prisma where options to filter records
   * @param tx - Optional transaction client to use for the operation
   * @returns The number of records matching the criteria
   */
  async count(where?: WhereInput, tx?: Prisma.TransactionClient): Promise<number> {
    try {
      // Use transaction client if provided, otherwise use default prisma client
      const client = tx || this.prisma;
      
      // Execute count query with the specified where conditions
      const result = await (client as any)[this.modelName].count({
        where,
      });
      
      // Return the count of records matching the criteria
      return result;
      
    } catch (error) {
      // Handle and log the error using the base error handler
      this.handleError('count', error);
      throw error;
    }
  }

  /**
   * Check if a record exists - (generic exists method) - This allows any repository extending this base class to inherit standardized record existence checking functionality
   * @param where - Optional Prisma where options to filter records
   * @param tx - Optional transaction client to use for the operation
   * @returns True if a record exists, false otherwise
   */
  async exists(where: WhereInput, tx?: Prisma.TransactionClient): Promise<boolean> {
    try {
      // Get the count of records matching the where conditions
      const count = await this.count(where, tx);
      
      // Return true if any records exist (count > 0), false otherwise
      return count > 0;

    } catch (error) {
      // Handle and log the error using the base error handler
      this.handleError('exists', error);
      throw error;
    }
  }

  /**
   * Upsert (create or update) a record - (generic upsert method) - This allows any repository extending this base class to inherit standardized record upsert functionality
   * @param where - The where conditions for the record
   * @param create - The data to create the record with
   * @param update - The data to update the record with
   * @param include - Optional Prisma include options to include related records
   * @param tx - Optional transaction client to use for the operation
   * @returns The upserted record
   */
  async upsert(
    where: { id: number },
    create: CreateInput,
    update: UpdateInput,
    include?: any,
    tx?: Prisma.TransactionClient
  ): Promise<T> {
    try {
      // Use the provided transaction client or fall back to the default Prisma client
      const client = tx || this.prisma;
      
      // Perform the upsert operation using the dynamic model name - (calling Prisma's native upsert method)
      const result = await (client as any)[this.modelName].upsert({
        where,   // Conditions to find existing record
        create,  // Data to create if record doesn't exist
        update,  // Data to update if record exists
        include, // Related records to include in the response
      });
      
      // Return the upserted record
      return result;

    } catch (error) {
      // Handle and log the error using the base error handler
      this.handleError('upsert', error);
      throw error;
    }
  }

  /**
   * Execute a transaction - (generic transaction method) - This allows any repository extending this base class to inherit standardized transaction functionality
   * @param callback - The callback function that will be executed within the transaction
   * @returns The result of the callback function
   */
  async transaction<R>(
    callback: (tx: Prisma.TransactionClient) => Promise<R>
  ): Promise<R> {
    try {
      // Execute the callback function within a Prisma transaction
      return await this.prisma.$transaction(callback);

      /**
       * The tx parameter you see in other methods (like upsert, create, etc.) is the Prisma.TransactionClient that gets passed from this transaction method's callback.
       * When you call transaction(), it provides the tx client to your callback function, 
       * which you then pass to individual repository methods to ensure they all run within the same transaction scope.
       */
    
      // Executes multiple database operations as a single atomic transaction
      // If any operation fails, all changes are rolled back

    } catch (error) {
      // Handle and log the transaction error using the base error handler
      this.handleError('transaction', error);
      throw error;
    }
  }

  /**
   * Handle and log errors - (generic error handling method) - This allows any repository extending this base class to inherit standardized error handling functionality
   * @param operation - The operation that failed
   * @param error - The error object
   */
  protected handleError(operation: string, error: any): void {
    const errorMessage = `${this.modelName} Repository - ${operation} failed`;
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(`${errorMessage}: ${error.code} - ${error.message}`);
    } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      console.error(`${errorMessage}: Unknown database error - ${error.message}`);
    } else if (error instanceof Prisma.PrismaClientRustPanicError) {
      console.error(`${errorMessage}: Database panic - ${error.message}`);
    } else if (error instanceof Prisma.PrismaClientInitializationError) {
      console.error(`${errorMessage}: Database initialization error - ${error.message}`);
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      console.error(`${errorMessage}: Validation error - ${error.message}`);
    } else {
      console.error(`${errorMessage}: ${error.message || error}`);
    }
  }
} 