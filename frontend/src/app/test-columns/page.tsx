"use client"

import { useState, useEffect, useCallback } from "react"
import { JobApplication } from "@/types/models/job-application"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Star, Users, FileText, Tag as TagIcon, Plus, Briefcase, ChevronDown, ChevronRight } from "lucide-react"

// Sample data matching our updated schema
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
      { id: 2, name: "Senior Level", userId: 1, createdAt: "2024-01-15T00:00:00Z" },
      { id: 3, name: "Tech Giant", userId: 1, createdAt: "2024-01-15T00:00:00Z" }
    ],
    jobConnections: [
      { id: 1, name: "Sarah Chen", role: "Engineering Manager", company: "Google", connectionType: "recruiter", email: "sarah.chen@google.com", contactId: 1 },
      { id: 2, name: "Mike Johnson", role: "Senior Engineer", company: "Google", connectionType: "referral", email: "mike.j@google.com", contactId: 2 }
    ],
    documents: [
      { id: 1, originalName: "Resume_Google.pdf", mimeType: "application/pdf", fileSize: 245760, type: "resume" },
      { id: 2, originalName: "Cover_Letter_Google.pdf", mimeType: "application/pdf", fileSize: 180240, type: "cover_letter" }
    ]
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
      { id: 4, name: "Frontend", userId: 1, createdAt: "2024-01-12T00:00:00Z" },
      { id: 5, name: "Remote", userId: 1, createdAt: "2024-01-12T00:00:00Z" }
    ],
    jobConnections: [
      { id: 3, name: "Lisa Wang", role: "Talent Acquisition", company: "Microsoft", connectionType: "recruiter", email: "lisa.wang@microsoft.com", contactId: 3 }
    ],
    documents: [
      { id: 3, originalName: "Resume_Microsoft.pdf", mimeType: "application/pdf", fileSize: 230120, type: "resume" }
    ]
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
      { id: 6, name: "Backend", userId: 1, createdAt: "2024-01-08T00:00:00Z" },
      { id: 7, name: "AWS", userId: 1, createdAt: "2024-01-08T00:00:00Z" },
      { id: 8, name: "High Salary", userId: 1, createdAt: "2024-01-08T00:00:00Z" }
    ],
    jobConnections: [
      { id: 4, name: "David Kim", role: "Senior SDE", company: "Amazon", connectionType: "referral", email: "dkim@amazon.com", contactId: 4 },
      { id: 5, name: "Jennifer Martinez", role: "Hiring Manager", company: "Amazon", connectionType: "hiring_manager", email: "jmartinez@amazon.com", contactId: 5 }
    ],
    documents: [
      { id: 4, originalName: "Resume_Amazon.pdf", mimeType: "application/pdf", fileSize: 255340, type: "resume" },
      { id: 5, originalName: "Cover_Letter_Amazon.pdf", mimeType: "application/pdf", fileSize: 189560, type: "cover_letter" },
      { id: 6, originalName: "Portfolio.pdf", mimeType: "application/pdf", fileSize: 1024000, type: "portfolio" }
    ]
  }
]

