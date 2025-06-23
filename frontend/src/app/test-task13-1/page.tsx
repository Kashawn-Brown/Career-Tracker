"use client"

import { useState } from "react"
import { JobApplication } from "@/types/models/job-application"
import { JobApplicationsTable } from "@/components/JobApplicationsTable"
import { JobApplicationFilterPanel } from "@/components/JobApplicationFilterPanel"

// Sample data for testing filters - simplified version
const sampleData: JobApplication[] = [
  {
    id: 1,
    userId: 1,
    company: "Google",
    position: "Senior Software Engineer",
    dateApplied: "2024-01-15T00:00:00Z",
    status: "interview",
    type: "full-time",
    salary: 150000,
    jobLink: "https://careers.google.com/jobs/12345",
    compatibilityScore: 9,
    notes: "Technical interview scheduled",
    isStarred: true,
    followUpDate: "2024-01-22T00:00:00Z",
    deadline: "2024-02-01T00:00:00Z",
    workArrangement: "hybrid",
    description: "Full stack development role focusing on cloud infrastructure.",
    createdAt: "2024-01-15T00:00:00Z",
    updatedAt: "2024-01-20T00:00:00Z",
    tags: [
      { id: 1, name: "Frontend", userId: 1, createdAt: "2024-01-15T00:00:00Z" },
      { id: 2, name: "Senior Level", userId: 1, createdAt: "2024-01-15T00:00:00Z" }
    ],
    jobConnections: [],
    documents: []
  },
  {
    id: 2,
    userId: 1,
    company: "Microsoft",
    position: "Frontend Developer",
    dateApplied: "2024-01-12T00:00:00Z",
    status: "applied",
    type: "full-time",
    salary: 130000,
    jobLink: "https://careers.microsoft.com/us/en/job/67890",
    compatibilityScore: 7,
    notes: "Waiting for response",
    isStarred: false,
    followUpDate: undefined,
    deadline: "2024-01-30T00:00:00Z",
    workArrangement: "remote",
    description: "React and TypeScript focused frontend development.",
    createdAt: "2024-01-12T00:00:00Z",
    updatedAt: "2024-01-12T00:00:00Z",
    tags: [
      { id: 4, name: "Frontend", userId: 1, createdAt: "2024-01-12T00:00:00Z" }
    ],
    jobConnections: [],
    documents: []
  },
  {
    id: 3,
    userId: 1,
    company: "Amazon",
    position: "Software Development Engineer",
    dateApplied: "2024-01-08T00:00:00Z",
    status: "offer",
    type: "full-time",
    salary: 165000,
    jobLink: "https://amazon.jobs/en/jobs/54321",
    compatibilityScore: 8,
    notes: "Offer received, considering",
    isStarred: true,
    followUpDate: undefined,
    deadline: "2024-02-15T00:00:00Z",
    workArrangement: "in_office",
    description: "AWS focused backend development for core services.",
    createdAt: "2024-01-08T00:00:00Z",
    updatedAt: "2024-01-25T00:00:00Z",
    tags: [
      { id: 6, name: "Backend", userId: 1, createdAt: "2024-01-08T00:00:00Z" }
    ],
    jobConnections: [],
    documents: []
  },
  {
    id: 4,
    userId: 1,
    company: "Apple",
    position: "iOS Developer",
    dateApplied: "2024-01-20T00:00:00Z",
    status: "rejected",
    type: "contract",
    salary: 120000,
    jobLink: "https://jobs.apple.com/en-us/details/200456789",
    compatibilityScore: 6,
    notes: "Not a good fit",
    isStarred: false,
    followUpDate: undefined,
    deadline: "2024-01-25T00:00:00Z",
    workArrangement: "hybrid",
    description: "iOS app development for consumer products.",
    createdAt: "2024-01-20T00:00:00Z",
    updatedAt: "2024-01-21T00:00:00Z",
    tags: [
      { id: 8, name: "Mobile", userId: 1, createdAt: "2024-01-20T00:00:00Z" }
    ],
    jobConnections: [],
    documents: []
  }
]

