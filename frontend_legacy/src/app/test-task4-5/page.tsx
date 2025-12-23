"use client"

import { useState } from 'react'
import { JobApplicationsTable } from '@/components/JobApplicationsTable'
import { JobApplication } from '@/types/models/job-application'

// Mock data generator for testing pagination
const generateMockJobApplications = (count: number): JobApplication[] => {
  const companies = ['Google', 'Microsoft', 'Apple', 'Amazon', 'Meta', 'Netflix', 'Tesla', 'SpaceX', 'Uber', 'Airbnb']
  const positions = ['Software Engineer', 'Senior Developer', 'Product Manager', 'Data Scientist', 'DevOps Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer']
  const statuses = ['applied', 'interview', 'rejected', 'offer', 'withdrawn', 'accepted'] as const
  const types = ['full-time', 'part-time', 'contract', 'internship'] as const
  const workArrangements = ['remote', 'hybrid', 'in_office'] as const

  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    company: companies[i % companies.length],
    position: positions[i % positions.length],
    status: statuses[i % statuses.length],
    type: types[i % types.length],
    salary: Math.floor(Math.random() * 100000) + 50000,
    workArrangement: workArrangements[i % workArrangements.length],
    dateApplied: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
    isStarred: Math.random() > 0.7,
    description: `Job description for ${positions[i % positions.length]} at ${companies[i % companies.length]}. This is a detailed description that shows how the table handles longer text content and truncation.`,
    compatibilityScore: Math.floor(Math.random() * 10) + 1,
    notes: Math.random() > 0.5 ? `Notes for application ${i + 1}` : undefined,
    jobLink: `https://example.com/job/${i + 1}`,
    followUpDate: Math.random() > 0.6 ? new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
    deadline: Math.random() > 0.7 ? new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString() : undefined,
    tags: Math.random() > 0.5 ? [
      { id: 1, name: 'JavaScript', userId: 1, createdAt: new Date().toISOString() },
      { id: 2, name: 'React', userId: 1, createdAt: new Date().toISOString() }
    ] : [],
    jobConnections: Math.random() > 0.8 ? [
      { id: 1, name: 'John Doe', role: 'Recruiter', connectionType: 'professional' }
    ] : [],
    documents: Math.random() > 0.7 ? [
      { id: 1, originalName: 'resume.pdf', mimeType: 'application/pdf', type: 'resume' }
    ] : [],
    userId: 1,
    createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
  }))
}

export default function TestTask45Page() {
  const [dataSize, setDataSize] = useState(25)
  const [showError, setShowError] = useState(false)
  const [mockData, setMockData] = useState(generateMockJobApplications(25))
  
  const regenerateData = (newSize: number) => {
    setDataSize(newSize)
    setMockData(generateMockJobApplications(newSize))
  }

  const testError = showError ? "Failed to load job applications. Please try again later." : undefined

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Task 4.5 - Pagination & Loading States Test</h1>
        <p className="text-muted-foreground">
          Testing pagination controls, page size selection, loading states, error handling, and smooth transitions.
        </p>
      </div>

      {/* Test Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg border">
        <div className="space-y-2">
          <label className="text-sm font-medium">Data Size</label>
          <div className="flex flex-wrap gap-2">
            {[0, 5, 15, 25, 50, 100, 250].map(size => (
              <button
                key={size}
                onClick={() => regenerateData(size)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  dataSize === size 
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {size === 0 ? 'Empty' : size}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Error State</label>
          <div>
            <button
              onClick={() => setShowError(!showError)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                showError 
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {showError ? 'Hide Error' : 'Show Error'}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Current Data</label>
          <div className="text-sm text-muted-foreground">
            {mockData.length} job applications
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Test Focus</label>
          <div className="text-xs text-muted-foreground">
            • Pagination controls<br/>
            • Page size selection<br/>
            • Error handling<br/>
            • Loading states<br/>
            • Empty states
          </div>
        </div>
      </div>

      {/* Test Scenarios */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Pagination Test Scenarios</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded border">
              <h3 className="font-medium text-green-800 dark:text-green-400">✅ Large Dataset (250 items)</h3>
              <p className="text-green-600 dark:text-green-300">Test pagination with many pages, ellipsis behavior</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded border">
              <h3 className="font-medium text-blue-800 dark:text-blue-400">✅ Medium Dataset (50 items)</h3>
              <p className="text-blue-600 dark:text-blue-300">Test page size changes, sorting with pagination</p>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded border">
              <h3 className="font-medium text-orange-800 dark:text-orange-400">✅ Small Dataset (5-15 items)</h3>
              <p className="text-orange-600 dark:text-orange-300">Test single page behavior, edge cases</p>
            </div>
          </div>
        </div>

        {/* Main Table Component */}
        <JobApplicationsTable 
          data={mockData}
          showControls={true}
          showDebugInfo={true}
          error={testError}
          defaultPageSize={10}
          pageSizeOptions={[5, 10, 20, 50, 100]}
          className="w-full"
        />
      </div>

      {/* Test Instructions */}
      <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border">
        <h3 className="font-semibold text-blue-800 dark:text-blue-400">Testing Checklist for Task 4.5:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">Pagination Controls:</h4>
            <ul className="space-y-1 text-blue-600 dark:text-blue-300">
              <li>• Previous/Next buttons work correctly</li>
              <li>• Page numbers are clickable and accurate</li>
              <li>• Ellipsis appears for large page counts</li>
              <li>• First/last page navigation works</li>
              <li>• Disabled states show properly</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Page Size Selection:</h4>
            <ul className="space-y-1 text-blue-600 dark:text-blue-300">
              <li>• Dropdown shows all size options</li>
              <li>• Changing size resets to page 1</li>
              <li>• Table updates correctly</li>
              <li>• Page count updates appropriately</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Error Handling:</h4>
            <ul className="space-y-1 text-blue-600 dark:text-blue-300">
              <li>• Error alert displays properly</li>
              <li>• Table is hidden during error state</li>
              <li>• Pagination hidden during error</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">States & Transitions:</h4>
            <ul className="space-y-1 text-blue-600 dark:text-blue-300">
              <li>• Loading skeleton shows properly</li>
              <li>• Empty state displays correctly</li>
              <li>• Smooth transitions between states</li>
              <li>• Sorting maintains pagination</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 