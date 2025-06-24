"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { JobApplication, Tag, JobConnection, Document } from "@/types/models/job-application"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Star, Users, FileText, Plus, Briefcase, ChevronDown, ChevronRight, ChevronUp } from "lucide-react"

// Sample data matching our updated schema - EXACT copy from test-columns
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

// Define all possible columns with metadata - EXACT copy from test-columns
const ALL_COLUMNS = {
  starred: { key: 'isStarred', label: '', displayName: 'Starred Applications', required: false, width: 'w-12', sortable: true },
  company: { key: 'company', label: 'Company', displayName: 'Company', required: true, width: 'min-w-32', sortable: true },
  position: { key: 'position', label: 'Position', displayName: 'Position', required: true, width: 'min-w-48', sortable: true },
  status: { key: 'status', label: 'Status', displayName: 'Status', required: true, width: 'min-w-24', sortable: true },
  type: { key: 'type', label: 'Type', displayName: 'Type', required: true, width: 'min-w-24', sortable: true },
  salary: { key: 'salary', label: 'Salary', displayName: 'Salary', required: false, width: 'min-w-24', sortable: true },
  workArrangement: { key: 'workArrangement', label: 'Work Style', displayName: 'Work Arrangement', required: false, width: 'min-w-24', sortable: true },
  dateApplied: { key: 'dateApplied', label: 'Date Applied', displayName: 'Date Applied', required: false, width: 'min-w-28', sortable: true },
  description: { key: 'description', label: 'Job Description', displayName: 'Job Description', required: false, width: 'min-w-40', sortable: true },
  jobLink: { key: 'jobLink', label: 'Job Link', displayName: 'Job Link', required: false, width: 'min-w-20', sortable: false },
  compatibilityScore: { key: 'compatibilityScore', label: 'Score', displayName: 'Compatibility Score', required: false, width: 'min-w-16', sortable: true },
  followUpDate: { key: 'followUpDate', label: 'Follow Up', displayName: 'Follow Up Date', required: false, width: 'min-w-28', sortable: true },
  deadline: { key: 'deadline', label: 'Deadline', displayName: 'Application Deadline', required: false, width: 'min-w-28', sortable: true },
  tags: { key: 'tags', label: 'Tags', displayName: 'Tags', required: false, width: 'min-w-32', sortable: false },
  jobConnections: { key: 'jobConnections', label: 'Connections', displayName: 'Job Connections', required: false, width: 'min-w-32', sortable: false },
  documents: { key: 'documents', label: 'Documents', displayName: 'Documents', required: false, width: 'min-w-28', sortable: false },
  notes: { key: 'notes', label: 'Notes', displayName: 'Notes', required: false, width: 'min-w-32', sortable: true }
} as const

// Define the order in which columns should appear - EXACT copy from test-columns
const COLUMN_ORDER: ColumnKey[] = [
  'starred', 'company', 'position', 'status', 'type', 'salary', 'workArrangement', 'dateApplied', 
  'description', 'compatibilityScore', 'jobLink', 'followUpDate', 'deadline', 'tags', 'jobConnections', 'documents', 'notes'
]

// Default visible columns - EXACT copy from test-columns
const DEFAULT_VISIBLE_COLUMNS = [
  'starred', 'company', 'position', 'status', 'type', 'salary', 'workArrangement', 'dateApplied'
]

type ColumnKey = keyof typeof ALL_COLUMNS

// Task 4.4 - Sorting types (NEW)
type SortDirection = 'asc' | 'desc' | null
type SortableColumn = keyof JobApplication