export default function TestTask131Page() {
  const [filteredData, setFilteredData] = useState<JobApplication[]>(sampleData)
  const [isFilterPanelExpanded, setIsFilterPanelExpanded] = useState(true)
  const [currentFilters, setCurrentFilters] = useState<any>({})

  const handleFilterChange = (filters: any) => {
    // For now, just log the filter changes
    console.log("Filters changed:", filters)
    
    // Store current filters for debug display
    setCurrentFilters(filters)
    
    // Basic filtering logic will be implemented in future tasks
    // For Task 13.1, we're just building the UI components
    setFilteredData(sampleData)
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Task 13.1: Filter Panel UI Components Test</h1>
        <p className="text-muted-foreground mb-4">
          Testing the collapsible filter panel UI components with various filter controls.
        </p>
        
        <div className="bg-muted/50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-2">Test Requirements:</h2>
          <ul className="space-y-1 text-sm">
            <li>✅ Collapsible panel with toggle button</li>
            <li>✅ Multi-select searchable dropdowns (Company/Position)</li>
            <li>✅ Checkbox dropdowns (Status/Work Arrangement/Type)</li>
            <li>✅ Min/max inputs (Salary)</li>
            <li>✅ Date pickers (Date Applied)</li>
            <li>✅ Range slider (Compatibility Score)</li>
            <li>✅ Individual clear buttons for each filter</li>
            <li>✅ Global "Clear All" button</li>
            <li>✅ Starred jobs filter (All/Starred/Non-starred)</li>
            <li>✅ Responsive and accessible design</li>
          </ul>
        </div>
      </div>

      {/* Filter Panel - This is what we're building in Task 13.1 */}
      <JobApplicationFilterPanel
        onFilterChange={handleFilterChange}
        isExpanded={isFilterPanelExpanded}
        onToggleExpanded={setIsFilterPanelExpanded}
        availableCompanies={Array.from(new Set(sampleData.map(job => job.company)))}
        availablePositions={Array.from(new Set(sampleData.map(job => job.position)))}
      />

      {/* Existing Table Component */}
      <div className="mt-6">
        <JobApplicationsTable 
          data={filteredData}
          showControls={false}
          defaultPageSize={10}
        />
      </div>
      
      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">🔍 Debug Info:</h3>
        <p className="text-sm">Total items: {filteredData.length}</p>
        <p className="text-sm">Filter panel expanded: {isFilterPanelExpanded ? 'Yes' : 'No'}</p>
        
        <div className="mt-4">
          <h4 className="text-lg font-semibold mb-2">Current Applied Filter Values:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <div><strong>⭐ Starred:</strong> <span className="font-mono bg-background px-1 rounded">{currentFilters.starredFilter || 'all'}</span></div>
              <div><strong>💰 Salary Min:</strong> <span className="font-mono bg-background px-1 rounded">{currentFilters.salaryMin || 'unset'}</span></div>
              <div><strong>💰 Salary Max:</strong> <span className="font-mono bg-background px-1 rounded">{currentFilters.salaryMax || 'unset'}</span></div>
              <div><strong>📈 Compatibility:</strong> <span className="font-mono bg-background px-1 rounded">{currentFilters.compatibilityScore?.[0] || 1} - {currentFilters.compatibilityScore?.[1] || 10}</span></div>
              <div><strong>📅 Date From:</strong> <span className="font-mono bg-background px-1 rounded">{currentFilters.dateAppliedFrom ? new Date(currentFilters.dateAppliedFrom).toLocaleDateString() : 'unset'}</span></div>
              <div><strong>📅 Date To:</strong> <span className="font-mono bg-background px-1 rounded">{currentFilters.dateAppliedTo ? new Date(currentFilters.dateAppliedTo).toLocaleDateString() : 'unset'}</span></div>
            </div>
            <div className="space-y-2">
              <div>
                <div><strong>🏢 Companies ({currentFilters.companies?.length || 0}):</strong></div>
                <div className="font-mono bg-background px-1 rounded text-xs max-w-full overflow-auto">
                  {currentFilters.companies?.length > 0 ? `[${currentFilters.companies.join(', ')}]` : 'All companies'}
                </div>
              </div>
              <div>
                <div><strong>💼 Positions ({currentFilters.positions?.length || 0}):</strong></div>
                <div className="font-mono bg-background px-1 rounded text-xs max-w-full overflow-auto">
                  {currentFilters.positions?.length > 0 ? `[${currentFilters.positions.join(', ')}]` : 'All positions'}
                </div>
              </div>
              <div>
                <div><strong>📊 Statuses ({currentFilters.statuses?.length || 0}):</strong></div>
                <div className="font-mono bg-background px-1 rounded text-xs max-w-full overflow-auto">
                  {currentFilters.statuses?.length > 0 ? `[${currentFilters.statuses.join(', ')}]` : 'All statuses'}
                </div>
              </div>
              <div>
                <div><strong>🏠 Work Arrangements ({currentFilters.workArrangements?.length || 0}):</strong></div>
                <div className="font-mono bg-background px-1 rounded text-xs max-w-full overflow-auto">
                  {currentFilters.workArrangements?.length > 0 ? `[${currentFilters.workArrangements.join(', ')}]` : 'All arrangements'}
                </div>
              </div>
              <div>
                <div><strong>📝 Job Types ({currentFilters.types?.length || 0}):</strong></div>
                <div className="font-mono bg-background px-1 rounded text-xs max-w-full overflow-auto">
                  {currentFilters.types?.length > 0 ? `[${currentFilters.types.join(', ')}]` : 'All types'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Commented out for cleaner UI - uncomment for detailed debugging */}
          {/* 
          <div className="mt-4 p-2 bg-background rounded border">
            <h5 className="text-xs font-medium mb-1">Raw Filter Object (JSON):</h5>
            <pre className="text-xs font-mono overflow-auto max-h-32 whitespace-pre-wrap">
              {JSON.stringify(currentFilters, null, 2)}
            </pre>
          </div>
          */}
        </div>
      </div>
    </div>
  )
} 