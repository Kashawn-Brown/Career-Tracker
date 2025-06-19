// Job Application data structure (matching backend schema exactly)
export interface JobApplication {
  id: number;
  userId: number;
  company: string;
  position: string;
  dateApplied: string; // ISO date string
  status: JobApplicationStatus;
  type?: JobApplicationType;
  salary?: number;
  jobLink?: string;
  compatibilityScore?: number;
  notes?: string;
  isStarred: boolean;
  followUpDate?: string; // ISO date string
  deadline?: string; // ISO date string
  workArrangement?: WorkArrangement;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Type unions for validation (replacing enums)
export type JobApplicationStatus = 'applied' | 'interview' | 'offer' | 'rejected' | 'withdrawn' | 'accepted';

export type JobApplicationType = 'full-time' | 'part-time' | 'contract' | 'internship' | 'freelance';

export type WorkArrangement = 'remote' | 'hybrid' | 'in_office' | 'flexible'; 