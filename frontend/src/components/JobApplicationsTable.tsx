"use client"

import * as React from "react"
import { useState, useCallback, useMemo, useEffect } from 'react'
import { ChevronUp, ChevronDown, ChevronRight, Star, Users, FileText, AlertCircle } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { JobApplication } from "@/types/models/job-application"
import { ThemeToggle } from "./theme-toggle"

/*
 * ====================================================================
 * TASK 4.4 ADVANCED IMPLEMENTATION - APPLIED TO PRODUCTION COMPONENT
 * ====================================================================
 * 
 * Features added from Task 4.4 (January 2025):
 * ✅ Row expansion with detailed job information
 * ✅ Column show/hide controls with required column protection
 * ✅ Size controls (small/normal/large/extra-large)
 * ✅ Advanced keyboard navigation (arrow keys, Enter, Space, Escape)
 * ✅ Comprehensive sorting with secondary sort by dateApplied
 * ✅ Default sort: dateApplied descending
 * ✅ Reset to default functionality (not clear to none)
 * ✅ Fixed-width sort indicators to prevent column jumping
 * ✅ Empty starred column header while maintaining sortability
 * ✅ Enhanced hover states and focus management
 * ✅ Job description display with interactive links
 * ✅ Type-specific sorting (dates, numbers, booleans, strings)
 * ✅ Performance optimization with useMemo
 * ✅ Accessibility improvements with proper ARIA attributes
 * 
 * Version: Task 4.4 Complete
 * Last Updated: January 2025
 * ====================================================================
 */

// Types for Task 4.4 advanced functionality
type TextSize = 'small' | 'normal' | 'large' | 'extra-large'
type SortDirection = 'asc' | 'desc' | null
type SortableColumn = keyof JobApplication

// Define all possible columns with metadata - Enhanced from Task 4.4 - EXACT match with test-task4-4
const ALL_COLUMNS = {
  starred: { key: 'isStarred', label: '', displayName: 'Starred', required: false, width: 'w-12', sortable: true },
  company: { key: 'company', label: 'Company', displayName: 'Company', required: true, width: 'min-w-32', sortable: true },
  position: { key: 'position', label: 'Position', displayName: 'Position', required: true, width: 'min-w-40', sortable: true },
  status: { key: 'status', label: 'Status', displayName: 'Status', required: true, width: 'min-w-28', sortable: true },
  type: { key: 'type', label: 'Type', displayName: 'Job Type', required: true, width: 'min-w-24', sortable: true },
  salary: { key: 'salary', label: 'Salary', displayName: 'Salary', required: false, width: 'min-w-24', sortable: true },
  workArrangement: { key: 'workArrangement', label: 'Work Arrangement', displayName: 'Work Arrangement', required: false, width: 'min-w-32', sortable: true },
  dateApplied: { key: 'dateApplied', label: 'Date Applied', displayName: 'Date Applied', required: false, width: 'min-w-28', sortable: true },
  description: { key: 'description', label: 'Job Description', displayName: 'Job Description', required: false, width: 'min-w-40', sortable: true },
  compatibilityScore: { key: 'compatibilityScore', label: 'Score', displayName: 'Compatibility Score', required: false, width: 'min-w-16', sortable: true },
  jobLink: { key: 'jobLink', label: 'Job Link', displayName: 'Job Link', required: false, width: 'min-w-20', sortable: false },
  followUpDate: { key: 'followUpDate', label: 'Follow Up', displayName: 'Follow Up Date', required: false, width: 'min-w-28', sortable: true },
  deadline: { key: 'deadline', label: 'Deadline', displayName: 'Application Deadline', required: false, width: 'min-w-28', sortable: true },
  tags: { key: 'tags', label: 'Tags', displayName: 'Tags', required: false, width: 'min-w-32', sortable: false },
  jobConnections: { key: 'jobConnections', label: 'Connections', displayName: 'Job Connections', required: false, width: 'min-w-32', sortable: false },
  documents: { key: 'documents', label: 'Documents', displayName: 'Documents', required: false, width: 'min-w-28', sortable: false },
  notes: { key: 'notes', label: 'Notes', displayName: 'Notes', required: false, width: 'min-w-32', sortable: true }
}

