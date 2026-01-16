// frontend/src/lib/applications/presentation.ts
import type { ApplicationStatus, JobType, WorkMode } from "@/types/api";

/**
 * Human-friendly labels for Status, JobType and WorkMode.
 */

// Status options
export const STATUS_OPTIONS: Array<{ value: ApplicationStatus; label: string }> = [
    { value: "WISHLIST", label: "Interested" },
    { value: "APPLIED", label: "Applied" },
    { value: "INTERVIEW", label: "Interviewing" },
    { value: "OFFER", label: "Offer Received" },
    { value: "REJECTED", label: "Rejected" },
    { value: "WITHDRAWN", label: "Withdrawn" },
  ];

// Status filter options list for the UI (includes "ALL" option)
export const STATUS_FILTER_OPTIONS: Array<"ALL" | ApplicationStatus> = ["ALL", "WISHLIST", "APPLIED", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"];
  
// Map Status values to human-friendly labels (e.g., "WISHLIST" -> "Wishlist")
const STATUS_LABELS: Record<ApplicationStatus, string> = Object.fromEntries(
  STATUS_OPTIONS.map((o) => [o.value, o.label])
) as Record<ApplicationStatus, string>;

// Helper function to get the human-friendly label for a Status
export function statusLabel(value: ApplicationStatus): string {
  return STATUS_LABELS[value] ?? value;
}


// JobType options
export const JOB_TYPE_OPTIONS: Array<{ value: JobType; label: string }> = [
  { value: "UNKNOWN", label: "—" },
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERNSHIP", label: "Internship" },
];

// Job type filter options list for the UI (includes "ALL" option, doesn't include "UNKNOWN")
export const JOB_TYPE_FILTER_OPTIONS: Array<"ALL" | JobType> = ["ALL", "FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"];
  
// Map JobType values to human-friendly labels (e.g., "FULL_TIME" -> "Full-time")
const JOB_TYPE_LABELS: Record<JobType, string> = Object.fromEntries(
  JOB_TYPE_OPTIONS.map((o) => [o.value, o.label])
) as Record<JobType, string>;

// Helper function to get the human-friendly label for a JobType
export function jobTypeLabel(value: JobType): string {
  return JOB_TYPE_LABELS[value] ?? value;
}


// WorkMode options
export const WORK_MODE_OPTIONS: Array<{ value: WorkMode; label: string }> = [
  { value: "UNKNOWN", label: "—" },
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "ONSITE", label: "On-site" },
];

// Work mode filter options list for the UI (includes "ALL" option, doesn't include "UNKNOWN")
export const WORK_MODE_FILTER_OPTIONS: Array<"ALL" | WorkMode> = ["ALL", "REMOTE", "HYBRID", "ONSITE"];

// Map WorkMode values to human-friendly labels (e.g., "REMOTE" -> "Remote")
const WORK_MODE_LABELS: Record<WorkMode, string> = Object.fromEntries(
  WORK_MODE_OPTIONS.map((o) => [o.value, o.label])
) as Record<WorkMode, string>;

// Helper function to get the human-friendly label for a WorkMode
export function workModeLabel(value: WorkMode): string {
  return WORK_MODE_LABELS[value] ?? value;
}



