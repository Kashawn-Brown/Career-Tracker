/**
 * Usage Example: How to Use the New Filter Integration
 * This demonstrates the complete filter flow in a React component
 */

import React, { useEffect, useState } from 'react';
import { useFilterContext } from '@/contexts/FilterContext';
import { JobApplicationsService } from '@/services/job-applications.service';
import { GetJobApplicationsResponse } from '@/types/api/job-application';

/**
 * Example component showing how to use the new filter integration
 */
export function FilteredJobApplicationsList() {
  const { filters } = useFilterContext();
  const [applications, setApplications] = useState<GetJobApplicationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch data whenever filters change
  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Method 1: Using FilterState directly (RECOMMENDED)
        const response = await JobApplicationsService.getJobApplications(
          filters,      // FilterState from context
          currentPage,  // Current page
          20           // Items per page
        );
        
        setApplications(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch applications');
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [filters, currentPage]);

  if (loading) return <div>Loading filtered applications...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!applications) return <div>No data</div>;

  return (
    <div>
      <h3>Filtered Job Applications ({applications.pagination.total})</h3>
      
      {/* Display current filter summary */}
      <FilterSummary />
      
      {/* Applications list */}
      <div className="space-y-4">
        {applications.jobApplications.map((app) => (
          <div key={app.id} className="border p-4 rounded">
            <h4>{app.position} at {app.company}</h4>
            <p>Status: {app.status}</p>
            <p>Applied: {new Date(app.dateApplied).toLocaleDateString()}</p>
            {app.salary && <p>Salary: ${app.salary.toLocaleString()}</p>}
          </div>
        ))}
      </div>
      
      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <button 
          disabled={!applications.pagination.hasPrev}
          onClick={() => setCurrentPage(p => p - 1)}
        >
          Previous
        </button>
        
        <span>
          Page {applications.pagination.page} of {applications.pagination.totalPages}
        </span>
        
        <button 
          disabled={!applications.pagination.hasNext}
          onClick={() => setCurrentPage(p => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

/**
 * Component showing active filter summary
 */
function FilterSummary() {
  const { filters, getActiveFilterCount } = useFilterContext();
  const activeCount = getActiveFilterCount();

  if (activeCount === 0) {
    return <p className="text-gray-500">No filters applied</p>;
  }

  return (
    <div className="mb-4 p-3 bg-blue-50 rounded">
      <p className="font-medium">{activeCount} filter(s) applied:</p>
      <ul className="text-sm text-gray-600 mt-1">
        {filters.companies.length > 0 && (
          <li>Companies: {filters.companies.join(', ')}</li>
        )}
        {filters.statuses.length > 0 && (
          <li>Status: {filters.statuses.join(', ')}</li>
        )}
        {filters.salaryMin && (
          <li>Min Salary: ${filters.salaryMin.toLocaleString()}</li>
        )}
        {filters.salaryMax && (
          <li>Max Salary: ${filters.salaryMax.toLocaleString()}</li>
        )}
        {filters.starredFilter !== 'all' && (
          <li>Starred: {filters.starredFilter}</li>
        )}
      </ul>
    </div>
  );
}

/**
 * Alternative usage examples
 */
export class UsageExamples {
  
  // Example 1: Using the old API parameter approach (still works)
  static async fetchWithDirectParams() {
    const response = await JobApplicationsService.getJobApplications({
      page: 1,
      limit: 10,
      statuses: ['applied', 'interview'],
      salaryMin: 50000
    });
    return response;
  }
  
  // Example 2: Using FilterState conversion manually
  static async fetchWithManualConversion() {
    const filters = {
      companies: ['Google', 'Microsoft'],
      positions: [],
      statuses: ['applied'],
      workArrangements: ['remote'],
      types: ['full-time'],
      salaryMin: 80000,
      salaryMax: undefined,
      dateAppliedFrom: undefined,
      dateAppliedTo: undefined,
      compatibilityScore: [1, 10],
      starredFilter: 'all' as const
    };
    
    // This automatically converts FilterState to API parameters
    const response = await JobApplicationsService.getJobApplications(filters, 1, 20);
    return response;
  }
  
  // Example 3: Integration with search functionality
  static async searchAndFilter(searchTerm: string, filters: any) {
    // You could extend the API to support text search
    const apiParams = {
      ...filters,
      search: searchTerm,
      page: 1,
      limit: 20
    };
    
    const response = await JobApplicationsService.getJobApplications(apiParams);
    return response;
  }
}

/**
 * Hook for easier filter integration
 */
export function useFilteredJobApplications(page: number = 1, limit: number = 20) {
  const { filters } = useFilterContext();
  const [data, setData] = useState<GetJobApplicationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await JobApplicationsService.getJobApplications(filters, page, limit);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters, page, limit]);

  return { data, loading, error, refetch: () => setData(null) };
} 