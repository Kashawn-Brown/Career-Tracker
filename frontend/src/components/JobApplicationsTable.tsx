"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { JobApplication, JobApplicationStatus } from "@/types/models/job-application"

// Column definition interface
interface ColumnDef {
  key: keyof JobApplication
  header: string
  type: 'text' | 'date' | 'enum' | 'currency' | 'score' | 'boolean'
  width?: string
  className?: string
}

// Column configurations for all backend fields
const columns: ColumnDef[] = [
  {
    key: 'company',
    header: 'Company',
    type: 'text',
    width: 'w-48',
    className: 'font-medium'
  },
  {
    key: 'position',
    header: 'Position',
    type: 'text',
    width: 'w-52'
  },
  {
    key: 'status',
    header: 'Status',
    type: 'enum',
    width: 'w-32'
  },
  {
    key: 'type',
    header: 'Type',
    type: 'enum',
    width: 'w-28'
  },
  {
    key: 'workArrangement',
    header: 'Work Arrangement',
    type: 'enum',
    width: 'w-36'
  },
  {
    key: 'salary',
    header: 'Salary',
    type: 'currency',
    width: 'w-28'
  },
  {
    key: 'compatibilityScore',
    header: 'Score',
    type: 'score',
    width: 'w-20'
  },
  {
    key: 'dateApplied',
    header: 'Date Applied',
    type: 'date',
    width: 'w-36'
  },
  {
    key: 'followUpDate',
    header: 'Follow Up',
    type: 'date',
    width: 'w-32'
  },
  {
    key: 'deadline',
    header: 'Deadline',
    type: 'date',
    width: 'w-32'
  },
  {
    key: 'isStarred',
    header: 'Starred',
    type: 'boolean',
    width: 'w-20'
  }
]

// Cell renderer for different data types
const renderCell = (value: unknown, type: ColumnDef['type']): React.ReactNode => {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>
  }

  switch (type) {
    case 'text':
      return <span className="truncate">{String(value)}</span>
    
    case 'date':
      try {
        const dateValue = String(value)
        const date = new Date(dateValue)
        return (
          <time dateTime={dateValue} className="text-sm">
            {date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </time>
        )
      } catch {
        return <span className="text-muted-foreground">Invalid date</span>
      }
    
    case 'enum':
      // Format enum values for display
      const formattedValue = String(value)
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, l => l.toUpperCase())
      
      // Add status-specific styling for status field
      const statusValues = ['applied', 'interview', 'offer', 'rejected', 'withdrawn', 'accepted']
      const isStatus = statusValues.includes(String(value).toLowerCase())
      const statusColorClass = isStatus ? getStatusColorClass(String(value).toLowerCase() as JobApplicationStatus) : ''
      
      return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColorClass}`}>
          {formattedValue}
        </span>
      )
    
    case 'currency':
      const numValue = Number(value)
      if (isNaN(numValue)) {
        return <span className="text-muted-foreground">—</span>
      }
      return (
        <span className="font-mono text-sm">
          ${numValue.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          })}
        </span>
      )
    
    case 'score':
      const scoreValue = Number(value)
      if (isNaN(scoreValue)) {
        return <span className="text-muted-foreground">—</span>
      }
      const scoreColor = scoreValue >= 8 ? 'text-green-600' : 
                        scoreValue >= 6 ? 'text-yellow-600' : 
                        scoreValue >= 4 ? 'text-orange-600' : 'text-red-600'
      return (
        <span className={`font-semibold ${scoreColor}`}>
          {scoreValue}/10
        </span>
      )
    
    case 'boolean':
      return value ? (
        <span className="text-green-600">★</span>
      ) : (
        <span className="text-gray-400">☆</span>
      )
    
    default:
      return String(value)
  }
}

// Status color classes for better visual distinction
const getStatusColorClass = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'applied':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    case 'interview':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    case 'offer':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    case 'accepted':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
    case 'rejected':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    case 'withdrawn':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
  }
}

// Props interface
interface JobApplicationsTableProps {
  data: JobApplication[]
  className?: string
}

// Main table component
export function JobApplicationsTable({ data, className }: JobApplicationsTableProps) {
  return (
    <div className={`rounded-md border ${className}`}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead 
                key={column.key}
                className={`${column.width} ${column.className || ''}`}
                role="columnheader"
                aria-sort="none"
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell 
                colSpan={columns.length} 
                className="text-center py-8 text-muted-foreground"
              >
                No job applications found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((application) => (
              <TableRow 
                key={application.id}
                className="hover:bg-muted/50"
                role="row"
              >
                {columns.map((column) => (
                  <TableCell 
                    key={`${application.id}-${column.key}`}
                    className={`${column.width} ${column.className || ''}`}
                    role="cell"
                  >
                    {renderCell(application[column.key], column.type)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
} 