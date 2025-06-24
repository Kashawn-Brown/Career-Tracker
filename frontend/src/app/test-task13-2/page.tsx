"use client"

import { FilterProvider, useFilterContext } from '@/contexts/FilterContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState, useEffect } from 'react'

function FilterTester() {
  const { 
    filters,
    setCompanies,
    setPositions,
    setSalaryMin,
    setSalaryMax,
    setStarredFilter,
    clearAllFilters,
    getActiveFilterCount
  } = useFilterContext()

  const [currentUrl, setCurrentUrl] = useState('')

  // Update URL display when filters change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href)
    }
  }, [filters])

  // Additional URL monitoring with a slight delay to catch debounced updates
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        setCurrentUrl(window.location.href)
      }, 400) // Slightly longer than the 300ms debounce

      return () => clearTimeout(timer)
    }
  }, [filters])

  // Periodic URL refresh to ensure synchronization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const interval = setInterval(() => {
        const newUrl = window.location.href
        if (newUrl !== currentUrl) {
          setCurrentUrl(newUrl)
        }
      }, 500)

      return () => clearInterval(interval)
    }
  }, [currentUrl])

  const refreshUrl = () => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Task 13.2: Filter State Management Test</h1>
        <p className="text-green-600 font-semibold">✅ COMPREHENSIVE FUNCTIONALITY TEST</p>
      </div>

      {/* Current State Display */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">🔍 Current Filter State (Global Context)</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p><strong>Active Filter Count:</strong> {getActiveFilterCount()}</p>
            <p><strong>Companies:</strong> [{filters.companies.join(', ') || 'None'}]</p>
            <p><strong>Positions:</strong> [{filters.positions.join(', ') || 'None'}]</p>
          </div>
          <div className="space-y-1">
            <p><strong>Salary Min:</strong> ${filters.salaryMin ?? 'Not set'}</p>
            <p><strong>Salary Max:</strong> ${filters.salaryMax ?? 'Not set'}</p>
            <p><strong>Starred Filter:</strong> {filters.starredFilter}</p>
          </div>
        </div>
      </div>

      {/* URL Synchronization Display */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold">🔄 URL Synchronization Test</h2>
          <Button size="sm" variant="outline" onClick={refreshUrl}>
            🔄 Refresh URL
          </Button>
        </div>
        <p className="text-sm mb-2"><strong>Current URL:</strong></p>
        <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs font-mono break-all">
          {currentUrl}
        </div>
        <p className="text-sm text-blue-600 mt-2">
          ↑ Watch this URL change as you modify filters below (with 300ms debouncing)
        </p>
      </div>

      {/* Testing Controls */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Multi-Select Filters */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">📋 Multi-Select Filters</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Companies (Array Test)</Label>
              <div className="space-y-2 mt-1">
                <Button size="sm" onClick={() => setCompanies(['Google'])}>
                  Set: Google
                </Button>
                <Button size="sm" variant="outline" onClick={() => setCompanies(['Microsoft', 'Apple'])}>
                  Set: Microsoft, Apple
                </Button>
                <Button size="sm" variant="outline" onClick={() => setCompanies(['Google', 'Microsoft', 'Apple', 'Netflix'])}>
                  Set: 4 Companies
                </Button>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Positions (Array Test)</Label>
              <div className="space-y-2 mt-1">
                <Button size="sm" onClick={() => setPositions(['Senior Engineer'])}>
                  Set: Senior Engineer
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPositions(['Manager', 'Director'])}>
                  Set: Manager, Director
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Single Value Filters */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">💰 Single Value Filters (Debouncing Test)</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="salary-min" className="text-sm font-medium">
                Salary Min (Type fast to test debouncing)
              </Label>
              <Input
                id="salary-min"
                type="number"
                value={filters.salaryMin ?? ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined
                  setSalaryMin(value)
                }}
                onBlur={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined
                  // Validation: min cannot be greater than max (only when user finishes typing)
                  if (value && filters.salaryMax && value > filters.salaryMax) {
                    alert(`Salary Min ($${value.toLocaleString()}) cannot be greater than Salary Max ($${filters.salaryMax.toLocaleString()})`)
                    setSalaryMin(filters.salaryMax) // Auto-correct to max value
                  }
                }}
                placeholder="e.g., 100000"
                className="mt-1"
              />
              {filters.salaryMin && filters.salaryMax && filters.salaryMin > filters.salaryMax && (
                <p className="text-xs text-red-500 mt-1">⚠️ Min cannot be greater than Max</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                ⏱️ URL updates 300ms after typing. Validation occurs when you click away.
              </p>
            </div>
            
            <div>
              <Label htmlFor="salary-max" className="text-sm font-medium">Salary Max</Label>
              <Input
                id="salary-max"
                type="number"
                value={filters.salaryMax ?? ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined
                  setSalaryMax(value)
                }}
                onBlur={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined
                  // Validation: max cannot be less than min (only when user finishes typing)
                  if (value && filters.salaryMin && value < filters.salaryMin) {
                    alert(`Salary Max ($${value.toLocaleString()}) cannot be less than Salary Min ($${filters.salaryMin.toLocaleString()})`)
                    setSalaryMax(filters.salaryMin) // Auto-correct to min value
                  }
                }}
                placeholder="e.g., 200000"
                className="mt-1"
              />
              {filters.salaryMax && filters.salaryMin && filters.salaryMax < filters.salaryMin && (
                <p className="text-xs text-red-500 mt-1">⚠️ Max cannot be less than Min</p>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Starred Filter (Enum Test)</Label>
              <div className="flex gap-2 mt-1">
                <Button size="sm" variant={filters.starredFilter === 'all' ? 'default' : 'outline'} 
                        onClick={() => setStarredFilter('all')}>
                  All
                </Button>
                <Button size="sm" variant={filters.starredFilter === 'starred' ? 'default' : 'outline'} 
                        onClick={() => setStarredFilter('starred')}>
                  Starred
                </Button>
                <Button size="sm" variant={filters.starredFilter === 'unstarred' ? 'default' : 'outline'} 
                        onClick={() => setStarredFilter('unstarred')}>
                  Unstarred
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Instructions */}
      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">🧪 How to Test Task 13.2 Features</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">✅ URL Synchronization:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Click any filter button above</li>
              <li>Watch the URL change in yellow box</li>
              <li>Copy the URL and open in new tab</li>
              <li>Filters should be preserved</li>
            </ol>
          </div>
          <div>
            <h4 className="font-semibold mb-2">✅ Debouncing Test:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Type rapidly in salary fields</li>
              <li>URL should NOT update while typing</li>
              <li>Stop typing for 300ms</li>
              <li>URL should update with final value</li>
            </ol>
          </div>
          <div>
            <h4 className="font-semibold mb-2">✅ Global State:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Set filters here</li>
              <li>Navigate to different page</li>
              <li>Come back - state preserved</li>
              <li>Multiple components share state</li>
            </ol>
          </div>
          <div>
            <h4 className="font-semibold mb-2">✅ Persistence Test:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Set several filters</li>
              <li>Refresh the page (F5)</li>
              <li>All filters should remain</li>
              <li>Browser back/forward works</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Quick Test Buttons */}
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">🚀 Quick Test Scenarios</h3>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => {
            setCompanies(['Google', 'Microsoft'])
            setSalaryMin(120000)
            setSalaryMax(180000)
            setStarredFilter('starred')
          }}>
            Set Complex Filter Combo
          </Button>
          <Button variant="outline" onClick={() => {
            setCompanies(['Netflix', 'Tesla', 'Apple'])
            setPositions(['Senior Engineer', 'Staff Engineer'])
            setSalaryMin(150000)
          }}>
            Set Another Combo
          </Button>
          <Button variant="destructive" onClick={clearAllFilters}>
            Clear All Filters
          </Button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Click these to quickly test complex filter combinations and URL serialization
        </p>
      </div>
    </div>
  )
}

export default function FilterTestPage() {
  return (
    <FilterProvider>
      <FilterTester />
    </FilterProvider>
  )
} 