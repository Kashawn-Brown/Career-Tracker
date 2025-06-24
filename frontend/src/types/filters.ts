/**
 * Filter Types for Job Application Filter System
 * Comprehensive type definitions for filter state management
 */

// Base filter state structure
export interface FilterState {
  // Multi-select filters
  companies: string[]
  positions: string[]
  statuses: string[]
  workArrangements: string[]
  types: string[]
  
  // Range filters
  salaryMin: number | undefined
  salaryMax: number | undefined
  
  // Date filters
  dateAppliedFrom: Date | undefined
  dateAppliedTo: Date | undefined
  
  // Slider filter
  compatibilityScore: number[] // [min, max] range
  
  // Special filters
  starredFilter: "all" | "starred" | "unstarred"
}

// Filter action types for reducer
export type FilterActionType =
  | "SET_COMPANIES"
  | "SET_POSITIONS" 
  | "SET_STATUSES"
  | "SET_WORK_ARRANGEMENTS"
  | "SET_TYPES"
  | "SET_SALARY_MIN"
  | "SET_SALARY_MAX"
  | "SET_SALARY_RANGE"
  | "SET_DATE_APPLIED_FROM"
  | "SET_DATE_APPLIED_TO"
  | "SET_DATE_RANGE"
  | "SET_COMPATIBILITY_SCORE"
  | "SET_STARRED_FILTER"
  | "CLEAR_COMPANIES"
  | "CLEAR_POSITIONS"
  | "CLEAR_STATUSES"
  | "CLEAR_WORK_ARRANGEMENTS"
  | "CLEAR_TYPES"
  | "CLEAR_SALARY"
  | "CLEAR_DATES"
  | "CLEAR_COMPATIBILITY_SCORE"
  | "CLEAR_STARRED_FILTER"
  | "CLEAR_ALL_FILTERS"
  | "RESET_FILTERS"
  | "LOAD_FROM_URL"

// Filter action payload types
export interface SetMultiSelectPayload {
  values: string[]
}

export interface SetSingleValuePayload<T> {
  value: T | undefined
}

export interface SetRangePayload {
  min?: number
  max?: number
}

export interface SetDateRangePayload {
  from?: Date
  to?: Date
}

export interface SetCompatibilityScorePayload {
  range: number[] // [min, max]
}

export interface LoadFromUrlPayload {
  filters: Partial<FilterState>
}

// Union type for all possible payloads
export type FilterActionPayload =
  | SetMultiSelectPayload
  | SetSingleValuePayload<number>
  | SetSingleValuePayload<Date>
  | SetSingleValuePayload<"all" | "starred" | "unstarred">
  | SetRangePayload
  | SetDateRangePayload
  | SetCompatibilityScorePayload
  | LoadFromUrlPayload
  | undefined // for actions that don't need payload

// Complete filter action interface
export interface FilterAction {
  type: FilterActionType
  payload?: FilterActionPayload
}

// Filter context value interface
export interface FilterContextValue {
  // State
  filters: FilterState
  isLoading: boolean
  
  // Actions
  setCompanies: (companies: string[]) => void
  setPositions: (positions: string[]) => void
  setStatuses: (statuses: string[]) => void
  setWorkArrangements: (arrangements: string[]) => void
  setTypes: (types: string[]) => void
  setSalaryMin: (min: number | undefined) => void
  setSalaryMax: (max: number | undefined) => void
  setSalaryRange: (min?: number, max?: number) => void
  setDateAppliedFrom: (date: Date | undefined) => void
  setDateAppliedTo: (date: Date | undefined) => void
  setDateRange: (from?: Date, to?: Date) => void
  setCompatibilityScore: (range: number[]) => void
  setStarredFilter: (filter: "all" | "starred" | "unstarred") => void
  
  // Clear actions
  clearCompanies: () => void
  clearPositions: () => void
  clearStatuses: () => void
  clearWorkArrangements: () => void
  clearTypes: () => void
  clearSalary: () => void
  clearDates: () => void
  clearCompatibilityScore: () => void
  clearStarredFilter: () => void
  clearAllFilters: () => void
  
  // Utility actions
  resetFilters: () => void
  loadFromUrl: () => void
  
  // Helper getters
  getActiveFilterCount: () => number
  hasActiveFilters: () => boolean
}

// Default filter state
export const DEFAULT_FILTER_STATE: FilterState = {
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
}

// URL parameter mapping for filter synchronization
export const FILTER_URL_PARAMS = {
  companies: 'companies',
  positions: 'positions', 
  statuses: 'statuses',
  workArrangements: 'workArrangements',
  types: 'types',
  salaryMin: 'salaryMin',
  salaryMax: 'salaryMax',
  dateAppliedFrom: 'dateFrom',
  dateAppliedTo: 'dateTo',
  compatibilityScore: 'compatibility',
  starredFilter: 'starred'
} as const

// Debounce configuration
export const FILTER_DEBOUNCE_CONFIG = {
  TEXT_INPUT_DELAY: 300,
  RANGE_INPUT_DELAY: 500,
  SLIDER_DELAY: 200
} as const

// Filter option types (for dropdowns)
export interface FilterOption {
  value: string
  label: string
}

export const STATUS_OPTIONS: FilterOption[] = [
  { value: "applied", label: "Applied" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" }
]

export const WORK_ARRANGEMENT_OPTIONS: FilterOption[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "in_office", label: "In Office" }
]

export const TYPE_OPTIONS: FilterOption[] = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" }
]

export const STARRED_FILTER_OPTIONS: FilterOption[] = [
  { value: "all", label: "All Applications" },
  { value: "starred", label: "Starred Only" },
  { value: "unstarred", label: "Unstarred Only" }
] 