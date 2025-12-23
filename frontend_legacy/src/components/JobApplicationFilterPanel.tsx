"use client"

import { useState, useEffect, useId } from "react"
import { ChevronDown, ChevronUp, Filter, X, Search, Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface FilterState {
  companies: string[]
  positions: string[]
  statuses: string[]
  workArrangements: string[]
  types: string[]
  salaryMin: number | undefined
  salaryMax: number | undefined
  dateAppliedFrom: Date | undefined
  dateAppliedTo: Date | undefined
  compatibilityScore: number[]
  starredFilter: "all" | "starred" | "unstarred"
}

interface JobApplicationFilterPanelProps {
  onFilterChange: (filters: FilterState) => void
  isExpanded: boolean
  onToggleExpanded: (expanded: boolean) => void
  availableCompanies: string[]
  availablePositions: string[]
}

// Constants for dropdown options
const STATUS_OPTIONS = [
  { value: "applied", label: "Applied" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" }
]

const WORK_ARRANGEMENT_OPTIONS = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "in_office", label: "In Office" }
]

const TYPE_OPTIONS = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" }
]

export function JobApplicationFilterPanel({
  onFilterChange,
  isExpanded,
  onToggleExpanded,
  availableCompanies,
  availablePositions
}: JobApplicationFilterPanelProps) {
  
  // Generate unique IDs for form elements
  const companyFilterId = useId()
  const positionFilterId = useId()
  const statusFilterId = useId()
  const workArrangementFilterId = useId()
  const typeFilterId = useId()
  const salaryMinId = useId()
  const salaryMaxId = useId()
  const dateFromId = useId()
  const dateToId = useId()
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    companies: [],
    positions: [],
    statuses: [],
    workArrangements: [],
    types: [],
    salaryMin: undefined,
    salaryMax: undefined,
    dateAppliedFrom: undefined,
    dateAppliedTo: undefined,
    compatibilityScore: [1, 10],
    starredFilter: "all"
  })

  // Company and Position search states
  const [companySearch, setCompanySearch] = useState("")
  const [positionSearch, setPositionSearch] = useState("")

  // Filtered options for searchable dropdowns
  const filteredCompanies = availableCompanies.filter(company =>
    company.toLowerCase().includes(companySearch.toLowerCase())
  )
  
  const filteredPositions = availablePositions.filter(position =>
    position.toLowerCase().includes(positionSearch.toLowerCase())
  )

  // Utility function to format selected values with overflow
  const formatSelectedValues = (selectedValues: string[], maxVisible: number = 2): string => {
    if (selectedValues.length === 0) return ""
    if (selectedValues.length <= maxVisible) {
      return selectedValues.join(", ")
    }
    const visible = selectedValues.slice(0, maxVisible)
    const remaining = selectedValues.length - maxVisible
    return `${visible.join(", ")} (+${remaining} more)`
  }

  // Helper function to convert status values to labels
  const formatStatusValues = (statusValues: string[], maxVisible: number = 2): string => {
    if (statusValues.length === 0) return ""
    const statusLabels = statusValues.map(value => 
      STATUS_OPTIONS.find(option => option.value === value)?.label || value
    )
    return formatSelectedValues(statusLabels, maxVisible)
  }

  // Helper function to convert work arrangement values to labels
  const formatWorkArrangementValues = (arrangementValues: string[], maxVisible: number = 2): string => {
    if (arrangementValues.length === 0) return ""
    const arrangementLabels = arrangementValues.map(value => 
      WORK_ARRANGEMENT_OPTIONS.find(option => option.value === value)?.label || value
    )
    return formatSelectedValues(arrangementLabels, maxVisible)
  }

  // Helper function to convert type values to labels
  const formatTypeValues = (typeValues: string[], maxVisible: number = 2): string => {
    if (typeValues.length === 0) return ""
    const typeLabels = typeValues.map(value => 
      TYPE_OPTIONS.find(option => option.value === value)?.label || value
    )
    return formatSelectedValues(typeLabels, maxVisible)
  }

  // Count of active filters
  const activeFilterCount = [
    filters.companies.length,
    filters.positions.length,
    filters.statuses.length,
    filters.workArrangements.length,
    filters.types.length,
    filters.salaryMin !== undefined ? 1 : 0,
    filters.salaryMax !== undefined ? 1 : 0,
    filters.dateAppliedFrom !== undefined ? 1 : 0,
    filters.dateAppliedTo !== undefined ? 1 : 0,
    filters.compatibilityScore[0] !== 1 || filters.compatibilityScore[1] !== 10 ? 1 : 0,
    filters.starredFilter !== "all" ? 1 : 0
  ].reduce((sum, count) => sum + count, 0)

  // Notify parent of filter changes
  useEffect(() => {
    onFilterChange(filters)
  }, [filters, onFilterChange])

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      companies: [],
      positions: [],
      statuses: [],
      workArrangements: [],
      types: [],
      salaryMin: undefined,
      salaryMax: undefined,
      dateAppliedFrom: undefined,
      dateAppliedTo: undefined,
      compatibilityScore: [1, 10],
      starredFilter: "all"
    })
    setCompanySearch("")
    setPositionSearch("")
  }

  // Individual clear functions
  const clearCompanies = () => {
    setFilters(prev => ({ ...prev, companies: [] }))
    setCompanySearch("")
  }

  const clearPositions = () => {
    setFilters(prev => ({ ...prev, positions: [] }))
    setPositionSearch("")
  }

  const clearStatuses = () => {
    setFilters(prev => ({ ...prev, statuses: [] }))
  }

  const clearWorkArrangements = () => {
    setFilters(prev => ({ ...prev, workArrangements: [] }))
  }

  const clearTypes = () => {
    setFilters(prev => ({ ...prev, types: [] }))
  }

  const clearSalary = () => {
    setFilters(prev => ({ ...prev, salaryMin: undefined, salaryMax: undefined }))
  }

  const clearDates = () => {
    setFilters(prev => ({ ...prev, dateAppliedFrom: undefined, dateAppliedTo: undefined }))
  }

  const clearCompatibilityScore = () => {
    setFilters(prev => ({ ...prev, compatibilityScore: [1, 10] }))
  }

  const clearStarredFilter = () => {
    setFilters(prev => ({ ...prev, starredFilter: "all" }))
  }

  // Multi-select handlers
  const toggleCompany = (company: string) => {
    setFilters(prev => ({
      ...prev,
      companies: prev.companies.includes(company)
        ? prev.companies.filter(c => c !== company)
        : [...prev.companies, company]
    }))
  }

  const togglePosition = (position: string) => {
    setFilters(prev => ({
      ...prev,
      positions: prev.positions.includes(position)
        ? prev.positions.filter(p => p !== position)
        : [...prev.positions, position]
    }))
  }

  const toggleStatus = (status: string) => {
    setFilters(prev => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter(s => s !== status)
        : [...prev.statuses, status]
    }))
  }

  const toggleWorkArrangement = (arrangement: string) => {
    setFilters(prev => ({
      ...prev,
      workArrangements: prev.workArrangements.includes(arrangement)
        ? prev.workArrangements.filter(w => w !== arrangement)
        : [...prev.workArrangements, arrangement]
    }))
  }

  const toggleType = (type: string) => {
    setFilters(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type]
    }))
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
      <div className="border rounded-lg bg-card">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-4 text-left font-medium hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs">
                  {activeFilterCount}
                </span>
              )}
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="border-t">
          <div className="p-6 space-y-6">
            
            {/* Action Buttons Row */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                disabled={activeFilterCount === 0}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Starred Filter - Radio Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Starred Jobs</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearStarredFilter}
                    className={`h-auto p-1 text-muted-foreground hover:text-destructive ${
                      filters.starredFilter === "all" ? "invisible" : ""
                    }`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <Select
                  value={filters.starredFilter}
                  onValueChange={(value: "all" | "starred" | "unstarred") => 
                    setFilters(prev => ({ ...prev, starredFilter: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by starred status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Jobs</SelectItem>
                    <SelectItem value="starred">⭐ Starred Only</SelectItem>
                    <SelectItem value="unstarred">○ Non-starred Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Company Filter - Multi-select Searchable */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={companyFilterId}>Company</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCompanies}
                    className={`h-auto p-1 text-muted-foreground hover:text-destructive ${
                      filters.companies.length === 0 ? "invisible" : ""
                    }`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      id={companyFilterId}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      {filters.companies.length === 0
                        ? "Select companies..."
                        : formatSelectedValues(filters.companies)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <Input
                        placeholder="Search companies..."
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        className="mb-2"
                      />
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {filteredCompanies.map((company) => (
                          <div
                            key={company}
                            className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-muted rounded"
                            onClick={() => toggleCompany(company)}
                          >
                            <Checkbox
                              checked={filters.companies.includes(company)}
                              onChange={() => toggleCompany(company)}
                            />
                            <span className="text-sm">{company}</span>
                          </div>
                        ))}
                        {filteredCompanies.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            No companies found
                          </p>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Position Filter - Multi-select Searchable */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={positionFilterId}>Position</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearPositions}
                    className={`h-auto p-1 text-muted-foreground hover:text-destructive ${
                      filters.positions.length === 0 ? "invisible" : ""
                    }`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      id={positionFilterId}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      {filters.positions.length === 0
                        ? "Select positions..."
                        : formatSelectedValues(filters.positions)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <Input
                        placeholder="Search positions..."
                        value={positionSearch}
                        onChange={(e) => setPositionSearch(e.target.value)}
                        className="mb-2"
                      />
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {filteredPositions.map((position) => (
                          <div
                            key={position}
                            className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-muted rounded"
                            onClick={() => togglePosition(position)}
                          >
                            <Checkbox
                              checked={filters.positions.includes(position)}
                              onChange={() => togglePosition(position)}
                            />
                            <span className="text-sm">{position}</span>
                          </div>
                        ))}
                        {filteredPositions.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            No positions found
                          </p>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Status Filter - Checkbox Dropdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={statusFilterId}>Status</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearStatuses}
                    className={`h-auto p-1 text-muted-foreground hover:text-destructive ${
                      filters.statuses.length === 0 ? "invisible" : ""
                    }`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      id={statusFilterId}
                    >
                      {filters.statuses.length === 0
                        ? "Select status..."
                        : formatStatusValues(filters.statuses)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="space-y-2">
                      {STATUS_OPTIONS.map((option) => (
                        <div
                          key={option.value}
                          className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-muted rounded"
                          onClick={() => toggleStatus(option.value)}
                        >
                          <Checkbox
                            checked={filters.statuses.includes(option.value)}
                            onChange={() => toggleStatus(option.value)}
                          />
                          <span className="text-sm">{option.label}</span>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Work Arrangement Filter - Checkbox Dropdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={workArrangementFilterId}>Work Arrangement</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearWorkArrangements}
                    className={`h-auto p-1 text-muted-foreground hover:text-destructive ${
                      filters.workArrangements.length === 0 ? "invisible" : ""
                    }`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      id={workArrangementFilterId}
                    >
                      {filters.workArrangements.length === 0
                        ? "Select arrangement..."
                        : formatWorkArrangementValues(filters.workArrangements)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="space-y-2">
                      {WORK_ARRANGEMENT_OPTIONS.map((option) => (
                        <div
                          key={option.value}
                          className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-muted rounded"
                          onClick={() => toggleWorkArrangement(option.value)}
                        >
                          <Checkbox
                            checked={filters.workArrangements.includes(option.value)}
                            onChange={() => toggleWorkArrangement(option.value)}
                          />
                          <span className="text-sm">{option.label}</span>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Type Filter - Checkbox Dropdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={typeFilterId}>Job Type</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearTypes}
                    className={`h-auto p-1 text-muted-foreground hover:text-destructive ${
                      filters.types.length === 0 ? "invisible" : ""
                    }`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      id={typeFilterId}
                    >
                      {filters.types.length === 0
                        ? "Select type..."
                        : formatTypeValues(filters.types)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="space-y-2">
                      {TYPE_OPTIONS.map((option) => (
                        <div
                          key={option.value}
                          className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-muted rounded"
                          onClick={() => toggleType(option.value)}
                        >
                          <Checkbox
                            checked={filters.types.includes(option.value)}
                            onChange={() => toggleType(option.value)}
                          />
                          <span className="text-sm">{option.label}</span>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Salary Range Filter - Min/Max Inputs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Salary Range</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSalary}
                    className={`h-auto p-1 text-muted-foreground hover:text-destructive ${
                      filters.salaryMin === undefined && filters.salaryMax === undefined ? "invisible" : ""
                    }`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor={salaryMinId} className="text-xs text-muted-foreground">
                      Min
                    </Label>
                    <Input
                      id={salaryMinId}
                      type="number"
                      min="0"
                      placeholder="Min salary"
                      value={filters.salaryMin || ""}
                      onChange={(e) => {
                        const value = e.target.value
                        // Only allow positive numbers or empty string
                        if (value === "" || (!isNaN(Number(value)) && Number(value) >= 0)) {
                          setFilters(prev => ({
                            ...prev,
                            salaryMin: value ? parseInt(value) : undefined
                          }))
                        }
                      }}
                      onKeyPress={(e) => {
                        // Prevent non-numeric characters except backspace, delete, etc.
                        if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                          e.preventDefault()
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor={salaryMaxId} className="text-xs text-muted-foreground">
                      Max
                    </Label>
                    <Input
                      id={salaryMaxId}
                      type="number"
                      min="0"
                      placeholder="Max salary"
                      value={filters.salaryMax || ""}
                      onChange={(e) => {
                        const value = e.target.value
                        // Only allow positive numbers or empty string
                        if (value === "" || (!isNaN(Number(value)) && Number(value) >= 0)) {
                          setFilters(prev => ({
                            ...prev,
                            salaryMax: value ? parseInt(value) : undefined
                          }))
                        }
                      }}
                      onKeyPress={(e) => {
                        // Prevent non-numeric characters except backspace, delete, etc.
                        if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                          e.preventDefault()
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Compatibility Score Filter - Range Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Compatibility Score</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCompatibilityScore}
                    className={`h-auto p-1 text-muted-foreground hover:text-destructive ${
                      filters.compatibilityScore[0] === 1 && filters.compatibilityScore[1] === 10 ? "invisible" : ""
                    }`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{filters.compatibilityScore[0]}</span>
                    <span>{filters.compatibilityScore[1]}</span>
                  </div>
                  <Slider
                    value={filters.compatibilityScore}
                    onValueChange={(value) => setFilters(prev => ({
                      ...prev,
                      compatibilityScore: value
                    }))}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1</span>
                    <span>10</span>
                  </div>
                </div>
              </div>

              {/* Date Applied Filter - Date Pickers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Date Applied</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearDates}
                    className={`h-auto p-1 text-muted-foreground hover:text-destructive ${
                      filters.dateAppliedFrom === undefined && filters.dateAppliedTo === undefined ? "invisible" : ""
                    }`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor={dateFromId} className="text-xs text-muted-foreground">
                      From
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !filters.dateAppliedFrom && "text-muted-foreground"
                          )}
                          id={dateFromId}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.dateAppliedFrom ? (
                            format(filters.dateAppliedFrom, "MMM dd, yyyy")
                          ) : (
                            "Pick date"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={filters.dateAppliedFrom}
                          onSelect={(date) => setFilters(prev => ({
                            ...prev,
                            dateAppliedFrom: date
                          }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor={dateToId} className="text-xs text-muted-foreground">
                      To
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !filters.dateAppliedTo && "text-muted-foreground"
                          )}
                          id={dateToId}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.dateAppliedTo ? (
                            format(filters.dateAppliedTo, "MMM dd, yyyy")
                          ) : (
                            "Pick date"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={filters.dateAppliedTo}
                          onSelect={(date) => setFilters(prev => ({
                            ...prev,
                            dateAppliedTo: date
                          }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
} 