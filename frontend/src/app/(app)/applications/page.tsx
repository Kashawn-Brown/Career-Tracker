"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type { ApplicationsListResponse, ApplicationStatus, ApplicationSortBy, ApplicationSortDir } from "@/types/api";
import { ApplicationsTable } from "@/components/applications/ApplicationsTable";
import { CreateApplicationForm } from "@/components/applications/CreateApplicationForm";
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

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | ApplicationStatus>("ALL");
  const [sortBy, setSortBy] = useState<ApplicationSortBy>(DEFAULT_SORT_BY);
  const [sortDir, setSortDir] = useState<ApplicationSortDir>(DEFAULT_SORT_DIR);

  const isDefaultSort = sortBy === DEFAULT_SORT_BY && sortDir === DEFAULT_SORT_DIR;


  // State to force re-fetch
  const [reloadKey, setReloadKey] = useState(0);

  // Status options list
  const statusOptions: Array<"ALL" | ApplicationStatus> = ["ALL", "WISHLIST", "APPLIED", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"];

  /**
   * Legacy-style sort cycle:
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

  // Fetching applications when the page first mounts (& again whenever page or pageSize changes or reloadKey is changed)
  useEffect(() => {
    async function load() {
      // Start loading + clear any old error
      setIsLoading(true);
      setErrorMessage(null);

      try {
        // Build query string for backend params.
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          sortBy,
          sortDir,
        });

        // only includes filters when they’re set
        if (query) params.set("q", query.trim());
        if (status !== "ALL") params.set("status", status);

        // Make call to backend for users applications
        const res = await apiFetch<ApplicationsListResponse>(
          `${routes.applications.list()}?${params.toString()}`,
          { method: "GET" }
        );

        setData(res);

      } catch (err) {
        if (err instanceof ApiError) setErrorMessage(err.message);
        else setErrorMessage("Failed to load applications.");
        
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [page, pageSize, query, status, sortBy, sortDir, reloadKey]);

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

        <CardContent className="space-y-4">
          {/* Controls (MVP) */}
          <div className="grid gap-4 md:grid-cols-4">
            {/* Query/Search filter */}
            <div className="space-y-1 md:col-span-2">
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

            {/* Status Filter */}
            <div className="space-y-1">
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as "ALL" | ApplicationStatus);
                  resetToFirstPage();
                }}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
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

