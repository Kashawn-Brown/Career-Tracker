/**
 * Filter Integration Test
 * Tests the complete filter flow from FilterState to API call
 */

import { describe, it, expect } from 'vitest';
import { FilterState, DEFAULT_FILTER_STATE } from '@/types/filters';
import { convertFiltersToApiParams, hasActiveApiFilters, getActiveFiltersSummary } from '@/lib/utils/filter-converter';
import { GetJobApplicationsRequest } from '@/types/api/job-application';

describe('Filter Integration', () => {
  describe('convertFiltersToApiParams', () => {
    it('should handle empty filters (default state)', () => {
      const result = convertFiltersToApiParams(DEFAULT_FILTER_STATE);
      
      // Should be empty object since no filters are active
      expect(result).toEqual({});
    });

    it('should convert multi-select filters correctly', () => {
      const filters: FilterState = {
        ...DEFAULT_FILTER_STATE,
        companies: ['Google', 'Microsoft'],
        positions: ['Software Engineer', 'Senior Developer'],
        statuses: ['applied', 'interview'],
        workArrangements: ['remote', 'hybrid'],
        types: ['full-time', 'contract']
      };

      const result = convertFiltersToApiParams(filters);
      
      expect(result).toEqual({
        companies: ['Google', 'Microsoft'],
        positions: ['Software Engineer', 'Senior Developer'],
        statuses: ['applied', 'interview'],
        workArrangements: ['remote', 'hybrid'],
        jobTypes: ['full-time', 'contract'] // Note: API uses 'jobTypes'
      });
    });

    it('should convert salary range filters correctly', () => {
      const filters: FilterState = {
        ...DEFAULT_FILTER_STATE,
        salaryMin: 50000,
        salaryMax: 120000
      };

      const result = convertFiltersToApiParams(filters);
      
      expect(result).toEqual({
        salaryMin: 50000,
        salaryMax: 120000
      });
    });

    it('should convert date range filters correctly', () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-12-31');
      
      const filters: FilterState = {
        ...DEFAULT_FILTER_STATE,
        dateAppliedFrom: fromDate,
        dateAppliedTo: toDate
      };

      const result = convertFiltersToApiParams(filters);
      
      expect(result).toEqual({
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31'
      });
    });

    it('should convert compatibility score filter correctly', () => {
      const filters: FilterState = {
        ...DEFAULT_FILTER_STATE,
        compatibilityScore: [5, 10] // Only min value is used
      };

      const result = convertFiltersToApiParams(filters);
      
      expect(result).toEqual({
        compatibilityScoreMin: 5
      });
    });

    it('should convert starred filter correctly', () => {
      // Test starred
      const starredFilters: FilterState = {
        ...DEFAULT_FILTER_STATE,
        starredFilter: 'starred'
      };

      const starredResult = convertFiltersToApiParams(starredFilters);
      expect(starredResult).toEqual({ isStarred: true });

      // Test unstarred
      const unstarredFilters: FilterState = {
        ...DEFAULT_FILTER_STATE,
        starredFilter: 'unstarred'
      };

      const unstarredResult = convertFiltersToApiParams(unstarredFilters);
      expect(unstarredResult).toEqual({ isStarred: false });

      // Test all (should not set isStarred)
      const allFilters: FilterState = {
        ...DEFAULT_FILTER_STATE,
        starredFilter: 'all'
      };

      const allResult = convertFiltersToApiParams(allFilters);
      expect(allResult).toEqual({});
    });

    it('should include pagination parameters when provided', () => {
      const result = convertFiltersToApiParams(DEFAULT_FILTER_STATE, 2, 25);
      
      expect(result).toEqual({
        page: 2,
        limit: 25
      });
    });

    it('should handle complex filter combinations', () => {
      const complexFilters: FilterState = {
        companies: ['Google', 'Microsoft'],
        positions: ['Software Engineer'],
        statuses: ['applied', 'interview'],
        workArrangements: ['remote'],
        types: ['full-time'],
        salaryMin: 80000,
        salaryMax: 150000,
        dateAppliedFrom: new Date('2024-01-01'),
        dateAppliedTo: new Date('2024-06-30'),
        compatibilityScore: [7, 10],
        starredFilter: 'starred'
      };

      const result = convertFiltersToApiParams(complexFilters, 1, 20);
      
      expect(result).toEqual({
        page: 1,
        limit: 20,
        companies: ['Google', 'Microsoft'],
        positions: ['Software Engineer'],
        statuses: ['applied', 'interview'],
        workArrangements: ['remote'],
        jobTypes: ['full-time'],
        salaryMin: 80000,
        salaryMax: 150000,
        dateFrom: '2024-01-01',
        dateTo: '2024-06-30',
        compatibilityScoreMin: 7,
        isStarred: true
      });
    });
  });

  describe('hasActiveApiFilters', () => {
    it('should return false for default filter state', () => {
      expect(hasActiveApiFilters(DEFAULT_FILTER_STATE)).toBe(false);
    });

    it('should return true when filters are active', () => {
      const filtersWithCompanies: FilterState = {
        ...DEFAULT_FILTER_STATE,
        companies: ['Google']
      };
      
      expect(hasActiveApiFilters(filtersWithCompanies)).toBe(true);

      const filtersWithSalary: FilterState = {
        ...DEFAULT_FILTER_STATE,
        salaryMin: 50000
      };
      
      expect(hasActiveApiFilters(filtersWithSalary)).toBe(true);

      const filtersWithStarred: FilterState = {
        ...DEFAULT_FILTER_STATE,
        starredFilter: 'starred'
      };
      
      expect(hasActiveApiFilters(filtersWithStarred)).toBe(true);
    });
  });

  describe('getActiveFiltersSummary', () => {
    it('should provide correct summary for default state', () => {
      const summary = getActiveFiltersSummary(DEFAULT_FILTER_STATE);
      
      expect(summary).toEqual({
        companies: 0,
        positions: 0,
        statuses: 0,
        workArrangements: 0,
        types: 0,
        hasSalaryRange: false,
        hasDateRange: false,
        hasCompatibilityFilter: false,
        starredFilter: 'all'
      });
    });

    it('should provide correct summary with active filters', () => {
      const activeFilters: FilterState = {
        ...DEFAULT_FILTER_STATE,
        companies: ['Google', 'Microsoft'],
        statuses: ['applied'],
        salaryMin: 50000,
        dateAppliedFrom: new Date('2024-01-01'),
        compatibilityScore: [8, 10],
        starredFilter: 'starred'
      };

      const summary = getActiveFiltersSummary(activeFilters);
      
      expect(summary).toEqual({
        companies: 2,
        positions: 0,
        statuses: 1,
        workArrangements: 0,
        types: 0,
        hasSalaryRange: true,
        hasDateRange: true,
        hasCompatibilityFilter: true,
        starredFilter: 'starred'
      });
    });
  });

  describe('Type Compatibility', () => {
    it('should produce API request compatible with GetJobApplicationsRequest type', () => {
      const filters: FilterState = {
        ...DEFAULT_FILTER_STATE,
        companies: ['Test Company'],
        statuses: ['applied'],
        salaryMin: 50000
      };

      const apiParams = convertFiltersToApiParams(filters, 1, 10);
      
      // This should type-check as GetJobApplicationsRequest
      const request: GetJobApplicationsRequest = apiParams;
      
      expect(request.page).toBe(1);
      expect(request.limit).toBe(10);
      expect(request.companies).toEqual(['Test Company']);
      expect(request.statuses).toEqual(['applied']);
      expect(request.salaryMin).toBe(50000);
    });
  });
});

// Integration test helper function
export function createTestFilterState(overrides: Partial<FilterState> = {}): FilterState {
  return {
    ...DEFAULT_FILTER_STATE,
    ...overrides
  };
}

// Mock API response for testing
export const mockJobApplicationsResponse = {
  jobApplications: [
    {
      id: 1,
      userId: 1,
      company: 'Google',
      position: 'Software Engineer',
      dateApplied: '2024-01-15',
      status: 'applied' as const,
      type: 'full-time' as const,
      salary: 120000,
      isStarred: false,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    }
  ],
  pagination: {
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false
  }
}; 