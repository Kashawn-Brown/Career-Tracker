/**
 * Filter Reducer for Job Application Filter System
 * Centralized state management for all filter operations
 */

import {
  FilterState,
  FilterAction,
  DEFAULT_FILTER_STATE,
  SetMultiSelectPayload,
  SetSingleValuePayload,
  SetRangePayload,
  SetDateRangePayload,
  SetCompatibilityScorePayload,
  LoadFromUrlPayload
} from '../../types/filters'

/**
 * Filter reducer function to handle all filter state changes
 */
export function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    // Multi-select setters
    case "SET_COMPANIES":
      return {
        ...state,
        companies: (action.payload as SetMultiSelectPayload).values
      }
    
    case "SET_POSITIONS":
      return {
        ...state,
        positions: (action.payload as SetMultiSelectPayload).values
      }
    
    case "SET_STATUSES":
      return {
        ...state,
        statuses: (action.payload as SetMultiSelectPayload).values
      }
    
    case "SET_WORK_ARRANGEMENTS":
      return {
        ...state,
        workArrangements: (action.payload as SetMultiSelectPayload).values
      }
    
    case "SET_TYPES":
      return {
        ...state,
        types: (action.payload as SetMultiSelectPayload).values
      }

    // Single value setters
    case "SET_SALARY_MIN":
      return {
        ...state,
        salaryMin: (action.payload as SetSingleValuePayload<number>).value
      }
    
    case "SET_SALARY_MAX":
      return {
        ...state,
        salaryMax: (action.payload as SetSingleValuePayload<number>).value
      }
    
    case "SET_SALARY_RANGE":
      const salaryPayload = action.payload as SetRangePayload
      return {
        ...state,
        salaryMin: salaryPayload.min,
        salaryMax: salaryPayload.max
      }
    
    case "SET_DATE_APPLIED_FROM":
      return {
        ...state,
        dateAppliedFrom: (action.payload as SetSingleValuePayload<Date>).value
      }
    
    case "SET_DATE_APPLIED_TO":
      return {
        ...state,
        dateAppliedTo: (action.payload as SetSingleValuePayload<Date>).value
      }
    
    case "SET_DATE_RANGE":
      const datePayload = action.payload as SetDateRangePayload
      return {
        ...state,
        dateAppliedFrom: datePayload.from,
        dateAppliedTo: datePayload.to
      }
    
    case "SET_COMPATIBILITY_SCORE":
      return {
        ...state,
        compatibilityScore: (action.payload as SetCompatibilityScorePayload).range
      }
    
    case "SET_STARRED_FILTER":
      const starredPayload = action.payload as SetSingleValuePayload<"all" | "starred" | "unstarred">
      return {
        ...state,
        starredFilter: starredPayload.value ?? "all"
      }

    // Clear individual filters
    case "CLEAR_COMPANIES":
      return {
        ...state,
        companies: []
      }
    
    case "CLEAR_POSITIONS":
      return {
        ...state,
        positions: []
      }
    
    case "CLEAR_STATUSES":
      return {
        ...state,
        statuses: []
      }
    
    case "CLEAR_WORK_ARRANGEMENTS":
      return {
        ...state,
        workArrangements: []
      }
    
    case "CLEAR_TYPES":
      return {
        ...state,
        types: []
      }
    
    case "CLEAR_SALARY":
      return {
        ...state,
        salaryMin: undefined,
        salaryMax: undefined
      }
    
    case "CLEAR_DATES":
      return {
        ...state,
        dateAppliedFrom: undefined,
        dateAppliedTo: undefined
      }
    
    case "CLEAR_COMPATIBILITY_SCORE":
      return {
        ...state,
        compatibilityScore: [1, 10]
      }
    
    case "CLEAR_STARRED_FILTER":
      return {
        ...state,
        starredFilter: "all"
      }

    // Clear all filters
    case "CLEAR_ALL_FILTERS":
    case "RESET_FILTERS":
      return { ...DEFAULT_FILTER_STATE }

    // Load from URL
    case "LOAD_FROM_URL":
      const urlPayload = action.payload as LoadFromUrlPayload
      return {
        ...state,
        ...urlPayload.filters
      }

    default:
      return state
  }
}

/**
 * Helper function to calculate active filter count
 */
export function getActiveFilterCount(filters: FilterState): number {
  return [
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
}

/**
 * Helper function to check if any filters are active
 */
export function hasActiveFilters(filters: FilterState): boolean {
  return getActiveFilterCount(filters) > 0
} 