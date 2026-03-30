"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { ApiError } from "@/lib/api/client";
import { applicationsApi } from "@/lib/api/applications";
import { cn } from "@/lib/utils";
import type { Application, ApplicationsListResponse, UpdateApplicationRequest, ApplicationSortBy, ApplicationSortDir, ListApplicationsParams } from "@/types/api";
import { ApplicationsTable } from "@/components/applications/ApplicationsTable";
import { CreateApplicationForm } from "@/components/applications/CreateApplicationForm";
import { CreateApplicationFromJdForm } from "@/components/applications/CreateApplicationFromJdForm";
import { ApplicationDetailsDrawer } from "@/components/applications/drawer/ApplicationDetailsDrawer";
import { ColumnsControl } from "@/components/applications/ColumnsControl";
import { APPLICATION_COLUMNS_STORAGE_KEY, DEFAULT_VISIBLE_APPLICATION_COLUMNS, normalizeVisibleColumns, type ApplicationColumnId} from "@/lib/applications/tableColumns";
import { useFitRuns } from "@/hooks/useFitRuns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import {  Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Portal } from "@/components/ui/portal";
import { ChevronDown, ChevronRight, Plus, X, CheckCircle2, AlertCircle } from "lucide-react";
import { ApplicationsFiltersPanel } from "@/components/applications/ApplicationsFiltersPanel";
import {
  type ApplicationFilters,
  DEFAULT_FILTERS,
} from "@/lib/applications/filters";
import { dateInputToStartIso, dateInputToEndIso } from "@/lib/applications/dates";
import { ApplicationsExportButton } from "@/components/applications/ApplicationsExportButton";
import { useAuth } from "@/hooks/useAuth";

