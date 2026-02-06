"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { ApiError } from "@/lib/api/client";
import { applicationsApi } from "@/lib/api/applications";
import type { Application, ApplicationsListResponse, UpdateApplicationRequest, ApplicationStatus, ApplicationSortBy, ApplicationSortDir, JobType, WorkMode, ListApplicationsParams } from "@/types/api";
import { STATUS_FILTER_OPTIONS, JOB_TYPE_FILTER_OPTIONS, WORK_MODE_FILTER_OPTIONS, statusLabel, jobTypeLabel, workModeLabel } from "@/lib/applications/presentation";
import { ApplicationsTable } from "@/components/applications/ApplicationsTable";
import { CreateApplicationForm } from "@/components/applications/CreateApplicationForm";
import { CreateApplicationFromJdForm } from "@/components/applications/CreateApplicationFromJdForm";
import { ApplicationDetailsDrawer } from "@/components/applications/drawer/ApplicationDetailsDrawer";
import { ColumnsControl } from "@/components/applications/ColumnsControl";
import { APPLICATION_COLUMNS_STORAGE_KEY, DEFAULT_VISIBLE_APPLICATION_COLUMNS, normalizeVisibleColumns, type ApplicationColumnId} from "@/lib/applications/tableColumns";
import { useFitRuns } from "@/hooks/useFitRuns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import {  Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Portal } from "@/components/ui/portal";
import { ChevronDown, ChevronRight, Filter, Plus, Star, X, CheckCircle2 } from "lucide-react";


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
  const [status, setStatus] = useState<"ALL" | ApplicationStatus>("ALL");
  const [jobType, setJobType] = useState<"ALL" | JobType>("ALL");
  const [workMode, setWorkMode] = useState<"ALL" | WorkMode>("ALL");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [fitRange, setFitRange] = useState<[number, number]>([0, 100]);

  const activeFilterCount =
  (queryInput.trim() ? 1 : 0) +
  (status !== "ALL" ? 1 : 0) +
  (jobType !== "ALL" ? 1 : 0) +
  (workMode !== "ALL" ? 1 : 0) +
  (favoritesOnly ? 1 : 0) +
  (fitRange[0] !== 0 || fitRange[1] !== 100 ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  // Column visibility state
  const [showColumns, setShowColumns] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ApplicationColumnId[]>(DEFAULT_VISIBLE_APPLICATION_COLUMNS);

  // Application details drawer state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [autoOpenFitAppId, setAutoOpenFitAppId] = useState<string | null>(null);

  // Tracks in-flight FIT runs so they survive drawer close / navigation.
  const fitRuns = useFitRuns();

  // Global completion notifications (simple in-page “toast” style).
  type FitCompletionNotice = {
    id: string;
    applicationId: string;
    label: string;
    createdAt: number;
  };

  const [fitNotices, setFitNotices] = useState<FitCompletionNotice[]>([]);
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
          status,
          sortBy,
          sortDir,
          jobType,
          workMode,
          favoritesOnly,
          ...(fitRange[0] !== 0 || fitRange[1] !== 100
            ? { fitMin: fitRange[0], fitMax: fitRange[1] }
            : {}),
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
  }, [page, pageSize, query, status, sortBy, sortDir, jobType, workMode, favoritesOnly, fitRange, reloadKey]);

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

  // Handle application changes: refetch list and refresh drawer.
  async function handleApplicationChange(applicationId: string) {
    // Refetch list so the table + sorting (updatedAt) updates immediately
    setReloadKey((k) => k + 1);
  
    // Optional: refresh the drawer's application so fitScore/updatedAt matches too
    if (selectedApplication?.id === applicationId) {
      try {
        const latest = await applicationsApi.get(applicationId);
        setSelectedApplication(latest);
      } catch {
        // non-blocking
      }
    }
  }

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

  // resetControls: returns filters/sort back to MVP defaults.
  function resetControls() {
    setQuery("");
    setQueryInput("");
    setStatus("ALL");
    setSortBy("updatedAt");
    setSortDir("desc");
    setJobType("ALL");
    setWorkMode("ALL");
    setFavoritesOnly(false);
    setFitRange([0, 100]);
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
    (applicationId: string, labelOverride?: string) => {
      setFitNotices((prev) => {
        if (prev.some((n) => n.applicationId === applicationId)) return prev;
  
        const label = labelOverride?.trim() || getApplicationLabel(applicationId);
        return [
          {
            id: `${applicationId}-${Date.now()}`,
            applicationId,
            label,
            createdAt: Date.now(),
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
  
    // When a drawer-run FIT completes, show a global notification (unless the user is already viewing that application).
    useEffect(() => {
      const prev = prevFitRunStatusRef.current;
      const current = fitRuns.runsByAppId;
  
      for (const [applicationId, run] of Object.entries(current)) {
        const prevStatus = prev[applicationId];
  
        if (prevStatus !== "success" && run.status === "success") {
          const isViewingThatApp = detailsOpen && selectedApplication?.id === applicationId;
  
          if (!isViewingThatApp) {
            addFitNotice(applicationId);
          }
  
          // Once we’ve reacted to success, clear the run entry to avoid stale state.
          fitRuns.clearRun(applicationId);
        }
  
        prev[applicationId] = run.status;
      }
  
      // Clean up statuses for runs that no longer exist
      for (const applicationId of Object.keys(prev)) {
        if (!current[applicationId]) delete prev[applicationId];
      }
    }, [fitRuns.runsByAppId, fitRuns, detailsOpen, selectedApplication?.id, addFitNotice]);

  return (
    <div className="space-y-6">     
    
      {/* Global completion notifications */}
      {fitNotices.length ? (
        <Portal>
          <div className="fixed bottom-4 right-4 z-[9999] w-[360px] space-y-2">
            {fitNotices.map((n) => (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                className="pointer-events-auto rounded-lg border bg-background p-3 shadow-lg cursor-pointer hover:bg-muted/40"
                onClick={async () => {
                  dismissFitNotice(n.id);
                  await openDrawerForApplication(n.applicationId, { autoOpenFit: true });
                }}
                onKeyDown={async (e) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  e.preventDefault();
                  dismissFitNotice(n.id);
                  await openDrawerForApplication(n.applicationId, { autoOpenFit: true });
                }}
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5" />

                  <div className="flex-1">
                    <div className="text-sm font-medium">Compatibility report generated</div>
                    <div className="text-xs text-muted-foreground">{n.label}</div>
                  </div>

                  <button
                    type="button"
                    className="rounded-md p-1 opacity-70 hover:bg-black/5 hover:opacity-100"
                    title="Dismiss"
                    aria-label="Dismiss"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissFitNotice(n.id);
                    }}
                  >
                    <X className="h-4 w-4" />
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
                    onCreated={async (args) => {
                      setPage(1);
                      refreshList();

                      // If FIT completed during the create flow, show a global completion notice.
                      if (args?.applicationId && args.openFitReport) {
                        addFitNotice(args.applicationId, args.label);
                      }
                
                      // if (args?.applicationId && args.openDrawer) {
                      //   await openDrawerForApplication(args.applicationId, {
                      //     autoOpenFit: !!args.openFitReport,
                      //   });
                      // }
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
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <div className="rounded-lg border bg-background">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filters</span>
                    {hasActiveFilters ? (
                      <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs">
                        {activeFilterCount}
                      </span>
                    ) : null}
                  </div>

                  {isFiltersOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent className="border-t px-6 py-6">
                {/* Clear all filters button */}
                <div className="flex justify-end mb-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetControls}
                    disabled={!hasActiveFilters}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                </div>
          
                {/* Filters Grid */}
                <div className="grid gap-x-6 gap-y-6 md:grid-cols-12">
                  
                  {/* Search */}
                  <div className="space-y-2 md:col-span-5">
                    <Label htmlFor="q">Search</Label>
                    <Input
                      id="q"
                      value={queryInput}
                      onChange={(e) => setQueryInput(e.target.value)}
                      placeholder="Search company or position..."
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-2 md:col-span-5">
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

                  {/* Favorites */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="favoritesOnly">Favorites</Label>
                    <label className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm">
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
                      {favoritesOnly ? (
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" /> Favorites only
                        </span>
                      ) : (
                        <span> All applications</span>
                      )}
                    </label>
                  </div>

                  {/* Job type */}
                  <div className="space-y-2 md:col-span-4">
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

                  {/* Fit score */}
                  <div className="space-y-2 md:col-span-4">
                    <div className="flex items-center justify-between">
                      <Label>Fit score</Label>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {fitRange[0]}–{fitRange[1]}
                      </span>
                    </div>

                    <Slider
                      value={fitRange}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={(v) => {
                        // v is a number[] of length 2 for range sliders
                        setFitRange([v[0], v[1]]);
                        resetToFirstPage();
                      }}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Min</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={fitRange[0]}
                          onChange={(e) => {
                            const nextMin = Number(e.target.value);
                            const clamped = Number.isFinite(nextMin) ? Math.max(0, Math.min(100, nextMin)) : 0;
                            setFitRange([Math.min(clamped, fitRange[1]), fitRange[1]]);
                            resetToFirstPage();
                          }}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Max</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={fitRange[1]}
                          onChange={(e) => {
                            const nextMax = Number(e.target.value);
                            const clamped = Number.isFinite(nextMax) ? Math.max(0, Math.min(100, nextMax)) : 100;
                            setFitRange([fitRange[0], Math.max(clamped, fitRange[0])]);
                            resetToFirstPage();
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFitRange([0, 100]);
                          resetToFirstPage();
                        }}
                        disabled={fitRange[0] === 0 && fitRange[1] === 100}
                      >
                        Reset fit range
                      </Button>
                    </div>
                  </div>

                  {/* Work mode */}
                  <div className="space-y-2 md:col-span-4">
                    <Label htmlFor="workMode">Work Arrangement</Label>
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
                          {w === "ALL" ? "All arrangements" : workModeLabel(w)}
                        </option>
                      ))}
                    </Select>
                  </div>

                  

                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

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

