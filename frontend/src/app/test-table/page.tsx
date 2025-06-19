"use client"

import { JobApplicationsTable } from "@/components/JobApplicationsTable"
import { JobApplication, JobApplicationStatus, JobApplicationType } from "@/types/models/job-application"

// Sample data for testing the table component
const sampleData: JobApplication[] = [
  {
    id: 1,
    userId: 1,
    company: "Google",
    position: "Senior Software Engineer",
    status: JobApplicationStatus.INTERVIEW,
    type: JobApplicationType.FULL_TIME,
    salary: 150000,
    dateApplied: "2024-01-15T00:00:00Z",
    description: "Full stack development role",
    notes: "Technical interview scheduled",
    createdAt: "2024-01-15T00:00:00Z",
    updatedAt: "2024-01-20T00:00:00Z"
  },
  {
    id: 2,
    userId: 1,
    company: "Microsoft",
    position: "Frontend Developer",
    status: JobApplicationStatus.APPLIED,
    type: JobApplicationType.FULL_TIME,
    salary: 130000,
    dateApplied: "2024-01-12T00:00:00Z",
    description: "React and TypeScript focused role",
    notes: "Waiting for response",
    createdAt: "2024-01-12T00:00:00Z",
    updatedAt: "2024-01-12T00:00:00Z"
  },
  {
    id: 3,
    userId: 1,
    company: "Amazon",
    position: "Software Development Engineer",
    status: JobApplicationStatus.OFFER,
    type: JobApplicationType.FULL_TIME,
    salary: 165000,
    dateApplied: "2024-01-08T00:00:00Z",
    description: "AWS focused backend development",
    notes: "Offer received, considering",
    createdAt: "2024-01-08T00:00:00Z",
    updatedAt: "2024-01-25T00:00:00Z"
  },
  {
    id: 4,
    userId: 1,
    company: "Startup Inc",
    position: "Full Stack Developer",
    status: JobApplicationStatus.REJECTED,
    type: JobApplicationType.FULL_TIME,
    salary: 95000,
    dateApplied: "2024-01-05T00:00:00Z",
    description: "Early stage startup",
    notes: "Not a good fit",
    createdAt: "2024-01-05T00:00:00Z",
    updatedAt: "2024-01-18T00:00:00Z"
  },
  {
    id: 5,
    userId: 1,
    company: "Freelance Client",
    position: "React Developer",
    status: JobApplicationStatus.WITHDRAWN,
    type: JobApplicationType.CONTRACT,
    salary: undefined, // Test undefined salary
    dateApplied: "2024-01-03T00:00:00Z",
    description: "Short term contract",
    notes: "Client changed requirements",
    createdAt: "2024-01-03T00:00:00Z",
    updatedAt: "2024-01-10T00:00:00Z"
  },
  {
    id: 6,
    userId: 1,
    company: "Local Business",
    position: "Part-time Developer",
    status: JobApplicationStatus.APPLIED,
    type: JobApplicationType.PART_TIME,
    salary: 25000,
    dateApplied: "2024-01-01T00:00:00Z",
    description: "Local web development",
    notes: "Flexible hours",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  }
]

export default function TestTablePage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Job Applications Table Test</h1>
        <p className="text-muted-foreground">
          Testing the core table component with column definitions for Task 4.3
        </p>
      </div>

      <div className="space-y-8">
        {/* Table with data */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Table with Sample Data</h2>
          <JobApplicationsTable data={sampleData} />
        </div>

        {/* Table with no data */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Table with No Data (Empty State)</h2>
          <JobApplicationsTable data={[]} />
        </div>

        {/* Responsive test */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Features Tested</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h3 className="font-medium">Column Types:</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>✓ Text columns (company, position)</li>
                <li>✓ Date formatting (dateApplied)</li>
                <li>✓ Enum formatting with colors (status, type)</li>
                <li>✓ Currency formatting (salary)</li>
                <li>✓ Null/undefined value handling</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">Features:</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>✓ Responsive table container</li>
                <li>✓ Accessibility attributes (roles, aria-sort)</li>
                <li>✓ Hover states on rows</li>
                <li>✓ Status color coding</li>
                <li>✓ Empty state handling</li>
                <li>✓ Proper TypeScript typing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 