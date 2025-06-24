"use client"

import { useState } from 'react'
import { JobApplicationsTable } from "@/components/JobApplicationsTable"
import { JobApplication } from "@/types/models/job-application"
import { ChevronDown, ChevronRight } from 'lucide-react'

// Sample data for testing the table component (matching backend schema)
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
    description: "Full stack development role focusing on cloud infrastructure and scalable systems.",
    createdAt: "2024-01-15T00:00:00Z",
    updatedAt: "2024-01-20T00:00:00Z"
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
    description: "React and TypeScript focused frontend development for Azure portal.",
    createdAt: "2024-01-12T00:00:00Z",
    updatedAt: "2024-01-12T00:00:00Z"
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
    description: "AWS focused backend development for core services team.",
    createdAt: "2024-01-08T00:00:00Z",
    updatedAt: "2024-01-25T00:00:00Z"
  },
  {
    id: 4,
    userId: 1,
    company: "Startup Inc",
    position: "Full Stack Developer",
    dateApplied: "2024-01-05T00:00:00Z",
    status: "rejected",
    type: "full-time",
    salary: 95000,
    jobLink: undefined,
    compatibilityScore: 3,
    notes: "Not a good fit - looking for more senior dev",
    isStarred: false,
    followUpDate: undefined,
    deadline: undefined,
    workArrangement: "flexible",
    description: "Early stage startup building fintech solutions.",
    createdAt: "2024-01-05T00:00:00Z",
    updatedAt: "2024-01-18T00:00:00Z"
  },
  {
    id: 5,
    userId: 1,
    company: "Freelance Client",
    position: "React Developer",
    dateApplied: "2024-01-03T00:00:00Z",
    status: "withdrawn",
    type: "contract",
    salary: undefined,
    jobLink: undefined,
    compatibilityScore: 5,
    notes: "Client changed requirements significantly",
    isStarred: false,
    followUpDate: undefined,
    deadline: undefined,
    workArrangement: "remote",
    description: "Short term contract for e-commerce website rebuild.",
    createdAt: "2024-01-03T00:00:00Z",
    updatedAt: "2024-01-10T00:00:00Z"
  },
  {
    id: 6,
    userId: 1,
    company: "Local Business",
    position: "Part-time Developer",
    dateApplied: "2024-01-01T00:00:00Z",
    status: "applied",
    type: "part-time",
    salary: 25000,
    jobLink: undefined,
    compatibilityScore: 6,
    notes: "Flexible hours, good for side work",
    isStarred: false,
    followUpDate: "2024-01-08T00:00:00Z",
    deadline: undefined,
    workArrangement: "hybrid",
    description: "Local web development for small business websites.",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  }
]

