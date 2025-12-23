import apiClientWithRetry from '@/lib/api-client-with-retry';
import {
  ApiResponse,
  JobApplication,
  GetJobApplicationsRequest,
  GetJobApplicationsResponse,
  CreateJobApplicationRequest,
  UpdateJobApplicationRequest,
} from '@/types';
import { FilterState } from '@/types/filters';
import { convertFiltersToApiParams } from '@/lib/utils/filter-converter';

export class JobApplicationsService {
  private static readonly ENDPOINT = '/applications';

  /**
   * Fetch all job applications with optional filtering and pagination
   * @param params - Direct API parameters
   */
  static async getJobApplications(
    params?: GetJobApplicationsRequest
  ): Promise<GetJobApplicationsResponse>;

  /**
   * Fetch all job applications using FilterState with optional pagination
   * @param filters - Filter state from FilterContext
   * @param page - Current page (optional)
   * @param limit - Items per page (optional)
   */
  static async getJobApplications(
    filters: FilterState,
    page?: number,
    limit?: number
  ): Promise<GetJobApplicationsResponse>;

  // Implementation
  static async getJobApplications(
    paramsOrFilters?: GetJobApplicationsRequest | FilterState,
    page?: number,
    limit?: number
  ): Promise<GetJobApplicationsResponse> {
    let apiParams: GetJobApplicationsRequest;

    // Default to empty object if no parameters provided
    const params = paramsOrFilters || {};

    // Check if first parameter is FilterState by checking for FilterState-specific properties
    if ('companies' in params && Array.isArray(params.companies)) {
      // It's FilterState, convert it to API parameters
      apiParams = convertFiltersToApiParams(params as FilterState, page, limit);
    } else {
      // It's already GetJobApplicationsRequest
      apiParams = params as GetJobApplicationsRequest;
    }

    const response = await apiClientWithRetry.get<
      ApiResponse<GetJobApplicationsResponse>
    >(this.ENDPOINT, { params: apiParams });
    
    return response.data.data;
  }

  /**
   * Fetch a single job application by ID
   */
  static async getJobApplicationById(id: number): Promise<JobApplication> {
    const response = await apiClientWithRetry.get<ApiResponse<JobApplication>>(
      `${this.ENDPOINT}/${id}`
    );
    return response.data.data;
  }

  /**
   * Create a new job application
   */
  static async createJobApplication(
    data: CreateJobApplicationRequest
  ): Promise<JobApplication> {
    const response = await apiClientWithRetry.post<ApiResponse<JobApplication>>(
      this.ENDPOINT,
      data
    );
    return response.data.data;
  }

  /**
   * Update an existing job application
   */
  static async updateJobApplication(
    data: UpdateJobApplicationRequest
  ): Promise<JobApplication> {
    const { id, ...updateData } = data;
    const response = await apiClientWithRetry.put<ApiResponse<JobApplication>>(
      `${this.ENDPOINT}/${id}`,
      updateData
    );
    return response.data.data;
  }

  /**
   * Delete a job application
   */
  static async deleteJobApplication(id: number): Promise<void> {
    await apiClientWithRetry.delete(`${this.ENDPOINT}/${id}`);
  }

  /**
   * Get job application statistics/summary
   */
  static async getJobApplicationStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    recentApplications: number;
  }> {
    const response = await apiClientWithRetry.get<
      ApiResponse<{
        total: number;
        byStatus: Record<string, number>;
        byType: Record<string, number>;
        recentApplications: number;
      }>
    >(`${this.ENDPOINT}/stats`);
    return response.data.data;
  }
}

// Export individual functions for easier importing
export const {
  getJobApplications,
  getJobApplicationById,
  createJobApplication,
  updateJobApplication,
  deleteJobApplication,
  getJobApplicationStats,
} = JobApplicationsService;
