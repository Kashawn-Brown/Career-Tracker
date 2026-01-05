"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { applicationsApi } from "@/lib/api/applications";
import type { ApplicationsListResponse, ApplicationStatus, ApplicationSortBy, ApplicationSortDir, JobType, WorkMode, ListApplicationsParams } from "@/types/api";
import { STATUS_FILTER_OPTIONS, JOB_TYPE_FILTER_OPTIONS, WORK_MODE_FILTER_OPTIONS, statusLabel, jobTypeLabel, workModeLabel } from "@/lib/applications/presentation";
import { ApplicationsTable } from "@/components/applications/ApplicationsTable";
import { CreateApplicationForm } from "@/components/applications/CreateApplicationForm";
import { useRef } from "react";
import { ColumnsControl } from "@/components/applications/ColumnsControl";
import { APPLICATION_COLUMNS_STORAGE_KEY, DEFAULT_VISIBLE_APPLICATION_COLUMNS, normalizeVisibleColumns, type ApplicationColumnId} from "@/lib/applications/tableColumns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";


// ApplicationsPage: fetches and displays the user's applications (GET /applications) with pagination.
export default function ApplicationsPage() {

  // Page state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50); // MVP: fixed page size (will make it user-selectable later)

  // Data + UI state
  const [data, setData] = useState<ApplicationsListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters / sorting.
  const DEFAULT_SORT_BY: ApplicationSortBy = "updatedAt";
  const DEFAULT_SORT_DIR: ApplicationSortDir = "desc";

  const [sortBy, setSortBy] = useState<ApplicationSortBy>(DEFAULT_SORT_BY);
  const [sortDir, setSortDir] = useState<ApplicationSortDir>(DEFAULT_SORT_DIR);

  const isDefaultSort = sortBy === DEFAULT_SORT_BY && sortDir === DEFAULT_SORT_DIR;

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | ApplicationStatus>("ALL");
  const [jobType, setJobType] = useState<"ALL" | JobType>("ALL");
  const [workMode, setWorkMode] = useState<"ALL" | WorkMode>("ALL");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // Column visibility state
  const [showColumns, setShowColumns] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ApplicationColumnId[]>(DEFAULT_VISIBLE_APPLICATION_COLUMNS);

  // Prevent overwriting saved settings on first render
  const skipFirstColumnsSaveRef = useRef(true);


  // State to force re-fetch
  const [reloadKey, setReloadKey] = useState(0);

  // Fetching applications when the page first mounts (& again whenever page or pageSize changes or reloadKey is changed)
  useEffect(() => {
    async function load() {
      // Start loading + clear any old error
      setIsLoading(true);
      setErrorMessage(null);

      try {
        // Build query string for backend params.
        const params = {
          page,
          pageSize,
          q: query,
          status,
          sortBy,
          sortDir,
          jobType,
          workMode,
          favoritesOnly,
        } satisfies ListApplicationsParams;

        // Call the backend API to get the paginated applications.
        const res = await applicationsApi.list(params);

        setData(res);

      } catch (err) {
        if (err instanceof ApiError) setErrorMessage(err.message);
        else setErrorMessage("Failed to load applications.");
        
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [page, pageSize, query, status, sortBy, sortDir, jobType, workMode, favoritesOnly, reloadKey]);

  // Load column visibility settings from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(APPLICATION_COLUMNS_STORAGE_KEY);
      if (!raw) return;
  
      const savedColumns = JSON.parse(raw);
      setVisibleColumns(normalizeVisibleColumns(savedColumns));
    } catch {
      // Ignore bad storage data; fall back to defaults
    }
  }, []);

  // Save column visibility settings to localStorage
  useEffect(() => {
    if (skipFirstColumnsSaveRef.current) {
      skipFirstColumnsSaveRef.current = false;
      return;
    }
  
    localStorage.setItem(
      APPLICATION_COLUMNS_STORAGE_KEY,
      JSON.stringify(visibleColumns)
    );
  }, [visibleColumns]);
  
  /**
   * Sorting cycle:
   * - new column click: asc
   * - 2nd click: desc
   * - 3rd click: reset to default (updatedAt desc)
   */
  function handleHeaderSortClick(nextSortBy: ApplicationSortBy) {
    // Any sort change should bring us back to page 1.
    setPage(1);

    // Special case: if we're on the default sort and clicking the same column, toggle the sort direction.
    if (isDefaultSort && nextSortBy === DEFAULT_SORT_BY) {
      setSortDir("asc");
      return;
    }

    if (sortBy !== nextSortBy) {
      setSortBy(nextSortBy);
      setSortDir("asc");
      return;
    }

    if (sortDir === "asc") {
      setSortDir("desc");
      return;
    }

    // Third click resets to the default sort.
    setSortBy(DEFAULT_SORT_BY);
    setSortDir(DEFAULT_SORT_DIR);
  }

  // refreshList: forces a refetch without changing filter state.
  function refreshList() {
    setReloadKey((k) => k + 1);
  }
  
  // resetToFirstPage: ensures we don’t request an out-of-range page after filtering.
  function resetToFirstPage() {
    setPage(1);
  }

  // resetControls: returns filters/sort back to MVP defaults.
  function resetControls() {
    setQuery("");
    setStatus("ALL");
    setSortBy("updatedAt");
    setSortDir("desc");
    setJobType("ALL");
    setWorkMode("ALL");
    setFavoritesOnly(false);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Applications</h1>
        <p className="text-sm text-muted-foreground">
          {data ? `${data.total} total • page ${data.page} of ${data.totalPages}` : "Loading…"}
        </p>
      </div>

      {/* Add application */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Add application</CardTitle>
          <CardDescription>Create a new job application record.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CreateApplicationForm
            onCreated={() => {
              setPage(1);
              refreshList();
            }}
          />
        </CardContent>
      </Card>

      {/* List + controls */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Your applications</CardTitle>
          <CardDescription>
            Search, filter, and update statuses. Changes save instantly.
          </CardDescription>
        </CardHeader>
      
        {/* Table controls (MVP) */}
        <CardContent className="space-y-4">
          
          {/* Columns control */}
          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              onClick={() => setShowColumns((v) => !v)}
            >
              Columns
            </Button>
          </div>

          {showColumns ? (
            <ColumnsControl
              visibleColumns={visibleColumns}
              onChange={setVisibleColumns}
            />
          ) : null}


          <div className="grid gap-4 md:grid-cols-12">
            {/* Search */}
            <div className="space-y-1 md:col-span-6">
              <Label htmlFor="q">Search</Label>
              <Input
                id="q"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  resetToFirstPage();
                }}
                placeholder="Search company or position..."
              />
            </div>

            {/* Status */}
            <div className="space-y-1 md:col-span-6">
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as "ALL" | ApplicationStatus);
                  resetToFirstPage();
                }}
              >
                {STATUS_FILTER_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === "ALL" ? "All statuses" : statusLabel(s)}
                  </option>
                ))}
              </Select>
            </div>


            {/* Job type */}
            <div className="space-y-1 md:col-span-4">
              <Label htmlFor="jobType">Job type</Label>
              <Select
                id="jobType"
                value={jobType}
                onChange={(e) => {
                  setJobType(e.target.value as "ALL" | JobType);
                  resetToFirstPage();
                }}
              >
                {JOB_TYPE_FILTER_OPTIONS.map((j) => (
                  <option key={j} value={j}>
                    {j === "ALL" ? "All types" : jobTypeLabel(j)}
                  </option>
                ))}
              </Select>
            </div>

            {/* Work mode */}
            <div className="space-y-1 md:col-span-4">
              <Label htmlFor="workMode">Work mode</Label>
              <Select
                id="workMode"
                value={workMode}
                onChange={(e) => {
                  setWorkMode(e.target.value as "ALL" | WorkMode);
                  resetToFirstPage();
                }}
              >
                {WORK_MODE_FILTER_OPTIONS.map((w) => (
                  <option key={w} value={w}>
                    {w === "ALL" ? "All modes" : workModeLabel(w)}
                  </option>
                ))}
              </Select>
            </div>

            {/* Favorites */}
            <div className="space-y-1 md:col-span-4">
              <Label htmlFor="favoritesOnly">Favorites</Label>
              <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
                <input
                  id="favoritesOnly"
                  type="checkbox"
                  checked={favoritesOnly}
                  onChange={(e) => {
                    setFavoritesOnly(e.target.checked);
                    resetToFirstPage();
                  }}
                  className="h-4 w-4"
                />
                {favoritesOnly ? <span>⭐ Favorites only</span> : <span>All applications</span>}
              </label>
            </div>

            {/* Reset */}
            <div className="flex justify-end md:col-span-12">
              <Button variant="outline" className="w-full" onClick={resetControls}>
                Reset
              </Button>
            </div>
          </div>

          {errorMessage ? <Alert variant="destructive">{errorMessage}</Alert> : null}

          {isLoading && !data ? (
            <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
              Loading applications...
            </div>
          ) : (
            <ApplicationsTable
              items={data?.items ?? []}
              sortBy={sortBy}
              sortDir={sortDir}
              isDefaultSort={isDefaultSort}
              onSort={handleHeaderSortClick}
              onChanged={() => setReloadKey((k) => k + 1)}
              visibleColumns={visibleColumns}
            />
          )}
        </CardContent>

        {/* Pagination */}
        <CardFooter className="border-t justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!data || page <= 1 || isLoading}
          >
            Prev
          </Button>

          <Button
            variant="outline"
            onClick={() => setPage((p) => (data ? Math.min(data.totalPages, p + 1) : p + 1))}
            disabled={!data || page >= data.totalPages || isLoading}
          >
            Next
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

