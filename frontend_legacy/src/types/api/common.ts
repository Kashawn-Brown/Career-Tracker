// Base API response structure
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Error response structure
export interface ApiError {
  status: number;
  message: string;
  data: unknown;
}

// Loading and error state types
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
} 