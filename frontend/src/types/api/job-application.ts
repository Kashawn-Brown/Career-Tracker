import { JobApplication, JobApplicationStatus, JobApplicationType } from '../models/job-application';

// API request/response types for job applications
export interface GetJobApplicationsRequest {
  page?: number;
  limit?: number;
  status?: JobApplicationStatus;
  company?: string;
  sortBy?: 'dateApplied' | 'company' | 'position' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface GetJobApplicationsResponse {
  applications: JobApplication[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateJobApplicationRequest {
  company: string;
  position: string;
  status: JobApplicationStatus;
  type: JobApplicationType;
  salary?: number;
  dateApplied: string;
  description?: string;
  notes?: string;
}

export interface UpdateJobApplicationRequest
  extends Partial<CreateJobApplicationRequest> {
  id: number;
} 