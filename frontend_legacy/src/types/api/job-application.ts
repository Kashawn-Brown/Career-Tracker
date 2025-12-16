import { JobApplication, JobApplicationStatus, JobApplicationType, WorkArrangement } from '../models/job-application';

// API request/response types for job applications
export interface GetJobApplicationsRequest {
  // Pagination
  page?: number;
  limit?: number;
  
  // Basic filters (for backward compatibility)
  status?: JobApplicationStatus;
  company?: string;
  position?: string;
  
  // Multi-select filters
  statuses?: JobApplicationStatus[];
  companies?: string[];
  positions?: string[];
  workArrangements?: WorkArrangement[];
  jobTypes?: JobApplicationType[];
  
  // Range filters
  salaryMin?: number;
  salaryMax?: number;
  dateFrom?: string; // YYYY-MM-DD format
  dateTo?: string;   // YYYY-MM-DD format
  compatibilityScoreMin?: number; // 0-10
  
  // Boolean filters
  isStarred?: boolean;
  hasFollowUp?: boolean;
  
  // Sorting (expanded options)
  sortBy?: 'dateApplied' | 'company' | 'position' | 'status' | 'salary' | 'compatibilityScore';
  sortOrder?: 'asc' | 'desc';
}

export interface GetJobApplicationsResponse {
  jobApplications: JobApplication[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
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