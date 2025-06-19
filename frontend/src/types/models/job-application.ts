// Job Application data structure (based on backend schema)
export interface JobApplication {
  id: number;
  userId: number;
  company: string;
  position: string;
  status: JobApplicationStatus;
  type: JobApplicationType;
  salary?: number;
  dateApplied: string; // ISO date string
  description?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Job application status enum
export enum JobApplicationStatus {
  APPLIED = 'APPLIED',
  INTERVIEW = 'INTERVIEW',
  OFFER = 'OFFER',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

// Job application type enum
export enum JobApplicationType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERNSHIP = 'INTERNSHIP',
  FREELANCE = 'FREELANCE',
} 