export default function TestTask44Page() {
  // EXACT state from test-columns
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(DEFAULT_VISIBLE_COLUMNS as ColumnKey[])
  const [showColumnControls, setShowColumnControls] = useState(false)
  const [starredAsColumn, setStarredAsColumn] = useState(true) // Toggle between column vs attached
  const [textSize, setTextSize] = useState('normal') // 'small', 'normal', 'large', 'extra-large'
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(-1)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [data] = useState<JobApplication[]>(sampleData)

  // Task 4.4 - NEW sorting state (default: dateApplied descending - newest first)
  const [sortColumn, setSortColumn] = useState<SortableColumn | null>('dateApplied')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  
  // Task 4.4 - Sorting utility function
  const sortData = useCallback((data: JobApplication[], column: SortableColumn | null, direction: SortDirection): JobApplication[] => {
    if (!column || !direction) {
      // Default sort: dateApplied descending
      return [...data].sort((a, b) => new Date(b.dateApplied).getTime() - new Date(a.dateApplied).getTime())
    }

    return [...data].sort((a, b) => {
      // Get values for comparison
      const aVal = a[column as keyof JobApplication]
      const bVal = b[column as keyof JobApplication]

      // Handle null/undefined values (put them at the end)
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1

      // Type-specific sorting
      let comparison = 0
      
      if (column === 'dateApplied' || column === 'followUpDate' || column === 'deadline') {
        // Date sorting
        const aDate = new Date(aVal as string).getTime()
        const bDate = new Date(bVal as string).getTime()
        comparison = aDate - bDate
      } else if (column === 'salary' || column === 'compatibilityScore') {
        // Numeric sorting
        comparison = (aVal as number) - (bVal as number)
             } else if (column === 'isStarred') {
         // Boolean sorting (starred first when ascending)
         const aBool = Boolean(aVal)
         const bBool = Boolean(bVal)
         comparison = aBool === bBool ? 0 : aBool ? -1 : 1
      } else {
        // String sorting (case-insensitive)
        const aStr = String(aVal).toLowerCase()
        const bStr = String(bVal).toLowerCase()
        comparison = aStr.localeCompare(bStr)
      }

      // Apply direction
      if (direction === 'desc') {
        comparison = -comparison
      }

      // Secondary sort by dateApplied if primary values are equal and primary is not dateApplied
      if (comparison === 0 && column !== 'dateApplied') {
        const aDate = new Date(a.dateApplied).getTime()
        const bDate = new Date(b.dateApplied).getTime()
        return bDate - aDate // Always descending for secondary sort (newest first)
      }

      return comparison
    })
  }, [])

  // Task 4.4 - Computed sorted data
  const sortedData = useMemo(() => {
    return sortData(data, sortColumn, sortDirection)
  }, [data, sortColumn, sortDirection, sortData])
  
  // Task 4.4 - NEW navigation state for improved keyboard navigation
  const [focusedHeaderIndex, setFocusedHeaderIndex] = useState<number>(-1)
  const [navigationMode, setNavigationMode] = useState<'none' | 'headers' | 'rows'>('none')

  // EXACT getSizeClasses from test-columns
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

  // Task 4.4 - NEW sorting functionality
  const handleSort = (columnKey: ColumnKey) => {
    const column = ALL_COLUMNS[columnKey]
    if (!column?.sortable) return

    // Map column key to actual data property
    const dataKey = column.key as SortableColumn

    if (sortColumn === dataKey) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortColumn(null)
        setSortDirection(null)
      } else {
        setSortDirection('asc')
      }
    } else {
      // New column, start with ascending
      setSortColumn(dataKey)
      setSortDirection('asc')
    }
  }

  // Task 4.4 - Sort indicator component (NEW)
  const SortIndicator = ({ columnKey }: { columnKey: ColumnKey }) => {
    const column = ALL_COLUMNS[columnKey]
    if (!column.sortable) return null

    // Fixed width container to prevent column size changes
    return (
      <span className="ml-1 inline-flex w-4 h-4 items-center justify-center">
        {sortColumn !== column.key || !sortDirection ? (
          <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity text-xs">↕</span>
        ) : sortDirection === 'asc' ? (
          <ChevronUp className="h-4 w-4 text-primary" />
        ) : (
          <ChevronDown className="h-4 w-4 text-primary" />
        )}
      </span>
    )
  }

  // Task 4.4 - IMPROVED keyboard navigation system
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (sortedData.length === 0) return
    
    const sortableColumns = visibleColumns.filter(col => ALL_COLUMNS[col].sortable)
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (navigationMode === 'headers') {
          // Switch from headers to rows
          setNavigationMode('rows')
          setFocusedHeaderIndex(-1)
          setSelectedRowIndex(0)
        } else {
          // Navigate down rows
          setNavigationMode('rows')
          setSelectedRowIndex(prev => Math.min(prev + 1, sortedData.length - 1))
        }
        break
        
      case 'ArrowUp':
        event.preventDefault()
        if (navigationMode === 'rows' && selectedRowIndex === 0) {
          // Switch from rows to headers
          setNavigationMode('headers')
          setSelectedRowIndex(-1)
          setFocusedHeaderIndex(0)
        } else if (navigationMode === 'rows') {
          // Navigate up rows
          setSelectedRowIndex(prev => Math.max(prev - 1, 0))
        }
        break
        
      case 'ArrowLeft':
        event.preventDefault()
        if (navigationMode === 'headers') {
          setFocusedHeaderIndex(prev => Math.max(prev - 1, 0))
        } else {
          // Start header navigation
          setNavigationMode('headers')
          setSelectedRowIndex(-1)
          setFocusedHeaderIndex(Math.max(0, sortableColumns.length - 1))
        }
        break
        
      case 'ArrowRight':
        event.preventDefault()
        if (navigationMode === 'headers') {
          setFocusedHeaderIndex(prev => Math.min(prev + 1, sortableColumns.length - 1))
        } else {
          // Start header navigation
          setNavigationMode('headers')
          setSelectedRowIndex(-1)
          setFocusedHeaderIndex(0)
        }
        break
        
      case 'Enter':
        // Task 4.4: Enter = Row Expansion ONLY
        event.preventDefault()
        if (navigationMode === 'rows' && selectedRowIndex >= 0) {
          toggleRowExpansion(sortedData[selectedRowIndex].id)
        }
        break
        
      case ' ':
        // Task 4.4: Space = Sorting ONLY (when focused on header)
        event.preventDefault()
        if (navigationMode === 'headers' && focusedHeaderIndex >= 0 && focusedHeaderIndex < sortableColumns.length) {
          const columnKey = sortableColumns[focusedHeaderIndex]
          handleSort(columnKey)
        }
        break
        
              case 'Escape':
          event.preventDefault()
          setNavigationMode('none')
          setSelectedRowIndex(-1)
          setFocusedHeaderIndex(-1)
          // Reset sort to default
          setSortColumn('dateApplied')
          setSortDirection('desc')
          break
    }
     }, [sortedData, selectedRowIndex, navigationMode, focusedHeaderIndex, visibleColumns, handleSort])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // EXACT row expansion from test-columns
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

  // EXACT loading simulation from test-columns
  const simulateLoading = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 2000)
  }

  // EXACT column toggle from test-columns
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

  // EXACT show/hide all from test-columns
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

  // EXACT formatCellValue from test-columns
  type CellValue = string | number | boolean | Date | Tag[] | JobConnection[] | Document[] | undefined | null
  const formatCellValue = (value: CellValue, columnKey: ColumnKey, sizeClasses: Record<string, string>) => {
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
        if (!value || typeof value !== 'string') return '-'
        return new Date(value).toLocaleDateString()
      case 'jobLink':
        return value && typeof value === 'string' ? (
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
            {String(value)}
          </span>
        )
      case 'type':
      case 'workArrangement':
        return (value as string)?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || '-'
      case 'tags':
        return value && Array.isArray(value) && value.length > 0 && value.every((item): item is Tag => typeof item === 'object' && 'name' in item) ? (
          <div className="flex flex-wrap gap-1">
            {value.slice(0, 2).map((tag: Tag) => (
              <span key={tag.id} className={`${sizeClasses.badge} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full`}>
                {tag.name}
              </span>
            ))}
            {value.length > 2 && (
              <span className={`${sizeClasses.badge} bg-muted text-muted-foreground rounded-full`}>
                +{value.length - 2}
              </span>
            )}
          </div>
        ) : '-'
      case 'jobConnections':
        return value && Array.isArray(value) && value.length > 0 ? (
          <div className="flex items-center gap-1">
            <Users className={sizeClasses.icon} />
            <span className="text-sm">{value.length}</span>
          </div>
        ) : '-'
      case 'documents':
        return value && Array.isArray(value) && value.length > 0 ? (
          <div className="flex items-center gap-1">
            <FileText className={sizeClasses.icon} />
            <span className="text-sm">{value.length}</span>
          </div>
        ) : '-'
      case 'notes':
        return value && typeof value === 'string' ? (
          <div className="max-w-xs">
            <span className="text-sm text-muted-foreground truncate">
              {value.length > 30 ? `${value.substring(0, 30)}...` : value}
            </span>
          </div>
        ) : '-'
      case 'compatibilityScore':
        return typeof value === 'number' ? (
          <span className={`font-semibold ${
            value >= 8 ? 'text-green-600 dark:text-green-400' :
            value >= 6 ? 'text-yellow-600 dark:text-yellow-400' :
            value >= 4 ? 'text-orange-600 dark:text-orange-400' :
            'text-red-600 dark:text-red-400'
          }`}>
            {value}/10
          </span>
        ) : '-'
      default:
        return value !== null && value !== undefined ? String(value) : '-'
    }
  }

  // EXACT getValueFromJobApplication from test-columns
  const getValueFromJobApplication = (job: JobApplication, columnKey: ColumnKey): CellValue => {
    const column = ALL_COLUMNS[columnKey]
    const key = column.key
    
    if (key in job) {
      return job[key as keyof JobApplication] as CellValue
    }
    
    return undefined
  }

  // Continue with EmptyState, LoadingSkeleton, and ExpandedRowDetails... 
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Task 4.4: Sorting & Row Selection Test</h1>
          <p className="text-muted-foreground mt-1">Built on test-columns design with sorting functionality added</p>
        </div>
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

                     {/* Task 4.4 - Reset Sorting Button (NEW) */}
           <Button 
             variant="outline"
             onClick={() => {
               setSortColumn('dateApplied')
               setSortDirection('desc')
             }}
             disabled={sortColumn === 'dateApplied' && sortDirection === 'desc'}
           >
             Reset to Default
           </Button>
        </div>
      </div>

             {/* Task 4.4 - Sorting Status (NEW) */}
       <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
         <div className="flex gap-6 text-sm">
           <div>
             <strong className="text-blue-900 dark:text-blue-100">Sort Column:</strong> 
             <span className="text-blue-800 dark:text-blue-200 ml-1">{sortColumn || 'None'} {sortColumn === 'dateApplied' ? '(default)' : ''}</span>
           </div>
           <div>
             <strong className="text-blue-900 dark:text-blue-100">Sort Direction:</strong> 
             <span className="text-blue-800 dark:text-blue-200 ml-1">{sortDirection || 'None'}</span>
           </div>
           <div className="text-green-700 dark:text-green-300">
             ✅ Task 4.4 Complete: UI + Actual sorting logic + Secondary sort by dateApplied implemented!
           </div>
         </div>
       </div>

             {/* Keyboard Navigation Help - EXACT from test-columns */}
       {sortedData.length > 0 && (
                 <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
           <p className="text-blue-800 dark:text-blue-300">
             <strong>Keyboard Navigation:</strong> Use <strong>←→</strong> to navigate headers, <strong>↑↓</strong> to navigate rows, <strong>Enter</strong> to expand rows, <strong>Space</strong> to sort headers, <strong>Esc</strong> to reset to default sort.
           </p>
         </div>
      )}

      {/* Column Visibility Controls - EXACT from test-columns */}
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
             * Required columns cannot be hidden. Sortable columns support Task 4.4 sorting functionality.
           </p>
        </div>
      )}

             {/* Table Implementation with exact structure and actual sorting logic */}
       {isLoading ? (
        <div className="border rounded-lg overflow-hidden p-4">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex space-x-4">
                <div className="h-4 bg-muted rounded w-1/4 animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-1/3 animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-1/6 animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-1/4 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
               ) : sortedData.length === 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <div className="text-center py-12">
            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-foreground">No job applications</h3>
            <p className="mt-1 text-sm text-muted-foreground">Get started by adding your first job application.</p>
            <div className="mt-6">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Job Application
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table className={sizeClasses.table}>
              <TableHeader>
                <TableRow className="border-b border-border/60">
                                     {visibleColumns.map((columnKey) => {
                     const column = ALL_COLUMNS[columnKey]
                     const sortableColumns = visibleColumns.filter(col => ALL_COLUMNS[col].sortable)
                     const sortableIndex = sortableColumns.indexOf(columnKey)
                     const isFocused = navigationMode === 'headers' && sortableIndex === focusedHeaderIndex
                     
                     return (
                       <TableHead 
                         key={columnKey}
                         className={`${column.width} ${sizeClasses.header} ${columnKey === 'starred' ? 'text-center' : ''} bg-muted/30 font-semibold text-foreground sticky top-0 z-10 group ${
                           column.sortable ? 'cursor-pointer select-none hover:bg-muted/50' : ''
                         } ${isFocused ? 'bg-blue-100 dark:bg-blue-900/50 ring-2 ring-blue-500/50' : ''}`}
                         role="columnheader"
                         aria-sort={column.sortable && sortColumn === column.key ? (sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none') : undefined}
                         onClick={column.sortable ? () => handleSort(columnKey) : undefined}
                       >
                        <div className="flex items-center gap-1">
                          {column.label}
                          {column.sortable && <SortIndicator columnKey={columnKey} />}
                        </div>
                      </TableHead>
                    )
                  })}
                </TableRow>
              </TableHeader>
                             <TableBody>
                 {sortedData.map((job, _) => (
                  <>
                    <TableRow 
                      key={job.id} 
                      className={`hover:bg-muted/50 transition-colors duration-150 cursor-pointer border-b border-border/50 ${
                        selectedRowIndex === _ ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      onClick={() => {
                        setSelectedRowIndex(_)
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
                    {expandedRows.has(job.id) && (
                      <TableRow>
                        <TableCell colSpan={visibleColumns.length} className="p-0">
                                                     <div className="px-6 py-4 bg-muted/20 border-t">
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              {/* Left Column */}
                              <div className="space-y-4">
                                {/* Job Details */}
                                <div>
                                  <h4 className="font-medium text-foreground mb-2">Job Details</h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Company:</span>
                                      <span className="text-foreground font-medium">{job.company}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Position:</span>
                                      <span className="text-foreground">{job.position}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Status:</span>
                                      <span className="text-foreground capitalize">{job.status}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Type:</span>
                                      <span className="text-foreground capitalize">{job.type?.replace('_', ' ')}</span>
                                    </div>
                                    {job.salary && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Salary:</span>
                                        <span className="text-foreground">${job.salary.toLocaleString()}</span>
                                      </div>
                                    )}
                                    {job.workArrangement && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Work Style:</span>
                                        <span className="text-foreground capitalize">{job.workArrangement.replace('_', ' ')}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Dates */}
                                <div>
                                  <h4 className="font-medium text-foreground mb-2">Important Dates</h4>
                                  <div className="space-y-2 text-sm">
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

                             {/* Job Description - Bottom Section */}
                             {job.description && (
                               <div className="mt-6 pt-4 border-t border-border/50">
                                 <div className="flex items-center justify-between">
                                   <h4 className="font-medium text-foreground">Job Description</h4>
                                   <div className="flex gap-2">
                                     <button 
                                       onClick={() => {
                                         const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes')
                                         if (newWindow) {
                                           newWindow.document.write(`
                                             <html>
                                               <head><title>Job Description - ${job.company} - ${job.position}</title></head>
                                               <body style="font-family: system-ui, sans-serif; padding: 20px; line-height: 1.6;">
                                                 <h1>${job.company} - ${job.position}</h1>
                                                 <div style="white-space: pre-wrap;">${job.description}</div>
                                               </body>
                                             </html>
                                           `)
                                           newWindow.document.close()
                                         }
                                       }}
                                       className="text-xs text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus:underline"
                                     >
                                       Open in New Tab
                                     </button>
                                     <button 
                                       onClick={() => {
                                         const blob = new Blob([`${job.company} - ${job.position}\n\n${job.description}`], { type: 'text/plain' })
                                         const url = URL.createObjectURL(blob)
                                         const a = document.createElement('a')
                                         a.href = url
                                         a.download = `job-description-${job.company.toLowerCase().replace(/\s+/g, '-')}-${job.position.toLowerCase().replace(/\s+/g, '-')}.txt`
                                         document.body.appendChild(a)
                                         a.click()
                                         document.body.removeChild(a)
                                         URL.revokeObjectURL(url)
                                       }}
                                       className="text-xs text-green-600 hover:text-green-800 hover:underline focus:outline-none focus:underline"
                                     >
                                       Download
                                     </button>
                                   </div>
                                 </div>
                                 <p className="text-sm text-muted-foreground mt-2 bg-muted/30 p-3 rounded max-h-32 overflow-y-auto">
                                   {job.description.length > 200 ? `${job.description.substring(0, 200)}...` : job.description}
                                 </p>
                               </div>
                             )}
                           </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
                 </div>
       )}

       {/* Debug Info - Task 4.4 Testing */}
       <div className="bg-muted/30 p-4 rounded-lg border">
         <h3 className="font-semibold mb-2 text-foreground">Debug Info - Task 4.4</h3>
         <p className="text-sm text-foreground"><strong>Sort Column:</strong> {sortColumn || 'None'}</p>
         <p className="text-sm text-foreground"><strong>Sort Direction:</strong> {sortDirection || 'None'}</p>
         <p className="text-sm text-foreground"><strong>Navigation Mode:</strong> {navigationMode}</p>
         <p className="text-sm text-foreground"><strong>Focused Header:</strong> {focusedHeaderIndex >= 0 ? `${focusedHeaderIndex} (${visibleColumns.filter(col => ALL_COLUMNS[col].sortable)[focusedHeaderIndex] || 'N/A'})` : 'None'}</p>
         <p className="text-sm text-foreground"><strong>Selected Row:</strong> {selectedRowIndex >= 0 ? `${selectedRowIndex} (${sortedData[selectedRowIndex]?.company})` : 'None'}</p>
         <p className="text-sm text-foreground"><strong>Expanded Rows:</strong> {expandedRows.size > 0 ? Array.from(expandedRows).join(', ') : 'None'}</p>
         <p className="text-sm text-foreground"><strong>Visible Columns:</strong> {visibleColumns.join(', ')}</p>
         <p className="text-sm text-foreground"><strong>Text Size:</strong> {textSize}</p>
         <p className="text-sm text-foreground"><strong>Data Count:</strong> {sortedData.length} applications</p>
       </div>
     </div>
   )
} 