// Define all possible columns with metadata
const ALL_COLUMNS = {
  starred: { key: 'isStarred', label: '', displayName: 'Starred Applications', required: false, width: 'w-12' },
  company: { key: 'company', label: 'Company', displayName: 'Company', required: true, width: 'min-w-32' },
  position: { key: 'position', label: 'Position', displayName: 'Position', required: true, width: 'min-w-48' },
  status: { key: 'status', label: 'Status', displayName: 'Status', required: true, width: 'min-w-24' },
  type: { key: 'type', label: 'Type', displayName: 'Type', required: true, width: 'min-w-24' },
  salary: { key: 'salary', label: 'Salary', displayName: 'Salary', required: false, width: 'min-w-24' },
  workArrangement: { key: 'workArrangement', label: 'Work Style', displayName: 'Work Arrangement', required: false, width: 'min-w-24' },
  dateApplied: { key: 'dateApplied', label: 'Date Applied', displayName: 'Date Applied', required: false, width: 'min-w-28' },
  description: { key: 'description', label: 'Job Description', displayName: 'Job Description', required: false, width: 'min-w-40' },
  jobLink: { key: 'jobLink', label: 'Job Link', displayName: 'Job Link', required: false, width: 'min-w-20' },
  compatibilityScore: { key: 'compatibilityScore', label: 'Score', displayName: 'Compatibility Score', required: false, width: 'min-w-16' },
  followUpDate: { key: 'followUpDate', label: 'Follow Up', displayName: 'Follow Up Date', required: false, width: 'min-w-28' },
  deadline: { key: 'deadline', label: 'Deadline', displayName: 'Application Deadline', required: false, width: 'min-w-28' },
  tags: { key: 'tags', label: 'Tags', displayName: 'Tags', required: false, width: 'min-w-32' },
  jobConnections: { key: 'jobConnections', label: 'Connections', displayName: 'Job Connections', required: false, width: 'min-w-32' },
  documents: { key: 'documents', label: 'Documents', displayName: 'Documents', required: false, width: 'min-w-28' },
  notes: { key: 'notes', label: 'Notes', displayName: 'Notes', required: false, width: 'min-w-32' }
} as const

// Define the order in which columns should appear
const COLUMN_ORDER: ColumnKey[] = [
  'starred', 'company', 'position', 'status', 'type', 'salary', 'workArrangement', 'dateApplied', 
  'description', 'compatibilityScore', 'jobLink', 'followUpDate', 'deadline', 'tags', 'jobConnections', 'documents', 'notes'
]

// Default visible columns
const DEFAULT_VISIBLE_COLUMNS = [
  'starred', 'company', 'position', 'status', 'type', 'salary', 'workArrangement', 'dateApplied'
]

type ColumnKey = keyof typeof ALL_COLUMNS