type ColumnKey = keyof typeof ALL_COLUMNS

// Column order for consistent display - EXACT match with test-task4-4
const COLUMN_ORDER: ColumnKey[] = [
  'starred', 'company', 'position', 'status', 'type', 'salary', 'workArrangement', 'dateApplied', 
  'description', 'compatibilityScore', 'jobLink', 'followUpDate', 'deadline', 'tags', 'jobConnections', 'documents', 'notes'
]

// Default visible columns - EXACT match with test-task4-4
const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = [
  'starred', 'company', 'position', 'status', 'type', 'salary', 'workArrangement', 'dateApplied'
]

// Props interface - Enhanced for Task 4.4 and Task 4.5
interface JobApplicationsTableProps {
  data: JobApplication[]
  className?: string
  showControls?: boolean // New: Option to show/hide column and size controls
  showDebugInfo?: boolean // New: Option to show debug information
  defaultTextSize?: TextSize // New: Default text size
  // Task 4.5 - Pagination and error handling props
  defaultPageSize?: number // New: Default items per page
  pageSizeOptions?: number[] // New: Available page size options
  onError?: (error: string) => void // New: Error callback
  error?: string // New: Error message to display
}

export function JobApplicationsTable({ 
  data, 
  className,
  showControls = false,
  showDebugInfo = false,
  defaultTextSize = 'normal',
  // Task 4.5 - Pagination and error handling props
  defaultPageSize = 10,
  pageSizeOptions = [5, 10, 20, 50, 100],
  onError,
  error
}: JobApplicationsTableProps) {
  
  // Task 4.4 - Enhanced state management (matching test-task4-4 defaults)
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(DEFAULT_VISIBLE_COLUMNS)
  const [textSize, setTextSize] = useState<TextSize>(defaultTextSize)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1)

  // Task 4.4 - Advanced sorting state with default
  const [sortColumn, setSortColumn] = useState<SortableColumn | null>('dateApplied')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [isDefaultSort, setIsDefaultSort] = useState(true) // Track if we're in default state

  // Task 4.5 - Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [isDataError, setIsDataError] = useState(false)

  // Task 4.4 - Advanced sorting logic with type-specific handling
  const sortData = useCallback((data: JobApplication[], column: SortableColumn | null, direction: SortDirection) => {
    if (!column || !direction) {
      // Default sort: dateApplied descending
      return [...data].sort((a, b) => {
        const aDate = new Date(a.dateApplied).getTime()
        const bDate = new Date(b.dateApplied).getTime()
        return bDate - aDate // Descending (newest first)
      })
    }

    return [...data].sort((a, b) => {
      const aVal = a[column]
      const bVal = b[column]

      // Handle null/undefined values
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

  // Task 4.5 - Pagination logic
  const totalPages = Math.ceil(sortedData.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedData = useMemo(() => {
    return sortedData.slice(startIndex, endIndex)
  }, [sortedData, startIndex, endIndex])

  // Task 4.5 - Reset page when data changes or page size changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [totalPages, currentPage])

  // Task 4.5 - Handle page size change
  const handlePageSizeChange = useCallback((newPageSize: string) => {
    const size = parseInt(newPageSize)
    setPageSize(size)
    setCurrentPage(1) // Reset to first page when changing page size
  }, [])

  // Task 4.5 - Handle page change
  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }, [totalPages])
  
  // Task 4.4 - Navigation state for improved keyboard navigation
  const [focusedHeaderIndex, setFocusedHeaderIndex] = useState<number>(-1)
  const [navigationMode, setNavigationMode] = useState<'none' | 'headers' | 'rows'>('none')

  // Task 4.4 - Size classes for responsive design
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

  // Task 4.4 - Advanced sorting functionality
  const handleSort = (columnKey: ColumnKey) => {
    const column = ALL_COLUMNS[columnKey]
    if (!column?.sortable) return

    // Map column key to actual data property
    const dataKey = column.key as SortableColumn

    if (sortColumn === dataKey) {
      // Cycle through: asc -> desc -> reset to default
      if (sortDirection === 'asc') {
        setSortDirection('desc')
        setIsDefaultSort(false)
      } else if (sortDirection === 'desc') {
        if (dataKey === 'dateApplied' && !isDefaultSort) {
          // For dateApplied that was user-selected, reset to default
          setSortColumn('dateApplied')
          setSortDirection('desc')
          setIsDefaultSort(true)
        } else if (dataKey === 'dateApplied' && isDefaultSort) {
          // For dateApplied in default state, go to ascending
          setSortDirection('asc')
          setIsDefaultSort(false)
        } else {
          // For other columns, reset to default sort
          setSortColumn('dateApplied')
          setSortDirection('desc')
          setIsDefaultSort(true)
        }
      } else {
        setSortDirection('asc')
        setIsDefaultSort(false)
      }
    } else {
      // New column, start with ascending
      setSortColumn(dataKey)
      setSortDirection('asc')
      setIsDefaultSort(false)
    }
  }

  // Task 4.4 - Sort indicator component with fixed width
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

  // Task 4.4 - Enhanced keyboard navigation system
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
        setIsDefaultSort(true)
        break
    }
  }, [sortedData, selectedRowIndex, navigationMode, focusedHeaderIndex, visibleColumns, handleSort])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Task 4.4 - Row expansion functionality
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

  // Task 4.4 - Loading simulation for testing
  const simulateLoading = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 2000)
  }

  // Task 4.4 - Column visibility controls
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

  // Task 4.4 - Show/hide all columns toggle
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

  // Task 4.4 - Enhanced cell value formatting
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
      case 'workArrangement':
        return value?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || '-'
      case 'tags':
        return value && Array.isArray(value) && value.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {value.slice(0, 2).map((tag: any) => (
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
            <span>{value.length}</span>
          </div>
        ) : '-'
      case 'documents':
        return value && Array.isArray(value) && value.length > 0 ? (
          <div className="flex items-center gap-1">
            <FileText className={sizeClasses.icon} />
            <span>{value.length}</span>
          </div>
        ) : '-'
      case 'notes':
        return value ? (
          <div className="max-w-xs">
            <span className="text-muted-foreground truncate">
              {value.length > 30 ? `${value.substring(0, 30)}...` : value}
            </span>
          </div>
        ) : '-'
      case 'description':
        return value ? (
          <div className="max-w-xs">
            <span className="text-muted-foreground truncate">
              {value.length > 48 ? `${value.substring(0, 45)}...` : value}
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
        return String(value)
    }
  }

  // Task 4.4 - Get value from job application for sorting/display
  const getValueFromJobApplication = (job: JobApplication, columnKey: ColumnKey): any => {
    const column = ALL_COLUMNS[columnKey]
    return job[column.key as keyof JobApplication]
  }

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* Task 4.4 - Enhanced Controls Section */}
      {showControls && (
        <div className="flex flex-col gap-4 p-4 bg-muted/30 rounded-lg border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Table Controls</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Theme:</span>
              <ThemeToggle />
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column Controls */}
            <div className="lg:col-span-2">
              <h4 className="text-sm font-medium mb-2">Visible Columns</h4>
              <div className="flex flex-wrap gap-2 mb-2">
                <button
                  onClick={toggleShowAll}
                  className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/80 transition-colors"
                >
                  {COLUMN_ORDER.every(col => visibleColumns.includes(col)) ? 'Hide Optional' : 'Show All'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {COLUMN_ORDER.map(columnKey => {
                  const column = ALL_COLUMNS[columnKey]
                  const isVisible = visibleColumns.includes(columnKey)
                  const isRequired = column.required
                  
                  return (
                    <button
                      key={columnKey}
                      onClick={() => toggleColumn(columnKey)}
                      disabled={isRequired}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        isVisible 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      } ${isRequired ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      title={isRequired ? 'Required column' : `Toggle ${column.displayName}`}
                    >
                      {column.displayName} {isRequired && '*'}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Size and Action Controls */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Text Size</h4>
                <div className="grid grid-cols-2 gap-1">
                  {(['small', 'normal', 'large', 'extra-large'] as const).map(size => (
                    <button
                      key={size}
                      onClick={() => setTextSize(size)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        textSize === size 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Actions</h4>
                <div className="space-y-2">
                  <button
                    onClick={simulateLoading}
                    disabled={isLoading}
                    className="w-full px-3 py-1.5 text-xs border border-border rounded hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Loading...' : 'Test Loading'}
                  </button>
                  <button
                    onClick={() => {
                      setSortColumn('dateApplied')
                      setSortDirection('desc')
                      setIsDefaultSort(true)
                      setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)
                    }}
                    disabled={sortColumn === 'dateApplied' && sortDirection === 'desc' && isDefaultSort && visibleColumns.length === DEFAULT_VISIBLE_COLUMNS.length && visibleColumns.every(col => DEFAULT_VISIBLE_COLUMNS.includes(col))}
                    className="w-full px-3 py-1.5 text-xs border border-border rounded hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reset to Default
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Task 4.4 - Enhanced Table */}
      {isLoading ? (
        <div className={`border rounded-lg overflow-hidden p-4 ${sizeClasses.table}`}>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex space-x-4">
                <div className={`bg-muted rounded w-1/4 animate-pulse ${
                  textSize === 'small' ? 'h-3' :
                  textSize === 'normal' ? 'h-4' :
                  textSize === 'large' ? 'h-5' :
                  textSize === 'extra-large' ? 'h-6' : 'h-4'
                }`}></div>
                <div className={`bg-muted rounded w-1/3 animate-pulse ${
                  textSize === 'small' ? 'h-3' :
                  textSize === 'normal' ? 'h-4' :
                  textSize === 'large' ? 'h-5' :
                  textSize === 'extra-large' ? 'h-6' : 'h-4'
                }`}></div>
                <div className={`bg-muted rounded w-1/6 animate-pulse ${
                  textSize === 'small' ? 'h-3' :
                  textSize === 'normal' ? 'h-4' :
                  textSize === 'large' ? 'h-5' :
                  textSize === 'extra-large' ? 'h-6' : 'h-4'
                }`}></div>
                <div className={`bg-muted rounded w-1/4 animate-pulse ${
                  textSize === 'small' ? 'h-3' :
                  textSize === 'normal' ? 'h-4' :
                  textSize === 'large' ? 'h-5' :
                  textSize === 'extra-large' ? 'h-6' : 'h-4'
                }`}></div>
              </div>
            ))}
          </div>
        </div>
      ) : sortedData.length === 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <div className="text-center py-8 text-muted-foreground">
            No job applications found.
          </div>
        </div>
      ) : error ? (
        <div className="border rounded-lg overflow-hidden">
          <Alert className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        <div className={`rounded-md border ${sizeClasses.table}`}>
          <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.map((columnKey, index) => {
                const column = ALL_COLUMNS[columnKey]
                const isFocused = navigationMode === 'headers' && focusedHeaderIndex === visibleColumns.filter(col => ALL_COLUMNS[col].sortable).indexOf(columnKey)
                
                return (
                  <TableHead
                    key={columnKey}
                    className={`${column.width} ${sizeClasses.header} group ${
                      column.sortable 
                        ? `cursor-pointer select-none hover:bg-muted/50 transition-colors ${
                            isFocused ? 'bg-muted ring-2 ring-ring' : ''
                          }` 
                        : ''
                    }`}
                    role="columnheader"
                    aria-sort={column.sortable && sortColumn === column.key ? (sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none') : undefined}
                    onClick={column.sortable ? () => handleSort(columnKey) : undefined}
                  >
                    <div className="flex items-center gap-1 font-bold">
                      {column.label}
                      {column.sortable && <SortIndicator columnKey={columnKey} />}
                    </div>
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={visibleColumns.length} 
                  className="text-center py-8 text-muted-foreground"
                >
                  No job applications found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((job, rowIndex) => {
                const isExpanded = expandedRows.has(job.id)
                const isSelected = selectedRowIndex === rowIndex
                
                return (
                  <React.Fragment key={job.id}>
                    <TableRow 
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-muted ring-2 ring-ring' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleRowExpansion(job.id)}
                    >
                      {visibleColumns.map((columnKey, cellIndex) => (
                        <TableCell 
                          key={`${job.id}-${columnKey}`}
                          className={`${ALL_COLUMNS[columnKey].width} ${sizeClasses.cell} ${
                            columnKey === 'company' ? 'font-semibold text-foreground' : 
                            columnKey === 'position' ? 'font-medium text-foreground' :
                            columnKey === 'notes' ? 'text-muted-foreground' :
                            'text-muted-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {cellIndex === 0 && (
                              <span className="text-muted-foreground">
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </span>
                            )}
                            {formatCellValue(getValueFromJobApplication(job, columnKey), columnKey, sizeClasses)}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                    
                    {/* Task 4.4 - Enhanced Row Expansion - EXACT match with test-task4-4 */}
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={visibleColumns.length} className="p-0">
                          <div className="px-6 py-4 bg-muted/20 border-t">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                              {/* Left Column */}
                              <div className="space-y-4">
                                {/* Job Details */}
                                <div>
                                  <h4 className="font-medium text-foreground mb-2">Job Details</h4>
                                  <div className="space-y-2">
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
                                    {job.compatibilityScore && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Compatibility:</span>
                                        <span className="text-foreground">{job.compatibilityScore}/10</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Dates */}
                                <div>
                                  <h4 className="font-medium text-foreground mb-2">Important Dates</h4>
                                  <div className="space-y-2">
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
                                    {job.jobLink && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Job Link:</span>
                                        <a href={job.jobLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Job Posting</a>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right Column */}
                              <div className="space-y-4">
                                {/* Tags */}
                                <div>
                                  <h4 className="font-medium text-foreground mb-2">Tags</h4>
                                  {job.tags && job.tags.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {job.tags.map(tag => (
                                        <span key={tag.id} className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded-full text-xs">
                                          {tag.name}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-muted-foreground">No tags</p>
                                  )}
                                </div>

                                {/* Job Connections */}
                                <div>
                                  <h4 className="font-medium text-foreground mb-2">Connections</h4>
                                  {job.jobConnections && job.jobConnections.length > 0 ? (
                                    <div className="space-y-2">
                                      {job.jobConnections.map(connection => (
                                        <div key={connection.id} className="flex items-center gap-2">
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
                                  ) : (
                                    <p className="text-muted-foreground">No connections</p>
                                  )}
                                </div>

                                {/* Documents */}
                                <div>
                                  <h4 className="font-medium text-foreground mb-2">Documents</h4>
                                  {job.documents && job.documents.length > 0 ? (
                                    <div className="space-y-2">
                                      {job.documents.map(doc => (
                                        <div key={doc.id} className="flex items-center gap-2">
                                          <FileText className="w-4 h-4 text-muted-foreground" />
                                          <span className="text-foreground">{doc.originalName}</span>
                                          <span className="text-muted-foreground">({doc.type})</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-muted-foreground">No documents</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Bottom Section - Notes and Job Description */}
                            <div className="mt-6 pt-4 border-t border-border/50 space-y-6">
                              {/* Notes */}
                              <div>
                                <h4 className="font-medium text-foreground mb-2">Notes</h4>
                                {job.notes ? (
                                  <p className="text-foreground bg-muted/30 p-3 rounded">{job.notes}</p>
                                ) : (
                                  <p className="text-muted-foreground">No notes</p>
                                )}
                              </div>

                              {/* Job Description */}
                              <div>
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
                                                <div style="white-space: pre-wrap;">${job.description || 'No description available'}</div>
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
                                        const blob = new Blob([`${job.company} - ${job.position}\n\n${job.description || 'No description available'}`], { type: 'text/plain' })
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
                                <div className="mt-2 text-foreground bg-muted/30 p-3 rounded max-h-32 overflow-y-auto">
                                  {job.description || 'No description available'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
        </div>
      )}

      {/* Task 4.5 - Pagination Controls */}
      {!isLoading && !error && sortedData.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          {/* Page Size Selector */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Rows per page:</span>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-16 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pagination Info and Controls */}
          <div className="flex items-center gap-4">
            {/* Results Info */}
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, sortedData.length)} of {sortedData.length} results
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {/* Task 4.5 - Smart pagination with ellipsis */}
                  {(() => {
                    const pages = []
                    const showEllipsis = totalPages > 7 // Only use ellipsis if more than 7 pages
                    
                    if (!showEllipsis) {
                      // Simple case: Show all pages (1-7 pages)
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(
                          <PaginationItem key={`page-${i}`}>
                            <PaginationLink 
                              onClick={() => handlePageChange(i)}
                              isActive={i === currentPage}
                              className="cursor-pointer"
                            >
                              {i}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      }
                    } else {
                      // Complex case: Use ellipsis logic
                      const startPages = [1, 2] // Always show first 2 pages
                      const endPages = [totalPages - 1, totalPages] // Always show last 2 pages
                      
                      // Determine middle pages around current page
                      let middlePages = []
                      if (currentPage <= 4) {
                        // Near beginning: show 1 2 3 4 5 ... 49 50
                        middlePages = [3, 4, 5]
                      } else if (currentPage >= totalPages - 3) {
                        // Near end: show 1 2 ... 46 47 48 49 50
                        middlePages = [totalPages - 4, totalPages - 3, totalPages - 2]
                      } else {
                        // In middle: show 1 2 ... 8 9 10 ... 49 50
                        middlePages = [currentPage - 1, currentPage, currentPage + 1]
                      }
                      
                      // Build the page sequence
                      const allPages = [...startPages, ...middlePages, ...endPages]
                      const uniquePages = [...new Set(allPages)].sort((a, b) => a - b)
                      
                      // Render pages with ellipsis
                      uniquePages.forEach((pageNum, index) => {
                        // Add ellipsis before this page if there's a gap
                        if (index > 0 && pageNum > uniquePages[index - 1] + 1) {
                          pages.push(
                            <PaginationItem key={`ellipsis-${pageNum}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )
                        }
                        
                        // Add the page number
                        pages.push(
                          <PaginationItem key={`page-${pageNum}`}>
                            <PaginationLink 
                              onClick={() => handlePageChange(pageNum)}
                              isActive={pageNum === currentPage}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      })
                    }
                    
                    return pages
                  })()}

                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </div>
      )}

      {/* Task 4.4 - Keyboard Navigation Help */}
      {showControls && (
        <div className="text-xs text-muted-foreground p-2 bg-muted/20 rounded">
          <strong>Keyboard Navigation:</strong> ←→ Navigate headers, ↑↓ Navigate rows, Space = Sort, Enter = Expand, Esc = Reset
        </div>
      )}

      {/* Task 4.4 & 4.5 - Debug Information */}
      {showDebugInfo && (
        <div className="p-3 bg-muted/50 rounded border text-xs font-mono">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div><strong>Sort:</strong> {sortColumn || 'default'} {sortDirection || 'desc'}</div>
            <div><strong>Total Rows:</strong> {sortedData.length}</div>
            <div><strong>Displayed:</strong> {paginatedData.length}</div>
            <div><strong>Page:</strong> {currentPage}/{totalPages}</div>
            <div><strong>Page Size:</strong> {pageSize}</div>
            <div><strong>Expanded:</strong> {expandedRows.size}</div>
            <div><strong>Selected:</strong> {selectedRowIndex >= 0 ? selectedRowIndex + 1 : 'none'}</div>
            <div><strong>Error:</strong> {error ? 'Yes' : 'No'}</div>
            <div><strong>Navigation:</strong> {navigationMode}</div>
            <div><strong>Header Focus:</strong> {focusedHeaderIndex >= 0 ? focusedHeaderIndex : 'none'}</div>
            <div><strong>Visible Cols:</strong> {visibleColumns.length}</div>
            <div><strong>Size:</strong> {textSize}</div>
          </div>
        </div>
      )}
    </div>
  )
} 