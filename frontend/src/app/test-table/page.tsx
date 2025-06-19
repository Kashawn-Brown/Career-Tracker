"use client"

import { JobApplicationsTable } from "@/components/JobApplicationsTable"
import { JobApplication } from "@/types/models/job-application"

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