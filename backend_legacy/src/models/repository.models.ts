/**
 * Repository Models
 * 
 * Defines common TypeScript interfaces and types used across repositories.
 * These models represent shared structures for database operations.
 */

/**
 * Interface for pagination parameters when querying data
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
}

/**
 * Interface for paginated query results with metadata
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Interface for sorting options when querying data
 */
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
} 