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
  type: 'text' | 'date' | 'enum' | 'currency'
  width?: string
  className?: string
}

// Column configurations for all required fields
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
    width: 'w-32'
  },
  {
    key: 'salary',
    header: 'Salary',
    type: 'currency',
    width: 'w-28'
  },
  {
    key: 'dateApplied',
    header: 'Date Applied',
    type: 'date',
    width: 'w-36'
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
        .toLowerCase()
        .replace(/\b\w/g, l => l.toUpperCase())
      
      // Add status-specific styling
      const isStatus = Object.values(JobApplicationStatus).includes(value as JobApplicationStatus)
      const statusColorClass = isStatus ? getStatusColorClass(value as JobApplicationStatus) : ''
      
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
    
    default:
      return String(value)
  }
}

// Status color classes for better visual distinction
const getStatusColorClass = (status: JobApplicationStatus): string => {
  switch (status) {
    case JobApplicationStatus.APPLIED:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    case JobApplicationStatus.INTERVIEW:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    case JobApplicationStatus.OFFER:
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    case JobApplicationStatus.REJECTED:
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    case JobApplicationStatus.WITHDRAWN:
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