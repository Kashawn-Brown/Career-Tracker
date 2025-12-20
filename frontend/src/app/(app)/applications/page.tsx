// ApplicationsPage: placeholder for the main dashboard (will connect to GET /applications later).

"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type { ApplicationsListResponse } from "@/types/api";
import { ApplicationsTable } from "@/components/applications/ApplicationsTable";
import { CreateApplicationForm } from "@/components/applications/CreateApplicationForm";
import { Button } from "@/components/ui/button";

// ApplicationsPage: fetches and displays the user's applications (GET /applications) with pagination.
export default function ApplicationsPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50); // MVP: fixed page size (we can make it user-selectable later)

  // Data + UI state
  const [data, setData] = useState<ApplicationsListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  // Fetching applications when the page first mounts (& again whenever page or pageSize changes)
  useEffect(() => {
    async function load() {
      // Start loading + clear any old error
      setIsLoading(true);
      setErrorMessage(null);

      try {
        // Build query string for backend pagination params.
        const query = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });

        // Make call to backend for users applications
        const res = await apiFetch<ApplicationsListResponse>(
          `${routes.applications.list()}?${query.toString()}`,
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
  }, [page, pageSize, reloadKey]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Applications</h1>
        <p className="text-sm text-muted-foreground">
          {data ? `${data.total} total • page ${data.page} of ${data.totalPages}` : "Loading…"}
        </p>
      </div>

      {errorMessage ? <div className="text-sm text-red-600">{errorMessage}</div> : null}

      {isLoading && !data ? (
        <div className="text-sm">Loading applications...</div>
      ) : (
        <>
          <CreateApplicationForm
            onCreated={() => {
              setPage(1); // MVP: jump back to first page to see the newest item
              setReloadKey((k) => k + 1);
            }}
          />
          <ApplicationsTable 
            items={data?.items ?? []} 
            onChanged={() => setReloadKey((k) => k + 1)}
          />
        </>
      )}

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