// ApplicationsPage: fetches and displays the user's applications (GET /applications) with pagination.
export default function ApplicationsPage() {
  
  // Data + UI state
  const [data, setData] = useState<ApplicationsListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAddApplicationOpen, setIsAddApplicationOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Page state
  const [page, setPage] = useState(1);
  const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 250, 500] as const;
  type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

  const [pageSize, setPageSize] = useState<PageSizeOption>(50); // default stays 50

  const total = data?.total ?? 0;

  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = total === 0 ? 0 : Math.min(page * pageSize, total);

  // Filters / sorting.
  const DEFAULT_SORT_BY: ApplicationSortBy = "updatedAt";
  const DEFAULT_SORT_DIR: ApplicationSortDir = "desc";

  const [sortBy, setSortBy] = useState<ApplicationSortBy>(DEFAULT_SORT_BY);
  const [sortDir, setSortDir] = useState<ApplicationSortDir>(DEFAULT_SORT_DIR);

  const isDefaultSort = sortBy === DEFAULT_SORT_BY && sortDir === DEFAULT_SORT_DIR;

  const DEBOUNCE_MS = 250;    // Debounce time for query input (to prevent excessive API calls)
  const [query, setQuery] = useState("");       // what the user has searched for (committed query used by API)
  const [queryInput, setQueryInput] = useState(""); // what the user is typing
  // All filter state in one object — easier to reset and pass to the panel
  const [filters, setFilters] = useState<ApplicationFilters>(DEFAULT_FILTERS);

  // Convenience patcher — merges partial updates into filter state
  function patchFilters(patch: Partial<ApplicationFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1); // always reset to page 1 when filters change
  }

  // Column visibility state
  const [showColumns, setShowColumns] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ApplicationColumnId[]>(DEFAULT_VISIBLE_APPLICATION_COLUMNS);

  // Application details drawer state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [autoOpenFitAppId, setAutoOpenFitAppId] = useState<string | null>(null);

  // Tracks in-flight FIT runs so they survive drawer close / navigation.
  const fitRuns = useFitRuns();
  const { refreshMe } = useAuth();

  // Label hints for apps that were just created — list may not have refreshed yet
  // when the fit run completes, so we store the label here to avoid "this application" fallback.
  const pendingFitLabelsRef = useRef<Record<string, string>>({});

  // Global fit-run notices — success and error both surface here.
  type FitRunNotice = {
    id:            string;
    applicationId: string;
    label:         string;
    kind:          "success" | "error";
    message?:      string;
    createdAt:     number;
  };

  const [fitNotices, setFitNotices] = useState<FitRunNotice[]>([]);
  const prevFitRunStatusRef = useRef<Record<string, string>>({});


  // Prevent overwriting saved settings on first render
  const skipFirstColumnsSaveRef = useRef(true);

  // Page size storage key
  const APPLICATION_PAGE_SIZE_STORAGE_KEY = "career-tracker:applications:pageSize";
  // Prevent overwriting saved settings on first render
  const skipFirstPageSizeSaveRef = useRef(true);

  // State to force re-fetch
  const [reloadKey, setReloadKey] = useState(0);

  // Add mode: "manual" for manual application creation, "jd" for JD-based application creation (using AI)
  const [addMode, setAddMode] = useState<"manual" | "jd">("manual");


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
          sortBy,
          sortDir,
          statuses:  filters.statuses.length  ? filters.statuses  : undefined,
          jobTypes:  filters.jobTypes.length   ? filters.jobTypes  : undefined,
          workModes: filters.workModes.length  ? filters.workModes : undefined,
          favoritesOnly: filters.favoritesOnly,
          ...(filters.fitRange[0] !== 0 || filters.fitRange[1] !== 100
            ? { fitMin: filters.fitRange[0], fitMax: filters.fitRange[1] }
            : {}),
          // Convert YYYY-MM-DD to ISO boundaries before sending
          dateAppliedFrom: dateInputToStartIso(filters.dateAppliedFrom) ?? undefined,
          dateAppliedTo:   dateInputToEndIso(filters.dateAppliedTo)     ?? undefined,
          updatedFrom:     dateInputToStartIso(filters.updatedFrom)     ?? undefined,
          updatedTo:       dateInputToEndIso(filters.updatedTo)         ?? undefined,
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
  }, [page, pageSize, query, sortBy, sortDir, filters, reloadKey]);

  // Load column visibility settings from localStorage
  useEffect(() => {
    try {
      const rawCols = localStorage.getItem(APPLICATION_COLUMNS_STORAGE_KEY);
      if (rawCols) {
        const savedColumns = JSON.parse(rawCols);
        setVisibleColumns(normalizeVisibleColumns(savedColumns));
      };
  
      const rawPageSize = localStorage.getItem(APPLICATION_PAGE_SIZE_STORAGE_KEY);
      if (rawPageSize) {
        const savedPageSize = Number(rawPageSize);
        setPageSize(savedPageSize as PageSizeOption);
      }
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

  // Save page size settings to localStorage
  useEffect(() => {
    if (skipFirstPageSizeSaveRef.current) {
      skipFirstPageSizeSaveRef.current = false;
      return;
    }
  
    localStorage.setItem(APPLICATION_PAGE_SIZE_STORAGE_KEY, String(pageSize));
  }, [pageSize]);

  // Save query input to state
  useEffect(() => {
    setQueryInput(query);
  }, [query]);




  // handleSaveDetails: handles the saving of the details of the application.
  async function handleSaveDetails(
    applicationId: string,
    patch: UpdateApplicationRequest
  ) {
    const updated = await applicationsApi.update(applicationId, patch);

    // Keep the drawer in sync immediately (with the updated application)
    setSelectedApplication(updated);

    // Refresh the table list (updatedAt ordering, etc.)
    setReloadKey((k) => k + 1);

    return updated;
  }

  const selectedApplicationRef = useRef<Application | null>(null);
  useEffect(() => {
    selectedApplicationRef.current = selectedApplication;
  }, [selectedApplication]);

  // Handle application changes: refetch list and refresh drawer.
  const handleApplicationChange = useCallback(async (applicationId: string) => {
    setReloadKey((k) => k + 1);
  
    if (selectedApplicationRef.current?.id === applicationId) {
      try {
        const latest = await applicationsApi.get(applicationId);
        setSelectedApplication(latest);
      } catch {
        // non-blocking
      }
    }
  }, []); // stable — reads via ref, no stale closure

  // openDrawerForApplication: opens the drawer for the application.
  async function openDrawerForApplication(applicationId: string, opts?: { autoOpenFit?: boolean }) {
    try {
      setErrorMessage(null);
  
      const fullApplication = await applicationsApi.get(applicationId);
      setSelectedApplication(fullApplication);
      setDetailsOpen(true);
  
      if (opts?.autoOpenFit) {
        setAutoOpenFitAppId(applicationId);
      } else {
        setAutoOpenFitAppId(null);
      }
    } catch (err) {
      setAutoOpenFitAppId(null);
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to load application details. Please try again.");
    }
  }
  

  // handleConnectionsChanged: handles the change of the connections of the application.
  async function handleConnectionsChanged(applicationId: string) {
    await handleApplicationChange(applicationId);
  }

  // handleDocumentsChanged: handles the change of the documents of the application.
  async function handleDocumentsChanged(applicationId: string) {
    await handleApplicationChange(applicationId);
  }

  // handlePageSizeChange: changes the page size.
  function handlePageSizeChange(numberPerPage: string) {
    const next = Number(numberPerPage);
  
    if (!Number.isFinite(next)) return;
  
    // Only allow supported sizes (guards against weird DOM values)
    if (!PAGE_SIZE_OPTIONS.includes(next as PageSizeOption)) return;
  
    setPageSize(next as PageSizeOption);
    setPage(1); // required: changing page size resets to page 1
  }

  // PageToken: a page token can be a number or an ellipsis.
  type PageToken = number | "…";

  // buildPageTokens: returns a compact pagination list like: 1 … 5 6 7 … 28
  function buildPageTokens(current: number, totalPages: number): PageToken[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const tokens: PageToken[] = [];
    const windowStart = Math.max(2, current - 1);
    const windowEnd = Math.min(totalPages - 1, current + 1);

    tokens.push(1);

    if (windowStart > 2) tokens.push("…");

    for (let p = windowStart; p <= windowEnd; p++) tokens.push(p);

    if (windowEnd < totalPages - 1) tokens.push("…");

    tokens.push(totalPages);

    return tokens;
  }
  
  // handleHeaderSortClick: handles the sorting of the table (based on the column clicked).
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

  // // resetControls: returns filters/sort back to MVP defaults.
  // function resetControls() {
  //   setQuery("");
  //   setQueryInput("");
  //   setSortBy("updatedAt");
  //   setSortDir("desc");
  //   setPage(1);
  // }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setQueryInput("");
    setQuery("");
    setPage(1);
  }

  const getApplicationLabel = useCallback(
    (applicationId: string) => {
      if (selectedApplication?.id === applicationId) {
        return `${selectedApplication.position} @ ${selectedApplication.company}`;
      }
  
      const item = data?.items?.find((a) => a.id === applicationId);
      if (item) return `${item.position} @ ${item.company}`;
  
      return "this application";
    },
    [selectedApplication?.id, selectedApplication?.position, selectedApplication?.company, data?.items]
  );
  

  const addFitNotice = useCallback(
    (
      applicationId: string,
      kind: "success" | "error",
      opts?: { message?: string }
    ) => {
      setFitNotices((prev) => {
        if (prev.some((n) => n.applicationId === applicationId)) return prev;

        // Prefer stored label hint (for newly created apps before list refresh)
        const label =
          pendingFitLabelsRef.current[applicationId]?.trim() ||
          getApplicationLabel(applicationId);

        // Clear the hint once consumed
        delete pendingFitLabelsRef.current[applicationId];

        return [
          {
            id:            `${applicationId}-${Date.now()}`,
            applicationId,
            label,
            kind,
            message:       opts?.message,
            createdAt:     Date.now(),
          },
          ...prev,
        ];
      });
    },
    [getApplicationLabel]
  );
  

  function dismissFitNotice(noticeId: string) {
    setFitNotices((prev) => prev.filter((n) => n.id !== noticeId));
  }

  // Debounce query input to prevent excessive API calls
  useEffect(() => {
    const normalized = queryInput.trim();
  
    // If cleared, apply immediately (snappy UX)
    if (normalized.length === 0) {
      if (query !== "") {
        setQuery("");
        resetToFirstPage();
      }
      return;
    }
  
    const handle = window.setTimeout(() => {
      if (normalized !== query) {
        setQuery(normalized);
        resetToFirstPage();
      }
    }, DEBOUNCE_MS);
  
    return () => window.clearTimeout(handle);
  }, [queryInput, query]);
  

  // When a background FIT run completes, surface the result.
  // - If drawer is open for that app on success: refresh the drawer in place (no notice needed)
  // - If drawer is closed on success: show a notice so the user can navigate to it
  // - On error: always show a notice regardless of drawer state
  useEffect(() => {
    const prev    = prevFitRunStatusRef.current;
    const current = fitRuns.runsByAppId;

    for (const [applicationId, run] of Object.entries(current)) {
      const prevStatus       = prev[applicationId];
      const isViewingThatApp = detailsOpen && selectedApplication?.id === applicationId;

      if (prevStatus !== "success" && run.status === "success") {
        if (isViewingThatApp) {
          // Drawer is open for this app — refresh it in place so the fit
          // result appears without the user having to close and reopen.
          void handleApplicationChange(applicationId);
        } else {
          addFitNotice(applicationId, "success");
        }
        fitRuns.clearRun(applicationId);
      }

      if (prevStatus !== "error" && run.status === "error") {
        // Always show error notice — the drawer doesn't display run errors on its own.
        addFitNotice(applicationId, "error", { message: run.errorMessage ?? undefined });
        fitRuns.clearRun(applicationId);
      }

      prev[applicationId] = run.status;
    }

    for (const applicationId of Object.keys(prev)) {
      if (!current[applicationId]) delete prev[applicationId];
    }
  }, [fitRuns.runsByAppId, fitRuns, detailsOpen, selectedApplication?.id, addFitNotice, handleApplicationChange]);

  return (
    <div className="space-y-6">     
    
      {/* Global fit-run notices — success and error */}
      {fitNotices.length ? (
        <Portal>
          <div className="fixed bottom-4 right-4 z-[9999] w-[360px] space-y-2">
            {fitNotices.map((n) => (
              <div
                key={n.id}
                className="pointer-events-auto rounded-lg border bg-background shadow-lg overflow-hidden"
              >
                {/* Clickable body — opens drawer */}
                <div
                  role="button"
                  tabIndex={0}
                  className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={async () => {
                    dismissFitNotice(n.id);
                    await openDrawerForApplication(n.applicationId, {
                      autoOpenFit: n.kind === "success",
                    });
                  }}
                  onKeyDown={async (e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    dismissFitNotice(n.id);
                    await openDrawerForApplication(n.applicationId, {
                      autoOpenFit: n.kind === "success",
                    });
                  }}
                >
                  {n.kind === "success" ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {n.kind === "success"
                        ? "Compatibility report ready"
                        : "Compatibility check failed"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{n.label}</div>
                    {n.kind === "error" && n.message && (
                      <div className="text-xs text-destructive mt-0.5 line-clamp-2">{n.message}</div>
                    )}
                  </div>
                </div>

                {/* Dismiss strip — separate from the clickable body so it never accidentally triggers drawer open */}
                <div className="border-t px-3 py-1.5 flex justify-end bg-muted/20">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissFitNotice(n.id);
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Portal>
      ) : null}
      
      <section className="space-y-4">
               
        {/* Header section */}
        <Collapsible open={isAddApplicationOpen} onOpenChange={setIsAddApplicationOpen}>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold">Your Applications</h1>
            
            
            <div className="flex items-center justify-end gap-3">
            
            {/* Export button */}
            <ApplicationsExportButton
              filters={filters}
              query={query}
              sortBy={sortBy}
              sortDir={sortDir}
              visibleColumns={visibleColumns}
              total={total}
            />
              
              {/* Column controls button */}
              <Button variant="outline" onClick={() => setShowColumns((v) => !v)}>
                {showColumns ? "Hide Column Controls" : "Show Column Controls"}
              </Button>
              
              {/* Add application button */}
              <CollapsibleTrigger asChild>
                <Button variant="secondary" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add application
                  {isAddApplicationOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>            
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground">
              Manage all your job applications: search, filter, update, improve all in one place.
            </p>
          </div>

          {/* Add application section */}
          <CollapsibleContent className="mt-4">           
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Add application</CardTitle>
                <CardDescription>Create a new job application record.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add mode selector */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={addMode === "manual" ? "secondary" : "outline"}
                    onClick={() => setAddMode("manual")}
                  >
                    Manual
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant={addMode === "jd" ? "secondary" : "outline"}
                    onClick={() => setAddMode("jd")}
                  >
                    Via Job Description
                  </Button>
                </div>
                
                {addMode === "manual" ? (
                  <CreateApplicationForm
                    onCreated={() => {
                      setPage(1);
                      refreshList();
                    }}
                  />
                ) : (
                  <CreateApplicationFromJdForm
                    onCreated={(args) => {
                      setPage(1);
                      refreshList();

                      if (args.backgroundFit) {
                        // Store label hint before list refreshes so the
                        // notice can show the right label even if fit
                        // completes before the refetch lands.
                        pendingFitLabelsRef.current[args.applicationId] = args.label;

                        // Start background fit run — non-blocking
                        fitRuns.startFitRun({
                          applicationId:      args.applicationId,
                          overrideFile:       args.backgroundFit.overrideFile ?? null,
                          onApplicationChanged: handleApplicationChange,
                          onDocumentsChanged: (appId) => {
                            if (selectedApplication?.id === appId) {
                              void handleApplicationChange(appId);
                            }
                          },
                          onRefreshMe: () => void refreshMe(),
                        }).catch(() => {
                          // Error is captured in run state and surfaced via the notice effect
                        });
                      }
                    }}
                  />
                )}
              </CardContent>
            </Card> 
          </CollapsibleContent>
        </Collapsible>


        {/* Controls surface (filters + column visibility) */}
        <div className="space-y-4">

          {/* Columns control */}
          {showColumns ? (
            <ColumnsControl
              visibleColumns={visibleColumns}
              onChange={setVisibleColumns}
            />
          ) : null}

          {/* Filters control */}
          <ApplicationsFiltersPanel
            filters={filters}
            isOpen={isFiltersOpen}
            queryInput={queryInput}
            onQueryChange={(v) => {
              setQueryInput(v);
              setPage(1);
            }}
            onFiltersChange={patchFilters}
            onToggleOpen={setIsFiltersOpen}
            onReset={resetFilters}
          />

          {/* Error message */}
          {errorMessage ? (
            <div className="relative">
              <Alert variant="destructive" className="pr-10">
                {errorMessage}
              </Alert>

              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="absolute right-2 top-2 rounded-md px-2 py-1 opacity-70 hover:bg-black/5 hover:opacity-100"
                aria-label="Dismiss message"
                title="Dismiss"
              >
                ×
              </button>
            </div>
          ) : null}

        </div>

        {/* Applications table */}
        {isLoading && !data ? (
          // First load — no previous data to show
          <div className="rounded-md border bg-muted/20 p-12 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              Loading applications...
            </div>
          </div>
        ) : (
          <div className={cn("transition-opacity duration-150", isLoading && "opacity-50 pointer-events-none")}>
            <ApplicationsTable
              items={data?.items ?? []}
              sortBy={sortBy}
              sortDir={sortDir}
              isDefaultSort={isDefaultSort}
              onSort={handleHeaderSortClick}
              onChanged={() => setReloadKey((k) => k + 1)}
              visibleColumns={visibleColumns}
              onRowClick={async (row) => {
                setAutoOpenFitAppId(null);
                try {
                  setErrorMessage(null);
                  const fullApplication = await applicationsApi.get(row.id);
                  setSelectedApplication(fullApplication);
                  setDetailsOpen(true);
                } catch (err) {
                  if (err instanceof ApiError) setErrorMessage(err.message);
                  else setErrorMessage("Failed to load application details. Please try again.");
                }
              }}
            />
          </div>
        )}

        {/* Pagination surface */}
        <div className="w-full space-y-3 px-2 sm:px-3">
          {/* Top row: Rows per page selector (left) + Showing range (right) */}
          <div className="flex items-center justify-between">
            {/* Page size selector */}
            <div className="flex items-center gap-1">
              <Label htmlFor="pageSize" className="text-sm text-muted-foreground">
                Rows per page:
              </Label>

              <Select
                id="pageSize"
                className="h-9 w-[80px]"
                value={String(pageSize)}
                onChange={(e) => handlePageSizeChange(e.target.value)}
                disabled={isLoading}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </div>

            {/* Results info */}
            <div className="text-sm text-muted-foreground">
              {total === 0
                ? "No results"
                : `Showing ${startIndex}–${endIndex} of ${total} results`}
            </div>
          </div>

          {/* Bottom row: Pagination */}
          <div className="flex items-center justify-center gap-1">
            {/* Previous page button */}
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!data || page <= 1 || isLoading}
            >
              Prev
            </Button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {buildPageTokens(page, Math.ceil(total / pageSize)).map((t, idx) => {
                if (t === "…") {
                  return (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-2 text-muted-foreground select-none"
                    >
                      …
                    </span>
                  );
                }

                const isCurrent = t === page;

                return (
                  <Button
                    key={t}
                    variant={isCurrent ? "secondary" : "ghost"}
                    size="sm"
                    disabled={isCurrent || isLoading}
                    onClick={() => setPage(t)}
                    className="h-9 min-w-9 px-2"
                  >
                    {t}
                  </Button>
                );
              })}
            </div>

            {/* Next page button */}
            <Button
              variant="outline"
              onClick={() =>
                setPage((p) => (data ? Math.min(data.totalPages, p + 1) : p + 1))
              }
              disabled={!data || page >= data.totalPages || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      </section>

      
      {/* Application details drawer section */}
      <ApplicationDetailsDrawer
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) {
            setSelectedApplication(null);
            setAutoOpenFitAppId(null);
          }
        }}
        application={selectedApplication}
        onSave={handleSaveDetails} 
        onDocumentsChanged={handleDocumentsChanged}
        onConnectionsChanged={handleConnectionsChanged}
        onApplicationChanged={handleApplicationChange}
        autoOpenFitForAppId={autoOpenFitAppId}
        onAutoOpenFitConsumed={() => setAutoOpenFitAppId(null)}
        fitRuns={fitRuns}
      />
    </div>
  );
}

