"use client"

/**
 * Filter Context Provider for Job Application Filter System
 * Provides global filter state management with URL synchronization and debouncing
 */

import { createContext, useContext, useReducer, useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import {
  FilterState,
  FilterContextValue,
  DEFAULT_FILTER_STATE,
  FILTER_URL_PARAMS,
  FILTER_DEBOUNCE_CONFIG
} from '@/types/filters'
import {
  filterReducer,
  getActiveFilterCount,
  hasActiveFilters
} from '@/lib/filters/filterReducer'

// Create the filter context
const FilterContext = createContext<FilterContextValue | undefined>(undefined)

// Custom hook for accessing filter context
export function useFilterContext(): FilterContextValue {
  const context = useContext(FilterContext)
  if (context === undefined) {
    throw new Error('useFilterContext must be used within a FilterProvider')
  }
  return context
}

// Custom hook for easier filter access (optional convenience hook)
export function useFilters() {
  const { filters } = useFilterContext()
  return filters
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// URL serialization utilities
const serializeFilterStateToUrl = (filters: FilterState): URLSearchParams => {
  const params = new URLSearchParams()
  
  // Multi-select arrays (comma-separated)
  if (filters.companies.length > 0) {
    params.set(FILTER_URL_PARAMS.companies, filters.companies.join(','))
  }
  if (filters.positions.length > 0) {
    params.set(FILTER_URL_PARAMS.positions, filters.positions.join(','))
  }
  if (filters.statuses.length > 0) {
    params.set(FILTER_URL_PARAMS.statuses, filters.statuses.join(','))
  }
  if (filters.workArrangements.length > 0) {
    params.set(FILTER_URL_PARAMS.workArrangements, filters.workArrangements.join(','))
  }
  if (filters.types.length > 0) {
    params.set(FILTER_URL_PARAMS.types, filters.types.join(','))
  }
  
  // Salary range
  if (filters.salaryMin !== undefined) {
    params.set(FILTER_URL_PARAMS.salaryMin, filters.salaryMin.toString())
  }
  if (filters.salaryMax !== undefined) {
    params.set(FILTER_URL_PARAMS.salaryMax, filters.salaryMax.toString())
  }
  
  // Date range
  if (filters.dateAppliedFrom) {
    params.set(FILTER_URL_PARAMS.dateAppliedFrom, filters.dateAppliedFrom.toISOString())
  }
  if (filters.dateAppliedTo) {
    params.set(FILTER_URL_PARAMS.dateAppliedTo, filters.dateAppliedTo.toISOString())
  }
  
  // Compatibility score (if not default range)
  if (filters.compatibilityScore[0] !== 1 || filters.compatibilityScore[1] !== 10) {
    params.set(FILTER_URL_PARAMS.compatibilityScore, filters.compatibilityScore.join(','))
  }
  
  // Starred filter (if not default)
  if (filters.starredFilter !== "all") {
    params.set(FILTER_URL_PARAMS.starredFilter, filters.starredFilter)
  }
  
  return params
}

const deserializeFilterStateFromUrl = (searchParams: URLSearchParams): Partial<FilterState> => {
  const filters: Partial<FilterState> = {}
  
  // Multi-select arrays
  const companies = searchParams.get(FILTER_URL_PARAMS.companies)
  if (companies) {
    filters.companies = companies.split(',').filter(Boolean)
  }
  
  const positions = searchParams.get(FILTER_URL_PARAMS.positions)
  if (positions) {
    filters.positions = positions.split(',').filter(Boolean)
  }
  
  const statuses = searchParams.get(FILTER_URL_PARAMS.statuses)
  if (statuses) {
    filters.statuses = statuses.split(',').filter(Boolean)
  }
  
  const workArrangements = searchParams.get(FILTER_URL_PARAMS.workArrangements)
  if (workArrangements) {
    filters.workArrangements = workArrangements.split(',').filter(Boolean)
  }
  
  const types = searchParams.get(FILTER_URL_PARAMS.types)
  if (types) {
    filters.types = types.split(',').filter(Boolean)
  }
  
  // Salary range
  const salaryMin = searchParams.get(FILTER_URL_PARAMS.salaryMin)
  if (salaryMin) {
    const parsed = parseInt(salaryMin, 10)
    if (!isNaN(parsed)) {
      filters.salaryMin = parsed
    }
  }
  
  const salaryMax = searchParams.get(FILTER_URL_PARAMS.salaryMax)
  if (salaryMax) {
    const parsed = parseInt(salaryMax, 10)
    if (!isNaN(parsed)) {
      filters.salaryMax = parsed
    }
  }
  
  // Date range
  const dateFrom = searchParams.get(FILTER_URL_PARAMS.dateAppliedFrom)
  if (dateFrom) {
    try {
      filters.dateAppliedFrom = new Date(dateFrom)
    } catch {
      // Invalid date, ignore
    }
  }
  
  const dateTo = searchParams.get(FILTER_URL_PARAMS.dateAppliedTo)
  if (dateTo) {
    try {
      filters.dateAppliedTo = new Date(dateTo)
    } catch {
      // Invalid date, ignore
    }
  }
  
  // Compatibility score
  const compatibility = searchParams.get(FILTER_URL_PARAMS.compatibilityScore)
  if (compatibility) {
    const parsed = compatibility.split(',').map(n => parseInt(n, 10))
    if (parsed.length === 2 && !parsed.some(isNaN)) {
      filters.compatibilityScore = parsed
    }
  }
  
  // Starred filter
  const starred = searchParams.get(FILTER_URL_PARAMS.starredFilter)
  if (starred && (starred === "starred" || starred === "unstarred")) {
    filters.starredFilter = starred
  }
  
  return filters
}

interface FilterProviderProps {
  children: React.ReactNode
}

function FilterProviderInternal({ children }: FilterProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Initialize state with defaults first, then load from URL in effect
  const [filters, dispatch] = useReducer(filterReducer, DEFAULT_FILTER_STATE)
  const [hasLoadedFromUrl, setHasLoadedFromUrl] = useState(false)
  
  // Load from URL on mount
  useEffect(() => {
    if (!hasLoadedFromUrl) {
      const urlFilters = deserializeFilterStateFromUrl(searchParams)
      if (Object.keys(urlFilters).length > 0) {
        dispatch({ type: "LOAD_FROM_URL", payload: { filters: urlFilters } })
      }
      setHasLoadedFromUrl(true)
    }
  }, [searchParams, hasLoadedFromUrl])
  
  const [isLoading] = useState(false)
  
  // Debounced filters for URL updates
  const debouncedFilters = useDebounce(filters, FILTER_DEBOUNCE_CONFIG.TEXT_INPUT_DELAY)
  
  // Update URL when debounced filters change
  useEffect(() => {
    const params = serializeFilterStateToUrl(debouncedFilters)
    const newUrl = `${pathname}?${params.toString()}`
    
    // Only update if URL actually changed
    if (newUrl !== `${pathname}?${searchParams.toString()}`) {
      router.replace(newUrl, { scroll: false })
    }
  }, [debouncedFilters, pathname, router, searchParams])
  
  // Action creators with dispatch
  const contextValue: FilterContextValue = useMemo(() => ({
    // State
    filters,
    isLoading,
    
    // Multi-select actions
    setCompanies: (companies: string[]) => {
      dispatch({ type: "SET_COMPANIES", payload: { values: companies } })
    },
    setPositions: (positions: string[]) => {
      dispatch({ type: "SET_POSITIONS", payload: { values: positions } })
    },
    setStatuses: (statuses: string[]) => {
      dispatch({ type: "SET_STATUSES", payload: { values: statuses } })
    },
    setWorkArrangements: (arrangements: string[]) => {
      dispatch({ type: "SET_WORK_ARRANGEMENTS", payload: { values: arrangements } })
    },
    setTypes: (types: string[]) => {
      dispatch({ type: "SET_TYPES", payload: { values: types } })
    },
    
    // Single value actions
    setSalaryMin: (min: number | undefined) => {
      dispatch({ type: "SET_SALARY_MIN", payload: { value: min } })
    },
    setSalaryMax: (max: number | undefined) => {
      dispatch({ type: "SET_SALARY_MAX", payload: { value: max } })
    },
    setSalaryRange: (min?: number, max?: number) => {
      dispatch({ type: "SET_SALARY_RANGE", payload: { min, max } })
    },
    setDateAppliedFrom: (date: Date | undefined) => {
      dispatch({ type: "SET_DATE_APPLIED_FROM", payload: { value: date } })
    },
    setDateAppliedTo: (date: Date | undefined) => {
      dispatch({ type: "SET_DATE_APPLIED_TO", payload: { value: date } })
    },
    setDateRange: (from?: Date, to?: Date) => {
      dispatch({ type: "SET_DATE_RANGE", payload: { from, to } })
    },
    setCompatibilityScore: (range: number[]) => {
      dispatch({ type: "SET_COMPATIBILITY_SCORE", payload: { range } })
    },
    setStarredFilter: (filter: "all" | "starred" | "unstarred") => {
      dispatch({ type: "SET_STARRED_FILTER", payload: { value: filter } })
    },
    
    // Clear actions
    clearCompanies: () => dispatch({ type: "CLEAR_COMPANIES" }),
    clearPositions: () => dispatch({ type: "CLEAR_POSITIONS" }),
    clearStatuses: () => dispatch({ type: "CLEAR_STATUSES" }),
    clearWorkArrangements: () => dispatch({ type: "CLEAR_WORK_ARRANGEMENTS" }),
    clearTypes: () => dispatch({ type: "CLEAR_TYPES" }),
    clearSalary: () => dispatch({ type: "CLEAR_SALARY" }),
    clearDates: () => dispatch({ type: "CLEAR_DATES" }),
    clearCompatibilityScore: () => dispatch({ type: "CLEAR_COMPATIBILITY_SCORE" }),
    clearStarredFilter: () => dispatch({ type: "CLEAR_STARRED_FILTER" }),
    clearAllFilters: () => dispatch({ type: "CLEAR_ALL_FILTERS" }),
    
    // Utility actions
    resetFilters: () => dispatch({ type: "RESET_FILTERS" }),
    loadFromUrl: () => {
      const urlFilters = deserializeFilterStateFromUrl(searchParams)
      dispatch({ type: "LOAD_FROM_URL", payload: { filters: urlFilters } })
    },
    
    // Helper getters
    getActiveFilterCount: () => getActiveFilterCount(filters),
    hasActiveFilters: () => hasActiveFilters(filters)
  }), [filters, isLoading, searchParams])
  
  return (
    <FilterContext.Provider value={contextValue}>
      {children}
    </FilterContext.Provider>
  )
}

// Wrapper component with Suspense boundary for useSearchParams
export function FilterProvider({ children }: FilterProviderProps) {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading filters...</div>}>
      <FilterProviderInternal>
        {children}
      </FilterProviderInternal>
    </Suspense>
  )
} 