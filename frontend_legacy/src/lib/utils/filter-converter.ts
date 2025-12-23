/**
 * Filter Conversion Utility
 * Converts FilterState from UI context to API-compatible request parameters
 */

import { FilterState } from '@/types/filters';
import { GetJobApplicationsRequest } from '@/types/api/job-application';
import { JobApplicationStatus, JobApplicationType, WorkArrangement } from '@/types/models/job-application';

/**
 * Converts UI filter state to API request parameters
 * @param filters - The current filter state from FilterContext
 * @param page - Current page for pagination (optional)
 * @param limit - Items per page (optional)
 * @returns API-compatible request parameters
 */
export function convertFiltersToApiParams(
  filters: FilterState,
  page?: number,
  limit?: number
): GetJobApplicationsRequest {
  const apiParams: GetJobApplicationsRequest = {};

  // Pagination
  if (page !== undefined) {
    apiParams.page = page;
  }
  if (limit !== undefined) {
    apiParams.limit = limit;
  }

  // Multi-select filters (only add if not empty)
  if (filters.companies.length > 0) {
    apiParams.companies = filters.companies;
  }
  
  if (filters.positions.length > 0) {
    apiParams.positions = filters.positions;
  }
  
  if (filters.statuses.length > 0) {
    apiParams.statuses = filters.statuses as JobApplicationStatus[];
  }
  
  if (filters.workArrangements.length > 0) {
    apiParams.workArrangements = filters.workArrangements as WorkArrangement[];
  }
  
  if (filters.types.length > 0) {
    apiParams.jobTypes = filters.types as JobApplicationType[];
  }

  // Salary range filters
  if (filters.salaryMin !== undefined) {
    apiParams.salaryMin = filters.salaryMin;
  }
  
  if (filters.salaryMax !== undefined) {
    apiParams.salaryMax = filters.salaryMax;
  }

  // Date range filters (convert Date objects to YYYY-MM-DD strings)
  if (filters.dateAppliedFrom) {
    apiParams.dateFrom = formatDateForApi(filters.dateAppliedFrom);
  }
  
  if (filters.dateAppliedTo) {
    apiParams.dateTo = formatDateForApi(filters.dateAppliedTo);
  }

  // Compatibility score filter (convert [min, max] array to min value)
  // Only set if the range is not the default [1, 10]
  if (filters.compatibilityScore[0] > 1) {
    apiParams.compatibilityScoreMin = filters.compatibilityScore[0];
  }

  // Starred filter (convert to boolean)
  if (filters.starredFilter === "starred") {
    apiParams.isStarred = true;
  } else if (filters.starredFilter === "unstarred") {
    apiParams.isStarred = false;
  }
  // Note: "all" doesn't set isStarred parameter (shows both starred and unstarred)

  return apiParams;
}

/**
 * Helper function to format Date object to YYYY-MM-DD string for API
 * @param date - Date object to format
 * @returns Formatted date string
 */
function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Helper function to check if any filters are active
 * @param filters - The filter state to check
 * @returns True if any filters are applied
 */
export function hasActiveApiFilters(filters: FilterState): boolean {
  return (
    filters.companies.length > 0 ||
    filters.positions.length > 0 ||
    filters.statuses.length > 0 ||
    filters.workArrangements.length > 0 ||
    filters.types.length > 0 ||
    filters.salaryMin !== undefined ||
    filters.salaryMax !== undefined ||
    filters.dateAppliedFrom !== undefined ||
    filters.dateAppliedTo !== undefined ||
    filters.compatibilityScore[0] > 1 ||
    filters.starredFilter !== "all"
  );
}

/**
 * Helper function to get a summary of active filters for debugging
 * @param filters - The filter state to summarize
 * @returns Object with count of active filters by type
 */
export function getActiveFiltersSummary(filters: FilterState) {
  return {
    companies: filters.companies.length,
    positions: filters.positions.length,
    statuses: filters.statuses.length,
    workArrangements: filters.workArrangements.length,
    types: filters.types.length,
    hasSalaryRange: filters.salaryMin !== undefined || filters.salaryMax !== undefined,
    hasDateRange: filters.dateAppliedFrom !== undefined || filters.dateAppliedTo !== undefined,
    hasCompatibilityFilter: filters.compatibilityScore[0] > 1,
    starredFilter: filters.starredFilter
  };
} 