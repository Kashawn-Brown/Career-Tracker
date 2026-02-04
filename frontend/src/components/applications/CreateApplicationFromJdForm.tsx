"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { aiApi } from "@/lib/api/ai";
import { applicationsApi } from "@/lib/api/applications";
import { connectionsApi } from "@/lib/api/connections";
import type { ApplicationDraftResponse, ApplicationStatus, CreateApplicationRequest, JobType, WorkMode, DocumentKind, Connection, CreateConnectionRequest } from "@/types/api";
import { JOB_TYPE_OPTIONS, STATUS_OPTIONS, WORK_MODE_OPTIONS } from "@/lib/applications/presentation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { documentsApi } from "@/lib/api/documents";
import { ChevronDown, ChevronRight, Star, Trash2, Loader2, CheckCircle2, Circle } from "lucide-react";
import { ProAccessBanner } from "@/components/pro/ProAccessBanner";
import { RequestProDialog } from "@/components/pro/RequestProDialog";
import { useAuth } from "@/hooks/useAuth";
import { useConnectionAutocomplete } from "@/hooks/useConnectionAutocomplete";
import { applicationDocumentsApi } from "@/lib/api/application-documents";

// Arguments for the onCreated callback
type OnCreatedArgs = {
  applicationId: string;
  label?: string;
  openDrawer?: boolean;
  openFitReport?: boolean;
};