export default function TestColumnsPage() {
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(DEFAULT_VISIBLE_COLUMNS as ColumnKey[])
  const [showColumnControls, setShowColumnControls] = useState(false)
  const [starredAsColumn, setStarredAsColumn] = useState(true) // Toggle between column vs attached
  const [textSize, setTextSize] = useState('normal') // 'small', 'normal', 'large', 'extra-large'
  
  // New state for features
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(-1)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [data, setData] = useState<JobApplication[]>(sampleData)

  // Get CSS classes for text size scaling
  const getSizeClasses = () => {
    switch (textSize) {
      case 'small':
        return {
          table: 'text-xs',
          cell: 'px-2 py-1',
          icon: 'h-3 w-3',
          badge: 'text-xs px-1.5 py-0.5',
          header: 'px-2 py-2 text-xs font-medium'
        }
      case 'normal':
        return {
          table: 'text-sm',
          cell: 'px-3 py-2',
          icon: 'h-4 w-4',
          badge: 'text-xs px-2 py-1',
          header: 'px-3 py-3 text-sm font-medium'
        }
      case 'large':
        return {
          table: 'text-base',
          cell: 'px-4 py-3',
          icon: 'h-5 w-5',
          badge: 'text-sm px-2.5 py-1.5',
          header: 'px-4 py-4 text-base font-medium'
        }
      case 'extra-large':
        return {
          table: 'text-lg',
          cell: 'px-5 py-4',
          icon: 'h-6 w-6',
          badge: 'text-base px-3 py-2',
          header: 'px-5 py-5 text-lg font-medium'
        }
      default:
        return {
          table: 'text-sm',
          cell: 'px-3 py-2',
          icon: 'h-4 w-4',
          badge: 'text-xs px-2 py-1',
          header: 'px-3 py-3 text-sm font-medium'
        }
    }
  }

  const sizeClasses = getSizeClasses()

  // Keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (data.length === 0) return
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setSelectedRowIndex(prev => Math.min(prev + 1, data.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setSelectedRowIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (selectedRowIndex >= 0) {
          toggleRowExpansion(data[selectedRowIndex].id)
        }
        break
      case 'Escape':
        event.preventDefault()
        setSelectedRowIndex(-1)
        break
    }
  }, [data, selectedRowIndex])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Row expansion
  const toggleRowExpansion = (jobId: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(jobId)) {
        newSet.delete(jobId)
      } else {
        newSet.add(jobId)
      }
      return newSet
    })
  }

  // Loading simulation
  const simulateLoading = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 2000)
  }

  const toggleColumn = (columnKey: ColumnKey) => {
    if (ALL_COLUMNS[columnKey].required) return // Don't allow hiding required columns
    
    setVisibleColumns(prev => {
      const newColumns = prev.includes(columnKey)
        ? prev.filter(col => col !== columnKey)
        : [...prev, columnKey]
      
      // Sort columns according to the predefined order
      return COLUMN_ORDER.filter(col => newColumns.includes(col))
    })
  }

  const toggleShowAll = () => {
    const allColumnsVisible = COLUMN_ORDER.every(col => visibleColumns.includes(col))
    
    if (allColumnsVisible) {
      // Hide all non-required columns
      setVisibleColumns(COLUMN_ORDER.filter(col => ALL_COLUMNS[col].required))
    } else {
      // Show all columns
      setVisibleColumns([...COLUMN_ORDER])
    }
  }

  const formatCellValue = (value: any, columnKey: ColumnKey, sizeClasses: any) => {
    if (value === undefined || value === null) return '-'
    
    switch (columnKey) {
      case 'starred':
        return (
          <Star 
            className={`${sizeClasses.icon} ${value ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'}`}
          />
        )
      case 'salary':
        return typeof value === 'number' ? `$${value.toLocaleString()}` : '-'
      case 'dateApplied':
      case 'followUpDate':
      case 'deadline':
        if (!value) return '-'
        return new Date(value).toLocaleDateString()
      case 'jobLink':
        return value ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Link
          </a>
        ) : '-'
      case 'status':
        return (
          <span className={`${sizeClasses.badge} rounded-full font-medium inline-flex items-center gap-1 ${
            value === 'offer' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
            value === 'interview' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
            value === 'applied' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
            value === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
            'bg-muted text-muted-foreground'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              value === 'offer' ? 'bg-green-600 dark:bg-green-400' :
              value === 'interview' ? 'bg-blue-600 dark:bg-blue-400' :
              value === 'applied' ? 'bg-yellow-600 dark:bg-yellow-400' :
              value === 'rejected' ? 'bg-red-600 dark:bg-red-400' :
              'bg-muted-foreground'
            }`} />
            {value}
          </span>
        )
      case 'type':
        return (
          <span className="capitalize">
            {value?.replace('-', ' ')}
          </span>
        )
      case 'workArrangement':
        return (
          <span className="capitalize">
            {value?.replace('_', ' ')}
          </span>
        )
      case 'compatibilityScore':
        return value ? (
          <span className={`font-medium ${
            value >= 8 ? 'text-green-600' :
            value >= 6 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {value}/10
          </span>
        ) : '-'
      case 'tags':
        return value && value.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {value.slice(0, 2).map((tag: any) => (
              <span 
                key={tag.id}
                className={`${sizeClasses.badge} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors`}
                title={`Click to filter by ${tag.name}`}
              >
                {tag.name}
              </span>
            ))}
            {value.length > 2 && (
              <span className={`${sizeClasses.badge} text-muted-foreground`}>+{value.length - 2}</span>
            )}
          </div>
        ) : '-'
      case 'jobConnections':
        return value && value.length > 0 ? (
          <div className="flex items-center gap-1">
            <Users className={`${sizeClasses.icon} text-gray-500`} />
            <span className="cursor-pointer hover:text-blue-600" title="Click to view contacts">
              {value[0].name}
              {value.length > 1 && <span className="text-gray-500"> +{value.length - 1}</span>}
            </span>
          </div>
        ) : '-'
      case 'documents':
        return value && value.length > 0 ? (
          <div className="flex items-center gap-1">
            <FileText className={`${sizeClasses.icon} text-gray-500`} />
            <span className="cursor-pointer hover:text-blue-600" title="Click to view documents">
              {value[0].originalName}
              {value.length > 1 && <span className="text-gray-500"> +{value.length - 1}</span>}
            </span>
          </div>
        ) : '-'
      case 'description':
        return value ? (
          <div className="max-w-40 overflow-hidden">
            <span className="text-gray-700 text-sm block truncate" title={value}>
              {value}
            </span>
          </div>
        ) : '-'
      default:
        return String(value)
    }
  }

  const getValueFromJobApplication = (job: JobApplication, columnKey: ColumnKey): any => {
    switch (columnKey) {
      case 'starred': return job.isStarred
      case 'company': return job.company
      case 'position': return job.position
      case 'status': return job.status
      case 'type': return job.type
      case 'salary': return job.salary
      case 'workArrangement': return job.workArrangement
      case 'dateApplied': return job.dateApplied
      case 'description': return job.description
      case 'jobLink': return job.jobLink
      case 'compatibilityScore': return job.compatibilityScore
      case 'followUpDate': return job.followUpDate
      case 'deadline': return job.deadline
      case 'tags': return job.tags
      case 'jobConnections': return job.jobConnections
      case 'documents': return job.documents
      case 'notes': return job.notes
      default: return undefined
    }
  }

  // Empty State Component
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-24 h-24 bg-muted/30 rounded-full flex items-center justify-center mb-6">
        <Briefcase className="w-12 h-12 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">No Job Applications Yet</h3>
      <p className="text-muted-foreground text-center mb-6 max-w-md">
        Start tracking your job search journey by adding your first application. 
        Keep track of companies, positions, and follow-ups all in one place.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => setData(sampleData)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Sample Data
        </Button>
        <Button variant="outline" onClick={() => setData([])}>
          Clear Data
        </Button>
      </div>
    </div>
  )

  // Loading Skeleton Component
  const LoadingSkeleton = () => (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 p-3 animate-pulse">
          {visibleColumns.map((col, colIndex) => (
            <div 
              key={colIndex}
              className={`bg-muted/30 rounded h-4 ${
                col === 'company' ? 'w-32' :
                col === 'position' ? 'w-48' :
                col === 'status' ? 'w-20' :
                col === 'starred' ? 'w-6' :
                'w-24'
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  )

  // Expanded Row Details Component
  const ExpandedRowDetails = ({ job }: { job: JobApplication }) => (
    <TableRow>
      <TableCell colSpan={visibleColumns.length} className="bg-muted/20 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-foreground mb-2">Job Details</h4>
              <div className="space-y-2 text-sm">
                {job.description && (
                  <div>
                    <span className="text-muted-foreground">Description:</span>
                    <p className="text-foreground mt-1">{job.description}</p>
                  </div>
                )}
                {job.jobLink && (
                  <div>
                    <span className="text-muted-foreground">Job Link:</span>
                    <a href={job.jobLink} target="_blank" rel="noopener noreferrer" 
                       className="text-blue-600 hover:underline ml-2">
                      View Original Posting
                    </a>
                  </div>
                )}
                {job.salary && (
                  <div>
                    <span className="text-muted-foreground">Salary:</span>
                    <span className="text-foreground ml-2">${job.salary.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h4 className="font-medium text-foreground mb-2">Timeline</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applied:</span>
                  <span className="text-foreground">{new Date(job.dateApplied).toLocaleDateString()}</span>
                </div>
                {job.followUpDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Follow Up:</span>
                    <span className="text-foreground">{new Date(job.followUpDate).toLocaleDateString()}</span>
                  </div>
                )}
                {job.deadline && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deadline:</span>
                    <span className="text-foreground">{new Date(job.deadline).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Tags */}
            {job.tags && job.tags.length > 0 && (
              <div>
                <h4 className="font-medium text-foreground mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {job.tags.map(tag => (
                    <span key={tag.id} className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded-full text-xs">
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Job Connections */}
            {job.jobConnections && job.jobConnections.length > 0 && (
              <div>
                <h4 className="font-medium text-foreground mb-2">Connections</h4>
                <div className="space-y-2">
                  {job.jobConnections.map(connection => (
                    <div key={connection.id} className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <span className="text-foreground font-medium">{connection.name}</span>
                        {connection.role && (
                          <span className="text-muted-foreground ml-1">({connection.role})</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            {job.documents && job.documents.length > 0 && (
              <div>
                <h4 className="font-medium text-foreground mb-2">Documents</h4>
                <div className="space-y-2">
                  {job.documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{doc.originalName}</span>
                      <span className="text-muted-foreground">({doc.type})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {job.notes && (
              <div>
                <h4 className="font-medium text-foreground mb-2">Notes</h4>
                <p className="text-sm text-foreground bg-muted/30 p-3 rounded">{job.notes}</p>
              </div>
            )}
          </div>
        </div>
      </TableCell>
    </TableRow>
  )

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Column Customization Test</h1>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setStarredAsColumn(!starredAsColumn)}
          >
            Starred: {starredAsColumn ? 'Column' : 'Attached'}
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowColumnControls(!showColumnControls)}
          >
            {showColumnControls ? 'Hide' : 'Show'} Column Controls
          </Button>
          <Button 
            variant="outline"
            onClick={simulateLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Test Loading'}
          </Button>
          
          {/* Accessibility Size Controls */}
          <div className="flex items-center gap-2 border rounded-md px-3 py-1">
            <span className="text-sm font-medium">Size:</span>
            <select 
              value={textSize} 
              onChange={(e) => setTextSize(e.target.value)}
              className="text-sm border-none bg-transparent focus:outline-none"
            >
              <option value="small">Small</option>
              <option value="normal">Normal</option>
              <option value="large">Large</option>
              <option value="extra-large">Extra Large</option>
            </select>
          </div>
        </div>
      </div>

      {/* Keyboard Navigation Help */}
      {data.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
          <p className="text-blue-800 dark:text-blue-300">
            <strong>Keyboard Navigation:</strong> Use ↑↓ arrow keys to navigate, Enter/Space to expand row details, Esc to deselect
          </p>
        </div>
      )}

      {/* Column Visibility Controls */}
      {showColumnControls && (
        <div className="bg-muted/50 p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Customize Visible Columns</h3>
            <button
              onClick={toggleShowAll}
              className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 transition-colors"
            >
              {COLUMN_ORDER.every(col => visibleColumns.includes(col)) ? 'Hide Optional' : 'Show All'}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {Object.entries(ALL_COLUMNS).map(([key, column]) => (
              <label key={key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(key as ColumnKey)}
                  onChange={() => toggleColumn(key as ColumnKey)}
                  disabled={column.required}
                  className="rounded accent-primary"
                />
                <span className={`text-sm text-foreground ${column.required ? 'font-medium' : ''}`}>
                  {column.displayName}
                  {column.required && <span className="text-destructive ml-1">*</span>}
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            * Required columns cannot be hidden
          </p>
        </div>
      )}

      {/* Table Implementation */}
      {isLoading ? (
        <div className="border rounded-lg overflow-hidden p-4">
          <LoadingSkeleton />
        </div>
      ) : data.length === 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <EmptyState />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table className={sizeClasses.table}>
              <TableHeader>
                <TableRow className="border-b border-border/60">
                  {visibleColumns.map((columnKey) => {
                    const column = ALL_COLUMNS[columnKey]
                    return (
                      <TableHead 
                        key={columnKey}
                        className={`${column.width} ${sizeClasses.header} ${columnKey === 'starred' ? 'text-center' : ''} bg-muted/30 font-semibold text-foreground sticky top-0 z-10`}
                      >
                        <div className="flex items-center gap-1">
                          {column.label}
                          {column.label && (
                            <span className="text-muted-foreground text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                              ↕
                            </span>
                          )}
                        </div>
                      </TableHead>
                    )
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((job, index) => (
                  <>
                    <TableRow 
                      key={job.id} 
                      className={`hover:bg-muted/50 transition-colors duration-150 cursor-pointer border-b border-border/50 ${
                        selectedRowIndex === index ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      onClick={() => {
                        setSelectedRowIndex(index)
                        toggleRowExpansion(job.id)
                      }}
                    >
                      {visibleColumns.map((columnKey) => {
                        const value = getValueFromJobApplication(job, columnKey)
                        return (
                          <TableCell 
                            key={`${job.id}-${columnKey}`}
                            className={`${sizeClasses.cell} ${columnKey === 'starred' ? 'text-center' : ''} ${
                              columnKey === 'company' ? 'font-semibold text-foreground' : 
                              columnKey === 'position' ? 'font-medium text-foreground' :
                              'text-muted-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {columnKey === visibleColumns[0] && (
                                <span className="text-muted-foreground">
                                  {expandedRows.has(job.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </span>
                              )}
                              {formatCellValue(value, columnKey, sizeClasses)}
                            </div>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                    {expandedRows.has(job.id) && <ExpandedRowDetails job={job} />}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Alternative: Starred as "Attached" to left side */}
      {!starredAsColumn && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Alternative: Starred "Attached" to Left Side</h2>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table className={sizeClasses.table}>
                <TableHeader>
                  <TableRow className="border-b border-border/60">
                    {/* Empty header for attached starred column with separation line */}
                    {visibleColumns.includes('starred') && (
                      <TableHead className={`w-8 border-r-2 border-muted bg-muted/30 sticky top-0 z-10 ${sizeClasses.header}`}></TableHead>
                    )}
                    {visibleColumns.filter(col => col !== 'starred').map((columnKey) => {
                      const column = ALL_COLUMNS[columnKey]
                      return (
                        <TableHead key={columnKey} className={`${column.width} ${sizeClasses.header} bg-muted/30 font-semibold text-foreground sticky top-0 z-10`}>
                          <div className="flex items-center gap-1">
                            {column.label}
                            {column.label && (
                              <span className="text-muted-foreground text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                ↕
                              </span>
                            )}
                          </div>
                        </TableHead>
                      )
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((job, index) => (
                    <>
                      <TableRow 
                        key={job.id} 
                        className={`hover:bg-muted/50 transition-colors duration-150 cursor-pointer border-b border-border/50 ${
                          selectedRowIndex === index ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                        onClick={() => {
                          setSelectedRowIndex(index)
                          toggleRowExpansion(job.id)
                        }}
                      >
                        {/* Attached starred column */}
                        {visibleColumns.includes('starred') && (
                          <TableCell className={`border-r-2 border-muted ${sizeClasses.cell}`}>
                            <div className="flex justify-center">
                              <Star 
                                className={`${sizeClasses.icon} ${job.isStarred ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`}
                              />
                            </div>
                          </TableCell>
                        )}
                        {visibleColumns.filter(col => col !== 'starred').map((columnKey, colIndex) => {
                          const value = getValueFromJobApplication(job, columnKey)
                          const isFirstColumn = colIndex === 0
                          return (
                            <TableCell 
                              key={`${job.id}-${columnKey}`} 
                              className={`${sizeClasses.cell} ${
                                columnKey === 'company' ? 'font-semibold text-foreground' : 
                                columnKey === 'position' ? 'font-medium text-foreground' :
                                'text-muted-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isFirstColumn && (
                                  <span className="text-muted-foreground">
                                    {expandedRows.has(job.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </span>
                                )}
                                {formatCellValue(value, columnKey, sizeClasses)}
                              </div>
                            </TableCell>
                          )
                        })}
                      </TableRow>
                      {expandedRows.has(job.id) && <ExpandedRowDetails job={job} />}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info */}
      <div className="bg-muted/30 p-4 rounded-lg border">
        <h3 className="font-semibold mb-2 text-foreground">Debug Info</h3>
        <p className="text-sm text-foreground"><strong>Visible Columns:</strong> {visibleColumns.join(', ')}</p>
        <p className="text-sm text-foreground"><strong>Starred Display:</strong> {starredAsColumn ? 'As Column' : 'Attached to Left'}</p>
        <p className="text-sm text-foreground"><strong>Text Size:</strong> {textSize}</p>
        <p className="text-sm text-foreground"><strong>Total Columns Available:</strong> {Object.keys(ALL_COLUMNS).length}</p>
        <p className="text-sm text-foreground"><strong>Required Columns:</strong> {Object.entries(ALL_COLUMNS).filter(([_, col]) => col.required).map(([key]) => ALL_COLUMNS[key as ColumnKey].displayName).join(', ')}</p>
      </div>
    </div>
  )
} 