export default function TestTablePage() {
  const [showTaskDetails, setShowTaskDetails] = useState(false)
  const [showImplementationDetails, setShowImplementationDetails] = useState(false)

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Task 4 ✅ COMPLETE: Frontend Table UI with Core Fields</h1>
        <p className="text-muted-foreground">
          Complete job applications table with sorting, expansion, pagination, and advanced controls
        </p>
      </div>

      {/* Task 4.4 Completion Status - Collapsible */}
      <div className="mb-8">
        <button
          onClick={() => setShowTaskDetails(!showTaskDetails)}
          className="flex items-center gap-2 w-full p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
        >
          {showTaskDetails ? (
            <ChevronDown className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-green-600 dark:text-green-400" />
          )}
          <h2 className="text-lg font-semibold text-green-900 dark:text-green-100">
            ✅ Task 4 COMPLETE: Frontend Table UI with Core Fields (All 5 Subtasks Done)
          </h2>
        </button>
        
        {showTaskDetails && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="space-y-2 text-sm text-green-800 dark:text-green-200">
              <p><strong>Features Implemented:</strong></p>
              <ul className="space-y-1 ml-4 list-disc">
                <li>✅ Row rendering with comprehensive data mapping</li>
                <li>✅ Click handlers for row expansion (click any row)</li>
                <li>✅ Advanced sorting functionality (click column headers)</li>
                <li>✅ Sort indicators with fixed-width containers</li>
                <li>✅ Client-side sorting with type-specific logic</li>
                <li>✅ Enhanced hover and focus states</li>
                <li>✅ Advanced keyboard navigation (←→↑↓, Space, Enter, Esc)</li>
                <li>✅ Column show/hide controls with required protection</li>
                <li>✅ Size controls (small/normal/large/extra-large)</li>
                <li>✅ Dark mode toggle integration</li>
                <li>✅ Debug information panel</li>
                <li>✅ Default sort: dateApplied descending</li>
                <li>✅ Secondary sort by dateApplied when primary values equal</li>
                <li>✅ Reset to default functionality (not clear to none)</li>
                <li>✅ Responsive column spacing with increased gap (gap-12)</li>
                <li>✅ Loading skeleton with responsive sizing</li>
                <li>✅ Text size responsiveness for all table content</li>
                <li>✅ Job description truncation (50 chars) matching notes</li>
                <li>✅ Combined Reset to Default (both sort and columns)</li>
                <li>✅ Default sort cycling bug fix for dateApplied column</li>
                <li>✅ <strong>Task 4.5:</strong> Smart pagination with ellipsis logic</li>
                <li>✅ <strong>Task 4.5:</strong> Page size selection (5, 10, 20, 50, 100)</li>
                <li>✅ <strong>Task 4.5:</strong> Results info display (&quot;Showing X to Y of Z&quot;)</li>
                <li>✅ <strong>Task 4.5:</strong> Error handling with Alert component</li>
                <li>✅ <strong>Task 4.5:</strong> Pagination maintains table position during sorting</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Table with data */}
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Interactive Table with Sample Data</h2>
          <JobApplicationsTable 
            data={sampleData} 
            showControls={true} 
            showDebugInfo={true}
          />
        </div>

        {/* Implementation Details & Testing Guide - Collapsible */} 
        <div>
          <button
            onClick={() => setShowImplementationDetails(!showImplementationDetails)}
            className="flex items-center gap-2 w-full p-4 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            {showImplementationDetails ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <h2 className="text-xl font-semibold">Task 4 Complete Implementation Details</h2>
          </button>
          
          {showImplementationDetails && (
            <div className="mt-4 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Core Features */}
                <div className="space-y-4">
                  <div className="p-4 bg-muted/30 rounded-lg border">
                    <h3 className="font-semibold text-green-600 dark:text-green-400 mb-2">✅ Row Rendering & Interaction</h3>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Comprehensive data mapping for all field types</li>
                      <li>• Click any row to expand/collapse details</li>
                      <li>• Enhanced job description display with links</li>
                      <li>• Hover states and visual feedback</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-muted/30 rounded-lg border">
                    <h3 className="font-semibold text-green-600 dark:text-green-400 mb-2">✅ Advanced Sorting System</h3>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Type-specific sorting (dates, numbers, booleans, strings)</li>
                      <li>• Secondary sort by dateApplied when values equal</li>
                      <li>• Default sort: dateApplied descending (newest first)</li>
                      <li>• Fixed-width sort indicators prevent column jumping</li>
                      <li>• Default sort state tracking for proper cycling</li>
                      <li>• Null/undefined value handling in sorting</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-muted/30 rounded-lg border">
                    <h3 className="font-semibold text-green-600 dark:text-green-400 mb-2">✅ Keyboard Navigation</h3>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• ← → Navigate between column headers</li>
                      <li>• ↑ ↓ Navigate between table rows</li>
                      <li>• Space: Sort by focused column</li>
                      <li>• Enter: Expand/collapse focused row</li>
                      <li>• Esc: Reset to default sort</li>
                    </ul>
                  </div>
                </div>

                {/* Advanced Features */}
                <div className="space-y-4">
                  <div className="p-4 bg-muted/30 rounded-lg border">
                    <h3 className="font-semibold text-green-600 dark:text-green-400 mb-2">✅ Column Management</h3>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Show/hide columns with toggle controls</li>
                      <li>• Required columns protected from hiding</li>
                      <li>• Show All / Hide All bulk actions</li>
                      <li>• Persistent column state</li>
                      <li>• Combined reset (both sort AND columns)</li>
                      <li>• Proper column ordering maintenance</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-muted/30 rounded-lg border">
                    <h3 className="font-semibold text-green-600 dark:text-green-400 mb-2">✅ Size & Display Controls</h3>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• 4 size options: small, normal, large, extra-large</li>
                      <li>• Responsive cell padding and font sizing</li>
                      <li>• Icon and badge size scaling</li>
                      <li>• Dark mode toggle integration</li>
                      <li>• Loading skeleton responsive to text size</li>
                      <li>• All table content inherits size settings</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-muted/30 rounded-lg border">
                    <h3 className="font-semibold text-green-600 dark:text-green-400 mb-2">✅ Smart Pagination System (Task 4.5)</h3>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Intelligent ellipsis logic for large datasets</li>
                      <li>• Page size selection: 5, 10, 20, 50, 100 items</li>
                      <li>• Results info: &quot;Showing X to Y of Z results&quot;</li>
                      <li>• Error handling with Alert component</li>
                      <li>• Maintains table position during sorting</li>
                      <li>• Previous/Next navigation with disabled states</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-muted/30 rounded-lg border">
                    <h3 className="font-semibold text-green-600 dark:text-green-400 mb-2">✅ Debug & Development</h3>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Real-time sort state display</li>
                      <li>• Navigation mode tracking</li>
                      <li>• Row count and selection info</li>
                      <li>• Performance monitoring ready</li>
                      <li>• Pagination state debugging</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Testing Guide */}
              <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-4">🧪 Testing Guide</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Basic Functionality</h4>
                    <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                      <li>1. Click any row to expand/collapse</li>
                      <li>2. Click column headers to sort</li>
                      <li>3. Test different sort directions</li>
                      <li>4. Try the Reset to Default button (resets both sort and columns)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Advanced Features</h4>
                    <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                      <li>5. Toggle column visibility</li>
                      <li>6. Change table size settings</li>
                      <li>7. Test keyboard navigation (←→↑↓ Space Enter Esc)</li>
                      <li>8. Switch between light/dark mode</li>
                      <li>9. Test loading with skeleton animation</li>
                      <li>10. Check responsive column spacing in expanded rows</li>
                      <li>11. Test pagination with different page sizes</li>
                      <li>12. Navigate through pages using ellipsis controls</li>
                      <li>13. Verify sorting works correctly with pagination</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 