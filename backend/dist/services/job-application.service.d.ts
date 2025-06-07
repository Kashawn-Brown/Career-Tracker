/**
 * Job Application Service
 *
 * Business logic layer for job application operations.
 * Handles validation, business rules, and coordinates repository calls.
 * Works with TagService for tag-related operations.
 */
export interface JobApplicationListFilters {
    page?: number;
    limit?: number;
    userId?: number;
    status?: string;
    company?: string;
    position?: string;
    dateFrom?: string;
    dateTo?: string;
    isStarred?: boolean;
    hasFollowUp?: boolean;
    salaryMin?: number;
    salaryMax?: number;
    compatibilityScoreMin?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface CreateJobApplicationRequest {
    userId: number;
    company: string;
    position: string;
    dateApplied?: string;
    status?: string;
    type?: string;
    salary?: number;
    jobLink?: string;
    compatibilityScore?: number;
    notes?: string;
    isStarred?: boolean;
    followUpDate?: string;
    deadline?: string;
    tags?: string[];
}
export interface UpdateJobApplicationRequest {
    company?: string;
    position?: string;
    dateApplied?: string;
    status?: string;
    type?: string;
    salary?: number;
    jobLink?: string;
    compatibilityScore?: number;
    notes?: string;
    isStarred?: boolean;
    followUpDate?: string;
    deadline?: string;
    tags?: string[];
}
export declare class JobApplicationService {
    /**
     * List job applications with pagination and filtering
     */
    listJobApplications(filters: JobApplicationListFilters): Promise<import("../repositories/base.repository.js").PaginatedResult<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        userId: number;
        company: string;
        notes: string | null;
        position: string;
        dateApplied: Date;
        status: string;
        type: string | null;
        salary: number | null;
        jobLink: string | null;
        compatibilityScore: number | null;
        isStarred: boolean;
        followUpDate: Date | null;
        deadline: Date | null;
    }>>;
    /**
     * Get a single job application by ID with all relations
     */
    getJobApplication(id: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        userId: number;
        company: string;
        notes: string | null;
        position: string;
        dateApplied: Date;
        status: string;
        type: string | null;
        salary: number | null;
        jobLink: string | null;
        compatibilityScore: number | null;
        isStarred: boolean;
        followUpDate: Date | null;
        deadline: Date | null;
    }>;
    /**
     * Create a new job application with business validation
     */
    createJobApplication(data: CreateJobApplicationRequest): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        userId: number;
        company: string;
        notes: string | null;
        position: string;
        dateApplied: Date;
        status: string;
        type: string | null;
        salary: number | null;
        jobLink: string | null;
        compatibilityScore: number | null;
        isStarred: boolean;
        followUpDate: Date | null;
        deadline: Date | null;
    } | null>;
    /**
     * Update an existing job application with business validation
     */
    updateJobApplication(id: number, data: UpdateJobApplicationRequest): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        userId: number;
        company: string;
        notes: string | null;
        position: string;
        dateApplied: Date;
        status: string;
        type: string | null;
        salary: number | null;
        jobLink: string | null;
        compatibilityScore: number | null;
        isStarred: boolean;
        followUpDate: Date | null;
        deadline: Date | null;
    } | null>;
    /**
     * Delete a job application with business validation
     */
    deleteJobApplication(id: number): Promise<{
        message: string;
        deletedId: number;
    }>;
}
export declare const jobApplicationService: JobApplicationService;
//# sourceMappingURL=job-application.service.d.ts.map