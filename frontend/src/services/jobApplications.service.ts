import apiClientWithRetry from '@/lib/api-client-with-retry';
import {
  ApiResponse,
  JobApplication,
  GetJobApplicationsRequest,
  GetJobApplicationsResponse,
  CreateJobApplicationRequest,
  UpdateJobApplicationRequest,
} from '@/types';

export class JobApplicationsService {
  private static readonly ENDPOINT = '/job-applications';

  /**
   * Fetch all job applications with optional filtering and pagination
   */
  static async getJobApplications(
    params: GetJobApplicationsRequest = {}
  ): Promise<GetJobApplicationsResponse> {
    const response = await apiClientWithRetry.get<
      ApiResponse<GetJobApplicationsResponse>
    >(this.ENDPOINT, { params });
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
