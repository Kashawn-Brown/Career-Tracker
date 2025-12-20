"use client";

import { useEffect, useState, useMemo } from "react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type { ApplicationsListResponse, ApplicationStatus  } from "@/types/api";
import { ApplicationsTable } from "@/components/applications/ApplicationsTable";
import { CreateApplicationForm } from "@/components/applications/CreateApplicationForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ApplicationsPage: fetches and displays the user's applications (GET /applications) with pagination.
export default function ApplicationsPage() {

  // Page state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50); // MVP: fixed page size (will make it user-selectable later)

  // Data + UI state
  const [data, setData] = useState<ApplicationsListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters / sorting (MVP).
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | ApplicationStatus>("ALL");
  const [sortBy, setSortBy] = useState<"updatedAt" | "createdAt" | "company" | "position">("updatedAt");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  // State to force re-fetch
  const [reloadKey, setReloadKey] = useState(0);

  const statusOptions: Array<"ALL" | ApplicationStatus> = useMemo(
    () => ["ALL", "WISHLIST", "APPLIED", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"],
    []
  );

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
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Applications</h1>
        <p className="text-sm text-muted-foreground">
          {data ? `${data.total} total • page ${data.page} of ${data.totalPages}` : "Loading…"}
        </p>
      </div>

      {/* Create (MVP) */}
      <CreateApplicationForm
        onCreated={() => {
          setPage(1);
          refreshList();
        }}
      />

      {/* Controls (MVP) */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-1 md:col-span-2">

          {/* Query/Search filter */}
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
          <select
            id="status"
            className="border rounded px-2 py-2 w-full"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as any);
              resetToFirstPage();
            }}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Sorting Options */}
        <div className="space-y-1">
          <Label>Sort</Label>
          <div className="flex gap-2">
            <select
              className="border rounded px-2 py-2 w-full"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                resetToFirstPage();
              }}
            >
              <option value="updatedAt">Updated</option>
              <option value="createdAt">Created</option>
              <option value="company">Company</option>
            </select>

            <select
              className="border rounded px-2 py-2"
              value={sortDir}
              onChange={(e) => {
                setSortDir(e.target.value as any);
                resetToFirstPage();
              }}
            >
              <option value="desc">↓</option>
              <option value="asc">↑</option>
            </select>
          </div>
        </div>

        {/* Reset Button */}
        <Button variant="outline" onClick={resetControls}>
          Reset
        </Button>
      </div>


      {errorMessage ? <div className="text-sm text-red-600">{errorMessage}</div> : null}

      {isLoading && !data ? (
        <div className="text-sm">Loading applications...</div>
      ) : (
        <ApplicationsTable 
          items={data?.items ?? []} 
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      )}


      {/* Pagination */}
      <div className="flex items-center gap-2">
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
      </div>
    </div>
  );
}