export function CreateApplicationFromJdForm({ onCreated }: { onCreated: (args?: OnCreatedArgs) => void }) {
  // Job description input + draft
  const [jdText, setJdText] = useState("");
  const [draft, setDraft] = useState<ApplicationDraftResponse | null>(null);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  type SubmitStepKey =
    | "CREATE_APPLICATION"
    | "UPLOAD_OVERRIDE"
    | "RUN_COMPATIBILITY"
    | "UPLOAD_DOCUMENTS"
    | "ATTACH_CONNECTIONS"
    | "FINALIZE";

  type SubmitStep = { key: SubmitStepKey; label: string };

  /**
   * submitProgress:
   * - steps: the plan (dynamic, based on what the user selected)
   * - activeIndex: which step we’re currently on
   */
  const [submitProgress, setSubmitProgress] = useState<{
    steps: SubmitStep[];
    activeIndex: number;
    hint?: string;
  } | null>(null);


  const [showSummary, setShowSummary] = useState(false);
  
  // Editable fields (prefilled after generate)
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");

  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>("WISHLIST");

  const [jobType, setJobType] = useState<JobType>("UNKNOWN");
  const [jobTypeDetails, setJobTypeDetails] = useState("");

  const [workMode, setWorkMode] = useState<WorkMode>("UNKNOWN");
  const [workModeDetails, setWorkModeDetails] = useState("");

  const [location, setLocation] = useState("");
  const [locationDetails, setLocationDetails] = useState("");

  const [salaryText, setSalaryText] = useState("");
  const [salaryDetails, setSalaryDetails] = useState("");

  const [jobLink, setJobLink] = useState("");
  const [tagsText, setTagsText] = useState("");

  const [notes, setNotes] = useState("");

  const [isFavorite, setIsFavorite] = useState(false);

  // "More" section (attachments + connections to attach on create)
  const [showMore, setShowMore] = useState(false);

  // Run compatibility after create (optional)
  const [runFitOnCreate, setRunFitOnCreate] = useState(false);
  const [isRunFitDialogOpen, setIsRunFitDialogOpen] = useState(false);

  // Fit source selection (default = Base Resume)
  const [fitUseOverride, setFitUseOverride] = useState(false);
  const [fitOverrideFile, setFitOverrideFile] = useState<File | null>(null);


  // Document types
  type UploadableDocKind = Exclude<DocumentKind, "BASE_RESUME">;
  type StagedDocument = { id: string; kind: UploadableDocKind; file: File };

  const DOC_KIND_OPTIONS: Array<{ value: UploadableDocKind; label: string }> = [
    { value: "RESUME", label: "Resume" },
    { value: "COVER_LETTER", label: "Cover Letter" },
    { value: "OTHER", label: "Other" },
  ];

  // Attachment draft row
  const [docKind, setDocKind] = useState<UploadableDocKind>("OTHER");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<StagedDocument[]>([]);

  // Connections to attach
  const [connectionQuery, setConnectionQuery] = useState("");
  const [selectedConnections, setSelectedConnections] = useState<Connection[]>([]);

  // ---- Create new connection (from this flow) ----
type NewConnectionDraft = {
  name: string;
  company: string;
  title: string;
  email: string;
  linkedInUrl: string;
};

function emptyNewConnectionDraft(name = ""): NewConnectionDraft {
  return { name, company: "", title: "", email: "", linkedInUrl: "" };
}

const [isCreateConnOpen, setIsCreateConnOpen] = useState(false);
const [newConnDraft, setNewConnDraft] = useState<NewConnectionDraft>(emptyNewConnectionDraft());
const [isCreateConnSaving, setIsCreateConnSaving] = useState(false);
const [createConnError, setCreateConnError] = useState<string | null>(null);

function openCreateConn() {
  setCreateConnError(null);
  setNewConnDraft(emptyNewConnectionDraft(connectionQuery.trim()));
  setIsCreateConnOpen(true);
}

function closeCreateConn() {
  setIsCreateConnOpen(false);
  setCreateConnError(null);
  setNewConnDraft(emptyNewConnectionDraft());
}

async function createConnAndSelect() {
  const name = newConnDraft.name.trim();
  if (!name) {
    setCreateConnError("Name is required.");
    return;
  }

  setIsCreateConnSaving(true);
  setCreateConnError(null);

  try {
    const payload: CreateConnectionRequest = { name };

    const company = newConnDraft.company.trim();
    if (company) payload.company = company;

    const title = newConnDraft.title.trim();
    if (title) payload.title = title;

    const email = newConnDraft.email.trim();
    if (email) payload.email = email;

    const linkedInUrl = newConnDraft.linkedInUrl.trim();
    if (linkedInUrl) payload.linkedInUrl = linkedInUrl;

    const created = await connectionsApi.createConnection(payload);

    // Immediately select it for this application-create flow
    addConnection(created.connection);

    closeCreateConn();
  } catch (err) {
    if (err instanceof ApiError) setCreateConnError(err.message);
    else setCreateConnError("Failed to create connection.");
  } finally {
    setIsCreateConnSaving(false);
  }
}

  const selectedConnectionIds = useMemo(
    () => new Set(selectedConnections.map((c) => c.id)),
    [selectedConnections]
  );

  const { items: connectionSuggestions, isLoading: isConnectionSuggestLoading } =
    useConnectionAutocomplete(connectionQuery, showMore);

  function addDocument() {
    if (!docFile) return;

    setDocuments((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, kind: docKind, file: docFile },
    ]);

    // reset row for next add
    setDocKind("OTHER");
    setDocFile(null);
  }

  function removeDocument(id: string) {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }

  function addConnection(c: Connection) {
    if (selectedConnectionIds.has(c.id)) return;
    setSelectedConnections((prev) => [...prev, c]);
    setConnectionQuery("");
  }

  function removeConnection(id: string) {
    setSelectedConnections((prev) => prev.filter((c) => c.id !== id));
  }


  // Pro access state
  const { user, aiProRequest, refreshMe } = useAuth();
  const aiProEnabled = !!user?.aiProEnabled;
  const aiFreeUsesUsed = user?.aiFreeUsesUsed ?? 0;
  // const isAiLocked = !!user && !aiProEnabled && aiFreeUsesUsed >= 5;

  const aiFreeRemaining = Math.max(0, 5 - aiFreeUsesUsed);
  const canRunFit =
    aiProEnabled ||
    aiFreeRemaining > 0;


  const [isProDialogOpen, setIsProDialogOpen] = useState(false);

  function toOptionalTrimmed(value: string) {
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }

  const canGenerate = jdText.trim().length > 0 && !isGenerating && !isSubmitting;

  const [baseResumeExists, setBaseResumeExists] = useState(false);

  useEffect(() => {
    if (!isRunFitDialogOpen) return;
    if (!user?.id) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await documentsApi.getBaseResume();
        if (cancelled) return;
        setBaseResumeExists(!!res.baseResume);
      } catch {
        if (cancelled) return;
        setBaseResumeExists(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isRunFitDialogOpen, user?.id]);


  

  // Reset to initial state
  function resetToInitial() {
    setErrorMessage(null);
  
    setJdText("");
    setDraft(null);
  
    setCompany("");
    setPosition("");
    setApplicationStatus("WISHLIST");
  
    setJobType("UNKNOWN");
    setJobTypeDetails("");
  
    setWorkMode("UNKNOWN");
    setWorkModeDetails("");
  
    setLocation("");
    setLocationDetails("");
  
    setSalaryText("");
    setSalaryDetails("");

    setJobLink("");
    setTagsText("");
  
    setNotes("");

    setIsFavorite(false);
    setShowSummary(false);

    setShowMore(false);

    setDocKind("OTHER");
    setDocFile(null);
    setDocuments([]);

    setConnectionQuery("");
    setSelectedConnections([]);

    setRunFitOnCreate(false);
    setIsRunFitDialogOpen(false);

    setFitUseOverride(false);
    setFitOverrideFile(null);

    setIsCreateConnOpen(false);
    setCreateConnError(null);
    setIsCreateConnSaving(false);
    setNewConnDraft(emptyNewConnectionDraft());


  }
  
  // Reset to initial state
  function handleReset() {
    resetToInitial();
  }
  

  // Generate draft from job description
  async function handleGenerate() {
    setErrorMessage(null);

    const text = jdText.trim();
    if (!text) {
      setErrorMessage("Paste a job description first.");
      return;
    }

    try {
      setIsGenerating(true);

      const res = await aiApi.applicationFromJd(text);
      setDraft(res);

      // Refresh user so credits/pro state updates immediately after successful AI use.
      void refreshMe();

      // Prefill editable fields
      setCompany(res.extracted.company ?? "");
      setPosition(res.extracted.position ?? "");

      setLocation(res.extracted.location ?? "");
      setLocationDetails(res.extracted.locationDetails ?? "");

      setWorkMode(res.extracted.workMode ?? "UNKNOWN");
      setWorkModeDetails(res.extracted.workModeDetails ?? "");

      setJobType(res.extracted.jobType ?? "UNKNOWN");
      setJobTypeDetails(res.extracted.jobTypeDetails ?? "");

      setSalaryText(res.extracted.salaryText ?? "");
      setSalaryDetails(res.extracted.salaryDetails ?? "");

      setJobLink(res.extracted.jobLink ?? "");
      setTagsText(res.extracted.tagsText ?? "");

      // Notes: extracted.notes -> textarea (user can edit)
      setNotes(res.extracted.notes ? res.extracted.notes.map((s) => `- ${s}`).join("\n") : "");

      // Keep status default as Interested
      setApplicationStatus("WISHLIST");
    } catch (err) {
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to generate draft from job description.");
    } finally {
      setIsGenerating(false);
    }
  }

  // Build the steps for the submit progress
  function buildSubmitSteps(args: {
    runFit: boolean;
    uploadOverride: boolean;
    stagedDocumentsCount: number;
    stagedConnectionsCount: number;
  }) {
    const steps: { key: SubmitStepKey; label: string }[] = [
      { key: "CREATE_APPLICATION", label: "Creating application" },
    ];
  
    if (args.runFit && args.uploadOverride) {
      steps.push({ key: "UPLOAD_OVERRIDE", label: "Uploading override resume" });
    }
  
    if (args.runFit) {
      steps.push({ key: "RUN_COMPATIBILITY", label: "Running compatibility (FIT)" });
    }
  
    if (args.stagedDocumentsCount > 0) {
      steps.push({ key: "UPLOAD_DOCUMENTS", label: "Uploading staged documents" });
    }
  
    if (args.stagedConnectionsCount > 0) {
      steps.push({ key: "ATTACH_CONNECTIONS", label: "Attaching staged connections" });
    }
  
    steps.push({ key: "FINALIZE", label: "Finalizing" });
  
    return steps;
  }
  
  // Start the submit progress
  function startSubmitProgress(steps: { key: SubmitStepKey; label: string }[]) {
    setSubmitProgress({
      steps,
      activeIndex: 0,
      hint: "Please keep this tab open while we finish the workflow.",
    });
  }
  
  // Go to a specific step
  function goToStep(stepKey: SubmitStepKey, hint?: string) {
    setSubmitProgress((prev) => {
      if (!prev) return prev;
      const idx = prev.steps.findIndex((s) => s.key === stepKey);
      if (idx === -1) return prev;
      return { ...prev, activeIndex: idx, hint: hint ?? prev.hint };
    });
  }
  
  // End the submit progress
  function endSubmitProgress() {
    setSubmitProgress(null);
  }

  
  // Create application after draft (possibly run compatibility)
  async function createApplicationAfterDraft(opts: { runFit: boolean }) {
    setErrorMessage(null);
  
    // Snapshot staged “More” items so reset doesn’t break async work.
    const stagedDocuments = [...documents];
    const stagedConnections = [...selectedConnections];
  
    // Snapshot fit inputs too (dialog state)
    const stagedFitUseOverride = fitUseOverride;
    const stagedFitOverrideFile = fitOverrideFile;
  
    if (!company.trim() || !position.trim()) {
      setErrorMessage("Company and position are required.");
      return;
    }
  
    // If running fit, validate requirements up front.
    if (opts.runFit) {
      if (!canRunFit) {
        setErrorMessage("No free AI credits remaining. Request Pro to run compatibility.");
        return;
      }
  
      if (stagedFitUseOverride && !stagedFitOverrideFile) {
        setErrorMessage("Select a file for compatibility (or turn off override).");
        return;
      }
  
      if (!stagedFitUseOverride && !baseResumeExists) {
        setErrorMessage("Upload a Base Resume in Profile (or use an override file).");
        return;
      }
    }
  
    const payload: CreateApplicationRequest = {
      company: company.trim(),
      position: position.trim(),
      status: applicationStatus,
      description: jdText.trim(),
      notes: toOptionalTrimmed(notes),
  
      location: toOptionalTrimmed(location),
      locationDetails: toOptionalTrimmed(locationDetails),
  
      jobType: jobType === "UNKNOWN" ? undefined : jobType,
      jobTypeDetails: toOptionalTrimmed(jobTypeDetails),
  
      workMode: workMode === "UNKNOWN" ? undefined : workMode,
      workModeDetails: toOptionalTrimmed(workModeDetails),
  
      salaryText: toOptionalTrimmed(salaryText),
      salaryDetails: toOptionalTrimmed(salaryDetails),

      jobLink: toOptionalTrimmed(jobLink),
      tagsText: toOptionalTrimmed(tagsText),
  
      isFavorite,
  
      dateApplied: applicationStatus === "APPLIED" ? new Date().toISOString() : undefined,
    };
  
    try {
      setIsSubmitting(true);

      // Build the steps for the submit progress
      const steps = buildSubmitSteps({
        runFit: opts.runFit,
        uploadOverride: opts.runFit && stagedFitUseOverride && !!stagedFitOverrideFile,
        stagedDocumentsCount: stagedDocuments.length,
        stagedConnectionsCount: stagedConnections.length,
      });
    
      startSubmitProgress(steps);
    
      goToStep("CREATE_APPLICATION");
  
      const created = await applicationsApi.create(payload);
  
      let fitFailed = false;
      let fitSucceeded = false;
  
      if (opts.runFit) {
        try {
          let sourceDocumentId: number | undefined = undefined;
  
          if (stagedFitUseOverride && stagedFitOverrideFile) {
            // Go to the upload override step
            goToStep("UPLOAD_OVERRIDE", "Uploading your selected override file for this run.");

            // Upload the override file
            const uploadRes = await applicationDocumentsApi.upload({
              applicationId: created.id,
              kind: "CAREER_HISTORY",
              file: stagedFitOverrideFile,
            });
  
            sourceDocumentId = Number(uploadRes.document.id);
          }
  
          goToStep("RUN_COMPATIBILITY", "This can take a few seconds — generating your compatibility report.");
          await applicationsApi.generateAiArtifact(created.id, {
            kind: "FIT_V1",
            sourceDocumentId,
          });

          fitSucceeded = true;
  
          // Credits + table refresh
          void refreshMe();
          onCreated();
        } catch {
          fitFailed = true;
        }
      }

      if (stagedDocuments.length) {
        goToStep("UPLOAD_DOCUMENTS", "Uploading your staged documents to the application.");
      }
  
      // Apply staged documents + connections after create (best-effort)
      const docResults = stagedDocuments.length
        ? await Promise.allSettled(
            stagedDocuments.map((d) =>
              applicationDocumentsApi.upload({
                applicationId: created.id,
                kind: d.kind,
                file: d.file,
              })
            )
          )
        : [];


      if (stagedConnections.length) {
        goToStep("ATTACH_CONNECTIONS", "Attaching your staged connections to the application.");
      }
      const connResults = stagedConnections.length
        ? await Promise.allSettled(
            stagedConnections.map((c) =>
              applicationsApi.attachConnectionToApplication(created.id, c.id)
            )
          )
        : [];
  
      const failedDocs = docResults.filter((r) => r.status === "rejected").length;
      const failedConns = connResults.filter((r) => r.status === "rejected").length;
  
      goToStep("FINALIZE", "Finalizing the application creation.");

      // Reset the form and refresh the list.
      resetToInitial();
      onCreated();

      if (opts.runFit && fitSucceeded) {
        onCreated({
          applicationId: created.id,
          label: `${position} @ ${company}`,
          openDrawer: true,
          openFitReport: true,
        });
      }
  
      if (fitFailed || failedDocs || failedConns) {
        const parts: string[] = [];
        if (fitFailed) parts.push("compatibility check failed");
        if (failedDocs) parts.push(`${failedDocs} document(s) failed to attach`);
        if (failedConns) parts.push(`${failedConns} connection(s) failed to attach`);
  
        setErrorMessage(`Application created, but ${parts.join(" and ")}.`);
      }
    } catch (err) {
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to create application.");
    } finally {
      setIsSubmitting(false);
      endSubmitProgress();
    }
  }

  // Create application from draft
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
  
    if (runFitOnCreate) {
      setIsRunFitDialogOpen(true);
      return;
    }
  
    await createApplicationAfterDraft({ runFit: false });
  }

  useEffect(() => {
    if (!isSubmitting) return;
  
    const prev = window.onbeforeunload;
  
    window.onbeforeunload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      return ""; // triggers the native confirmation prompt in supported browsers
    };
  
    return () => {
      window.onbeforeunload = prev;
    };
  }, [isSubmitting]);
  
 

  return (
    <div className="space-y-4">
      {isSubmitting ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <Loader2 className="mt-1 h-5 w-5 animate-spin" />
              <div className="flex-1">
                <div className="text-base font-medium">
                  {submitProgress?.steps?.[submitProgress.activeIndex]?.label ?? "Working..."}
                </div>

                {submitProgress?.steps?.length ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Step {submitProgress.activeIndex + 1} of {submitProgress.steps.length}
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Please keep this tab open.
                  </div>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-2 w-full rounded bg-muted">
              <div
                className="h-2 rounded bg-primary transition-all"
                style={{
                  width: submitProgress?.steps?.length
                    ? `${Math.round(((submitProgress.activeIndex + 1) / submitProgress.steps.length) * 100)}%`
                    : "30%",
                }}
              />
            </div>

            {/* Steps list */}
            {submitProgress?.steps?.length ? (
              <div className="mt-4 space-y-2 text-sm">
                {submitProgress.steps.map((s, idx) => {
                  const isDone = idx < submitProgress.activeIndex;
                  const isActive = idx === submitProgress.activeIndex;

                  return (
                    <div key={s.key} className="flex items-center gap-2">
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : isActive ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Circle className="h-4 w-4 opacity-60" />
                      )}

                      <span className={isActive ? "font-medium" : "text-muted-foreground"}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* Hint (optional, short) */}
            {submitProgress?.hint ? (
              <div className="mt-4 text-xs text-muted-foreground">{submitProgress.hint}</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {errorMessage ? <div className="text-sm text-red-600">{errorMessage}</div> : null}


      {/* Pro/credits state + request modal */}
      <ProAccessBanner
        aiProEnabled={aiProEnabled}
        aiFreeUsesUsed={aiFreeUsesUsed}
        aiProRequest={aiProRequest}
        onRequestPro={() => setIsProDialogOpen(true)}
      />

      <RequestProDialog
        open={isProDialogOpen}
        onOpenChange={setIsProDialogOpen}
        onRequested={() => refreshMe()}
      />


      <div className="space-y-2">
        <Label htmlFor="jd">Job description</Label>
        <Textarea
          id="jd"
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          // readOnly={draft !== null}
          disabled={draft !== null}
          placeholder={`Paste the full job description here...  We'll extract the relevant information for you!`}
          className="min-h-[140px]"
        />
        <div className="flex justify-end mt-4 gap-2">
          {draft ? (
            <Button type="button" variant="outline" onClick={handleReset} disabled={isGenerating || isSubmitting}>
              Reset
            </Button>
          ) : null}

          <Button type="button" onClick={handleGenerate} disabled={!canGenerate || draft !== null}>
            {isGenerating ? "Generating..." : "Generate draft"}
          </Button>
        </div>
      </div>

      {/* After draft exists, show editable form + AI info */}
      {draft ? (
        <form className="space-y-3" onSubmit={handleCreate}>
          {/* Warnings */}
          {draft.ai.warnings?.length ? (
            <Alert variant="warning">
              <div className="font-medium mb-1">Warnings</div>
              <ul className="list-disc pl-5 space-y-1">
                {draft.ai.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          {/* Summary (optional/collapsible) */}
          <Collapsible open={showSummary} onOpenChange={setShowSummary}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-between bg-gray-400 text-white hover:bg-gray-400">
                <span className="font-medium">Summary</span>
                {showSummary ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <Alert variant="muted" className="font-medium">{draft.ai.jdSummary}</Alert>
            </CollapsibleContent>
          </Collapsible>

          {/* Editable extracted fields */}
          <div className="grid gap-x-6 gap-y-6 md:grid-cols-12">
            <div className="space-y-2 md:col-span-5">
              <Label htmlFor="company">Company</Label>
              <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-5">
              <Label htmlFor="position">Position</Label>
              <Input id="position" value={position} onChange={(e) => setPosition(e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="isFavorite">Favorite</Label>
              <label className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm">
                <input
                  id="isFavorite"
                  type="checkbox"
                  checked={isFavorite}
                  onChange={(e) => {
                    setIsFavorite(e.target.checked);
                  }}
                  className="h-4 w-4"
                />
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" /> Favorite
                </span>
              </label>
            </div>

            <div className="space-y-2 md:col-span-4">
              <Label htmlFor="jobType">Job type</Label>
              <Select id="jobType" value={jobType} onChange={(e) => setJobType(e.target.value as JobType)}>
                {JOB_TYPE_OPTIONS.map((j) => (
                  <option key={j.value} value={j.value}>
                    {j.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2 md:col-span-4">
              <Label htmlFor="workMode">Work Arrangement</Label>
              <Select id="workMode" value={workMode} onChange={(e) => setWorkMode(e.target.value as WorkMode)}>
                {WORK_MODE_OPTIONS.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2 md:col-span-4">
              <Label htmlFor="status">Application Status</Label>
              <Select
                id="status"
                value={applicationStatus}
                onChange={(e) => setApplicationStatus(e.target.value as ApplicationStatus)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2 md:col-span-6">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-6">
              <Label htmlFor="salaryText">Salary</Label>
              <Input id="salaryText" value={salaryText} onChange={(e) => setSalaryText(e.target.value)} />
            </div>
            

            {/* Extra Details */}
            <div className="text-sm font-medium block mt-5 md:col-span-12">
              Extra Details:
            </div>
            
            <div className="space-y-2 md:col-span-6">
              <Label htmlFor="jobLink">Job Link</Label>
              <Input id="jobLink" value={jobLink} onChange={(e) => setJobLink(e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-6">
              <Label htmlFor="tagsText">Tags</Label>
              <Input id="tagsText" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="jobTypeDetails">Job Type Details</Label>
              <Input 
              id="jobTypeDetails" 
              value={jobTypeDetails} 
              onChange={(e) => setJobTypeDetails(e.target.value)} 
              />
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="workModeDetails">Work Arrangement Details</Label>
              <Input
                id="workModeDetails"
                value={workModeDetails}
                onChange={(e) => setWorkModeDetails(e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="locationDetails">Location Details</Label>
              <Input
                id="locationDetails"
                value={locationDetails}
                onChange={(e) => setLocationDetails(e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="salaryDetails">Salary Details</Label>
              <Input
                id="salaryDetails"
                value={salaryDetails}
                onChange={(e) => setSalaryDetails(e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-12">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[120px]"
              />

              <Button
                type="button"
                variant="link"
                className="px-0"
                onClick={() => setShowMore((v) => !v)}
              >
                {showMore ? "Hide extra fields" : "More fields"}
              </Button>

              {showMore ? (
                <div className="grid gap-x-6 gap-y-6 md:grid-cols-14">
                  {/* Documents: left = add controls */}
                  <div className="space-y-3 rounded-md border p-3 md:col-span-4">
                    <div className="text-sm font-medium">Documents</div>
                
                    <div className="space-y-2">
                      <Label htmlFor="docKind">Document type</Label>
                      <Select
                        id="docKind"
                        value={docKind}
                        onChange={(e) => setDocKind(e.target.value as UploadableDocKind)}
                      >
                        {DOC_KIND_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                
                    <div className="space-y-2">
                      <Label htmlFor="docFile">File</Label>
                      <Input
                        id="docFile"
                        type="file"
                        accept=".pdf,.txt,application/pdf,text/plain"
                        onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                      />
                      {docFile ? (
                        <div className="text-xs text-muted-foreground truncate">Selected: {docFile.name}</div>
                      ) : null}
                    </div>
                
                    <Button type="button" onClick={addDocument} disabled={!docFile} className="w-full">
                      Add document
                    </Button>
                  </div>
                
                  {/* Documents: right = staged list */}
                  <div className="space-y-3 rounded-md border p-3 md:col-span-3">
                    <div className="text-sm font-medium">Staged documents</div>
                
                    {documents.length ? (
                      <div className="space-y-2">
                        {documents.map((d) => (
                          <div key={d.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{d.file.name}</div>
                              <div className="text-xs text-muted-foreground">{d.kind}</div>
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeDocument(d.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">No documents staged.</div>
                    )}
                  </div>
                
                  {/* Connections: left = search + suggestions */}
                  <div className="space-y-3 rounded-md border p-3 md:col-span-4">
                    <div className="text-sm font-medium">Connections</div>
                
                    <div className="space-y-2">
                      <Label htmlFor="connectionSearch">Search</Label>
                      <Input
                        id="connectionSearch"
                        value={connectionQuery}
                        onChange={(e) => setConnectionQuery(e.target.value)}
                        placeholder="Type a name..."
                      />
                      {isConnectionSuggestLoading ? (
                        <div className="text-xs text-muted-foreground">Searching...</div>
                      ) : null}
                    </div>
                    
                    <div className="flex justify-end">
                      <Button type="button" variant="outline" size="sm" onClick={openCreateConn}>
                        Create new
                      </Button>
                    </div>
                
                    {connectionSuggestions.length ? (
                      <div className="rounded-md border p-2 space-y-1">
                        {connectionSuggestions.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full text-left text-sm px-2 py-1 rounded hover:bg-muted disabled:opacity-50"
                            onClick={() => addConnection(c)}
                            disabled={selectedConnectionIds.has(c.id)}
                          >
                            <div className="font-medium">{c.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {c.company ?? ""}{c.title ? ` • ${c.title}` : ""}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">No results.</div>
                    )}
                  </div>
                
                  {/* Connections: right = selected list */}
                  <div className="space-y-3 rounded-md border p-3 md:col-span-3">
                    <div className="text-sm font-medium">Selected connections</div>
                
                    {selectedConnections.length ? (
                      <div className="space-y-2">
                        {selectedConnections.map((c) => (
                          <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{c.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {c.company ?? ""}{c.title ? ` • ${c.title}` : ""}
                              </div>
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeConnection(c.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">No connections selected.</div>
                    )}
                  </div>
                </div>
              
              ) : null}
            </div>
          </div>          

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={runFitOnCreate}
                onChange={(e) => setRunFitOnCreate(e.target.checked)}
                disabled={isSubmitting}
                className="h-4 w-4"
              />
              Run compatibility after create
            </label>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create application"}
            </Button>
          </div>

          <Dialog open={isRunFitDialogOpen} onOpenChange={setIsRunFitDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-2xl font-medium">Create and Run Compatibility?</DialogTitle>
                <DialogDescription>
                  We’ll create the application and run a compatibility check using your Base Resume (or an override file).
                  {!aiProEnabled ? (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Running compatibility uses <span className="font-medium text-foreground">1</span> AI credit.
                      You have <span className="font-medium text-foreground">{aiFreeRemaining}</span> free uses left.
                    </div>
                  ) : null}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 mt-8">
                <div className="text-xs text-muted-foreground mb-1">
                  Job Description: Ready
                </div>
                <div className="text-xs text-muted-foreground">
                  Base Resume:{" "}
                  <span className={baseResumeExists ? "text-foreground" : "text-destructive"}>
                    {baseResumeExists ? "Saved" : "Not uploaded"}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-8">
                  <input
                    id="fit-override"
                    type="checkbox"
                    checked={fitUseOverride}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setFitUseOverride(next);
                      if (!next) setFitOverrideFile(null);
                    }}
                    className="h-4 w-4"
                  />
                  <label htmlFor="fit-override" className="text-sm">
                    Use a different file for compatibility
                  </label>
                </div>

                {fitUseOverride ? (
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept=".pdf,.txt,application/pdf,text/plain"
                      onChange={(e) => setFitOverrideFile(e.target.files?.[0] ?? null)}
                    />
                    {fitOverrideFile ? (
                      <div className="text-xs text-muted-foreground truncate">
                        Selected: {fitOverrideFile.name}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">Default: Base Resume.</div>
                )}
              </div>

              <DialogFooter className="gap-2 mt-10">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSubmitting}>
                    Cancel
                  </Button>
                </DialogClose>

                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => {
                    setIsRunFitDialogOpen(false);
                    void createApplicationAfterDraft({ runFit: false });
                  }}
                >
                  Create only
                </Button>

                <Button
                  type="button"
                  disabled={
                    isSubmitting ||
                    !canRunFit ||
                    (fitUseOverride ? !fitOverrideFile : !baseResumeExists)
                  }
                  onClick={() => {
                    setIsRunFitDialogOpen(false);
                    void createApplicationAfterDraft({ runFit: true });
                  }}
                >
                  Create + run compatibility
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateConnOpen} onOpenChange={(open) => (open ? setIsCreateConnOpen(true) : closeCreateConn())}>
            <DialogContent className="sm:max-w-[640px]">
              <DialogHeader>
                <DialogTitle>Create connection</DialogTitle>
                <DialogDescription>Add a new person, then attach them to this application.</DialogDescription>
              </DialogHeader>

              {createConnError ? (
                <div className="rounded-md border px-3 py-2 text-sm text-destructive">{createConnError}</div>
              ) : null}

              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newConnDraft.name}
                    onChange={(e) => setNewConnDraft((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., John Doe"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                      value={newConnDraft.company}
                      onChange={(e) => setNewConnDraft((p) => ({ ...p, company: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={newConnDraft.title}
                      onChange={(e) => setNewConnDraft((p) => ({ ...p, title: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={newConnDraft.email}
                      onChange={(e) => setNewConnDraft((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>LinkedIn URL</Label>
                    <Input
                      value={newConnDraft.linkedInUrl}
                      onChange={(e) => setNewConnDraft((p) => ({ ...p, linkedInUrl: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-8">
                <Button type="button" variant="outline" onClick={closeCreateConn} disabled={isCreateConnSaving}>
                  Cancel
                </Button>
                <Button type="button" onClick={createConnAndSelect} disabled={isCreateConnSaving}>
                  {isCreateConnSaving ? "Creating..." : "Create & attach"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </form>
      ) : null}
    </div>
  );
}
