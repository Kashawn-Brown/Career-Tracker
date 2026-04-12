"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { aiApi } from "@/lib/api/ai";
import { applicationsApi } from "@/lib/api/applications";
import { connectionsApi } from "@/lib/api/connections";
import type { ApplicationDraftResponse, ApplicationStatus, CreateApplicationRequest, JobType, WorkMode, DocumentKind, Connection, CreateConnectionRequest } from "@/types/api";
import { JOB_TYPE_OPTIONS, STATUS_OPTIONS, WORK_MODE_OPTIONS } from "@/lib/applications/presentation";
import { Button } from "@/components/ui/button";
import { CreditCostNote, BlockedRunButton } from "@/components/tools/ToolEntitlementGate";
import { analyticsApi }   from "@/lib/api/analytics";
import type { UsageState } from "@/types/api";
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
} from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, Star, Trash2, Loader2, CheckCircle2, Circle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useConnectionAutocomplete } from "@/hooks/useConnectionAutocomplete";
import { applicationDocumentsApi } from "@/lib/api/application-documents";
import { documentsApi } from "@/lib/api/documents";
import { createPortal } from "react-dom";
import { hasProPlan, getEffectivePlan } from "@/lib/plans";
import { useBaseDocuments } from "@/hooks/useBaseDocuments";
import { useAiToolsOnCreate } from "@/hooks/useAiToolsOnCreate";
import { AiToolsAfterCreate } from "@/components/applications/AiToolsAfterCreate";


// ─── Callback contract ────────────────────────────────────────────────────────

/**
 * Called once immediately after the application record is created.
 * backgroundTools is included when the user opted into AI tool runs so the
 * page can start them through the existing useFitRuns/useDocumentToolRuns systems.
 * The resume override is uploaded once here and passed as sourceDocumentId to
 * avoid re-uploading the same file for each tool.
 */
export type OnCreatedArgs = {
  applicationId: string;
  label:         string;
  backgroundTools?: {
    fit:           boolean;
    interviewPrep: boolean;
    resumeAdvice:  boolean;
    coverLetter:   boolean;
    // Uploaded once after app creation — all tool runs reference this doc ID
    sourceDocumentId?: number;
    templateText?:     string;
  };
};


// ─── Component ────────────────────────────────────────────────────────────────

export function CreateApplicationFromJdForm({
  onCreated,
  initialSourceMode = "TEXT",
}: {
  onCreated: (args: OnCreatedArgs) => void;
  initialSourceMode?: "TEXT" | "LINK";
}) {
  // Source mode: driven by the tab selected in the parent (initialSourceMode).
  // Can still switch within the form if the user changes their mind mid-draft.
  const [sourceMode, setSourceMode] = useState<"TEXT" | "LINK">(initialSourceMode);
  const [jobPostingUrl, setJobPostingUrl] = useState("");

  // Job description input + draft
  const [jdText, setJdText] = useState("");
  const [draft, setDraft] = useState<ApplicationDraftResponse | null>(null);

  // Canonical JD text to store as application description.
  // For TEXT mode: the pasted JD. For LINK mode: the fetched+cleaned page text.
  // Always comes from res.source.canonicalJdText after a successful generate.
  const [sourceDescriptionText, setSourceDescriptionText] = useState("");

  // Generate progress — step label shown while isGenerating is true.
  // Advances on a timer to reflect what the backend is likely doing.
  const [generateStepLabel, setGenerateStepLabel] = useState<string | null>(null);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usageState,   setUsageState]   = useState<UsageState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Submit progress — covers only create-flow work (no fit steps)
  type SubmitStepKey =
    | "CREATE_APPLICATION"
    | "UPLOAD_DOCUMENTS"
    | "ATTACH_CONNECTIONS"
    | "FINALIZE";

  type SubmitStep = { key: SubmitStepKey; label: string };

  const [submitProgress, setSubmitProgress] = useState<{
    steps:       SubmitStep[];
    activeIndex: number;
    hint?:       string;
  } | null>(null);

  const [showSummary, setShowSummary] = useState(false);

  // Editable fields (prefilled after generate)
  const [company, setCompany]                   = useState("");
  const [position, setPosition]                 = useState("");
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>("WISHLIST");
  const [jobType, setJobType]                   = useState<JobType>("UNKNOWN");
  const [jobTypeDetails, setJobTypeDetails]     = useState("");
  const [workMode, setWorkMode]                 = useState<WorkMode>("UNKNOWN");
  const [workModeDetails, setWorkModeDetails]   = useState("");
  const [location, setLocation]                 = useState("");
  const [locationDetails, setLocationDetails]   = useState("");
  const [salaryText, setSalaryText]             = useState("");
  const [salaryDetails, setSalaryDetails]       = useState("");
  const [jobLink, setJobLink]                   = useState("");
  const [tagsText, setTagsText]                 = useState("");
  const [notes, setNotes]                       = useState("");
  const [isFavorite, setIsFavorite]             = useState(false);

  // "More" section (attachments + connections to attach on create)
  const [showMore, setShowMore] = useState(false);

  // ── AI tools after create ─────────────────────────────────────────────────
  const { enabled: aiEnabled, setEnabled: setAiEnabled, selections, updateSelections } = useAiToolsOnCreate();
  // Base resume/cover letter existence — drives defaults and validation
  const { baseResumeExists, baseCoverLetterExists } = useBaseDocuments();
  // Override resume for this run — uploaded once, shared across all selected tools
  const [overrideFile,   setOverrideFile]   = useState<File | null>(null);
  // Cover letter template — extracted to text client-side before submission
  const [templateFile,   setTemplateFile]   = useState<File | null>(null);
  const [templateText,   setTemplateText]   = useState("");
  // Validation dialog — shown when tools are enabled but no resume is available
  const [isResumeValidationOpen, setIsResumeValidationOpen] = useState(false);
  // "Also save as base resume" checkbox inside the validation dialog
  const [saveAsBaseResume, setSaveAsBaseResume] = useState(false);

  // Document types
  type UploadableDocKind = Exclude<DocumentKind, "BASE_RESUME">;
  type StagedDocument    = { id: string; kind: UploadableDocKind; file: File };

  const DOC_KIND_OPTIONS: Array<{ value: UploadableDocKind; label: string }> = [
    { value: "RESUME",       label: "Resume"       },
    { value: "COVER_LETTER", label: "Cover Letter" },
    { value: "OTHER",        label: "Other"        },
  ];

  const [docKind, setDocKind]         = useState<UploadableDocKind>("OTHER");
  const [docFile, setDocFile]         = useState<File | null>(null);
  const [documents, setDocuments]     = useState<StagedDocument[]>([]);

  // Connections to attach
  const [connectionQuery, setConnectionQuery]       = useState("");
  const [selectedConnections, setSelectedConnections] = useState<Connection[]>([]);

  // ── Create new connection (from this flow) ──────────────────────────────

  type NewConnectionDraft = {
    name: string; company: string; title: string; email: string; linkedInUrl: string;
  };

  function emptyNewConnectionDraft(name = ""): NewConnectionDraft {
    return { name, company: "", title: "", email: "", linkedInUrl: "" };
  }

  const [isCreateConnOpen, setIsCreateConnOpen]   = useState(false);
  const [newConnDraft, setNewConnDraft]           = useState<NewConnectionDraft>(emptyNewConnectionDraft());
  const [isCreateConnSaving, setIsCreateConnSaving] = useState(false);
  const [createConnError, setCreateConnError]     = useState<string | null>(null);

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
    if (!name) { setCreateConnError("Name is required."); return; }

    setIsCreateConnSaving(true);
    setCreateConnError(null);

    try {
      const payload: CreateConnectionRequest = { name };
      const company = newConnDraft.company.trim(); if (company) payload.company = company;
      const title   = newConnDraft.title.trim();   if (title)   payload.title   = title;
      const email   = newConnDraft.email.trim();   if (email)   payload.email   = email;
      const linkedInUrl = newConnDraft.linkedInUrl.trim(); if (linkedInUrl) payload.linkedInUrl = linkedInUrl;

      const created = await connectionsApi.createConnection(payload);
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
    setDocuments((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, kind: docKind, file: docFile }]);
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

  // ── Pro access state ──────────────────────────────────────────────────────

  const { user, refreshMe } = useAuth();

  // Fetch usage state for entitlement UI (cost note + blocked state)
  useEffect(() => {
    analyticsApi.getMyUsage().then(setUsageState).catch(() => null);
  }, []);

  const isBlocked = usageState?.isBlocked ?? false;
  const planLabel = usageState?.plan ?? (user ? getEffectivePlan(user) : "REGULAR");

  function toOptionalTrimmed(value: string) {
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }

  const canGenerate =
    (sourceMode === "TEXT" ? jdText.trim().length > 0 : jobPostingUrl.trim().length > 0) &&
    !isGenerating &&
    !isSubmitting;

  // Extract text from a cover letter template file client-side.
  // DOCX → mammoth browser build; everything else → FileReader plain text.
  async function handleTemplateFile(file: File | null) {
    setTemplateFile(file);
    setTemplateText("");
    if (!file) return;

    if (file.name.toLowerCase().endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const buffer  = await file.arrayBuffer();
      const result  = await mammoth.extractRawText({ arrayBuffer: buffer });
      setTemplateText(result.value ?? "");
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        setTemplateText(typeof e.target?.result === "string" ? e.target.result : "");
      };
      reader.readAsText(file);
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  function resetToInitial() {
    setErrorMessage(null);
    setSourceMode(initialSourceMode); setJobPostingUrl(""); setSourceDescriptionText("");
    setJdText(""); setDraft(null);
    setCompany(""); setPosition("");
    setApplicationStatus("WISHLIST");
    setJobType("UNKNOWN"); setJobTypeDetails("");
    setWorkMode("UNKNOWN"); setWorkModeDetails("");
    setLocation(""); setLocationDetails("");
    setSalaryText(""); setSalaryDetails("");
    setJobLink(""); setTagsText("");
    setNotes(""); setIsFavorite(false);
    setShowSummary(false); setShowMore(false);
    setDocKind("OTHER"); setDocFile(null); setDocuments([]);
    setConnectionQuery(""); setSelectedConnections([]);
    setOverrideFile(null); setTemplateFile(null); setTemplateText("");
    setSaveAsBaseResume(false);
    setIsCreateConnOpen(false); setCreateConnError(null);
    setIsCreateConnSaving(false); setNewConnDraft(emptyNewConnectionDraft());
  }

  function handleReset() { resetToInitial(); }

  // Advance the generate step label on a timer to reflect backend progress.
  // Link mode has 3 stages (connect → fetch → extract); text mode just shows "Extracting".
  useEffect(() => {
    if (!isGenerating) { setGenerateStepLabel(null); return; }

    if (sourceMode === "LINK") {
      setGenerateStepLabel("Connecting to job posting…");
      const t1 = setTimeout(() => setGenerateStepLabel("Fetching page content…"), 2500);
      const t2 = setTimeout(() => setGenerateStepLabel("Extracting job details…"), 6000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      setGenerateStepLabel("Extracting job details…");
    }
  }, [isGenerating, sourceMode]);

  // ── Generate draft ────────────────────────────────────────────────────────

  async function handleGenerate() {
    setErrorMessage(null);

    try {
      setIsGenerating(true);

      let res: ApplicationDraftResponse;

      if (sourceMode === "LINK") {
        const url = jobPostingUrl.trim();
        if (!url) { setErrorMessage("Enter a job posting URL first."); return; }
        res = await aiApi.applicationFromLink(url);
      } else {
        const text = jdText.trim();
        if (!text) { setErrorMessage("Paste a job description first."); return; }
        res = await aiApi.applicationFromJd(text);
      }

      setDraft(res);
      void refreshMe();

      // Store canonical JD text for the create payload — this is what gets
      // saved as the application description and used for future fit runs.
      setSourceDescriptionText(res.source.canonicalJdText);

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
      setNotes(res.extracted.notes ? res.extracted.notes.map((s) => `- ${s}`).join("\n") : "");
      setApplicationStatus("WISHLIST");
    } catch (err) {
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to generate draft. Check the URL or paste the job description manually.");
    } finally {
      setIsGenerating(false);
    }
  }

  // ── Submit progress helpers ───────────────────────────────────────────────

  function buildSubmitSteps(args: {
    stagedDocumentsCount:  number;
    stagedConnectionsCount: number;
  }) {
    const steps: SubmitStep[] = [
      { key: "CREATE_APPLICATION", label: "Creating application" },
    ];
    if (args.stagedDocumentsCount > 0)
      steps.push({ key: "UPLOAD_DOCUMENTS", label: "Uploading staged documents" });
    if (args.stagedConnectionsCount > 0)
      steps.push({ key: "ATTACH_CONNECTIONS", label: "Attaching staged connections" });
    steps.push({ key: "FINALIZE", label: "Finalizing" });
    return steps;
  }

  function startSubmitProgress(steps: SubmitStep[]) {
    setSubmitProgress({ steps, activeIndex: 0 });
  }

  function goToStep(stepKey: SubmitStepKey) {
    setSubmitProgress((prev) => {
      if (!prev) return prev;
      const idx = prev.steps.findIndex((s) => s.key === stepKey);
      if (idx === -1) return prev;
      return { ...prev, activeIndex: idx };
    });
  }

  function endSubmitProgress() { setSubmitProgress(null); }

  // ── Create application ────────────────────────────────────────────────────

  /**
   * Core create flow. AI tool runs are NOT started here — if the user opted in,
   * we upload the override resume once (if provided), then hand off to the page
   * via onCreated so runs start through useFitRuns/useDocumentToolRuns.
   */
  async function createApplicationAfterDraft() {
    setErrorMessage(null);

    // Snapshot staged items so reset doesn't race with async work
    const stagedDocuments   = [...documents];
    const stagedConnections = [...selectedConnections];
    const stagedAiEnabled   = aiEnabled && (selections.fit || selections.interviewPrep || selections.resumeAdvice || selections.coverLetter);
    const stagedOverride    = overrideFile;
    const stagedTemplateText = templateText;

    if (!company.trim() || !position.trim()) {
      setErrorMessage("Company and position are required.");
      return;
    }

    // Validate AI tool requirements before creating so we fail fast
    if (stagedAiEnabled) {
      // Resume is required for every AI tool — validate before proceeding
      if (!baseResumeExists && !stagedOverride) {
        setIsResumeValidationOpen(true);
        return;
      }
    }

    const payload: CreateApplicationRequest = {
      company:        company.trim(),
      position:       position.trim(),
      status:         applicationStatus,
      description:    sourceDescriptionText || jdText.trim(), // canonicalJdText from source, fallback to pasted text
      notes:          toOptionalTrimmed(notes),
      // Store the AI-generated role summary if extraction was used; undefined for manual entry
      jdSummary:      draft?.ai?.jdSummary?.trim() || undefined,
      location:       toOptionalTrimmed(location),
      locationDetails: toOptionalTrimmed(locationDetails),
      jobType:        jobType === "UNKNOWN" ? undefined : jobType,
      jobTypeDetails: toOptionalTrimmed(jobTypeDetails),
      workMode:       workMode === "UNKNOWN" ? undefined : workMode,
      workModeDetails: toOptionalTrimmed(workModeDetails),
      salaryText:     toOptionalTrimmed(salaryText),
      salaryDetails:  toOptionalTrimmed(salaryDetails),
      jobLink:        toOptionalTrimmed(jobLink),
      tagsText:       toOptionalTrimmed(tagsText),
      isFavorite,
      dateApplied:    applicationStatus === "APPLIED" ? new Date().toISOString() : undefined,
    };

    try {
      setIsSubmitting(true);

      const steps = buildSubmitSteps({
        stagedDocumentsCount:  stagedDocuments.length,
        stagedConnectionsCount: stagedConnections.length,
      });

      startSubmitProgress(steps);
      goToStep("CREATE_APPLICATION");

      const created = await applicationsApi.create(payload);
      const label   = `${position.trim()} @ ${company.trim()}`;

      // ── Upload override resume once (if provided) ────────────────────
      // Attach it as CAREER_HISTORY so all tool runs reference the same doc
      // by ID rather than each uploading their own copy.
      let sourceDocumentId: number | undefined;
      if (stagedAiEnabled && stagedOverride) {
        try {
          const uploadRes = await applicationDocumentsApi.upload({
            applicationId: created.id,
            kind:          "CAREER_HISTORY",
            file:          stagedOverride,
          });
          sourceDocumentId = Number(uploadRes.document.id);

          // If user asked to also save this as their base resume, do it now
          if (saveAsBaseResume) {
            documentsApi.uploadBaseResume(stagedOverride).catch(() => {/* non-blocking */});
          }
        } catch {
          // Non-fatal — tool runs will fall back to base resume if available
        }
      }

      // ── Hand off to page immediately after create ──────────────────────
      // AI tool runs start on the page through useFitRuns/useDocumentToolRuns.
      // We do NOT await them here — the form continues with docs/connections.
      onCreated({
        applicationId: created.id,
        label,
        ...(stagedAiEnabled && {
          backgroundTools: {
            fit:           selections.fit,
            interviewPrep: selections.interviewPrep,
            resumeAdvice:  selections.resumeAdvice,
            coverLetter:   selections.coverLetter,
            sourceDocumentId,
            templateText: stagedTemplateText.trim() || undefined,
          },
        }),
      });

      // ── Staged documents ───────────────────────────────────────────────
      if (stagedDocuments.length) {
        goToStep("UPLOAD_DOCUMENTS");
      }

      const docResults = stagedDocuments.length
        ? await Promise.allSettled(
            stagedDocuments.map((d) =>
              applicationDocumentsApi.upload({
                applicationId: created.id,
                kind:          d.kind,
                file:          d.file,
              })
            )
          )
        : [];

      // ── Staged connections ─────────────────────────────────────────────
      if (stagedConnections.length) {
        goToStep("ATTACH_CONNECTIONS");
      }

      const connResults = stagedConnections.length
        ? await Promise.allSettled(
            stagedConnections.map((c) =>
              applicationsApi.attachConnectionToApplication(created.id, c.id)
            )
          )
        : [];

      const failedDocs  = docResults.filter((r) => r.status === "rejected").length;
      const failedConns = connResults.filter((r) => r.status === "rejected").length;

      goToStep("FINALIZE");
      resetToInitial();

      // Show partial-failure message for docs/connections (fit is no longer in this pipeline)
      if (failedDocs || failedConns) {
        const parts: string[] = [];
        if (failedDocs)  parts.push(`${failedDocs} document(s) failed to attach`);
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createApplicationAfterDraft();
  }

  // Warn before unload while submitting
  useEffect(() => {
    if (!isSubmitting) return;
    const prev = window.onbeforeunload;
    window.onbeforeunload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      return "";
    };
    return () => { window.onbeforeunload = prev; };
  }, [isSubmitting]);


  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Submit progress portal — covers only create-flow steps */}
      {isSubmitting ? (
        typeof document !== "undefined"
        ? createPortal(
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
                    const isDone   = idx < submitProgress.activeIndex;
                    const isActive = idx === submitProgress.activeIndex;
                    return (
                      <div key={s.key} className="flex items-center gap-2">
                        {isDone   ? <CheckCircle2 className="h-4 w-4" />
                        : isActive ? <Loader2 className="h-4 w-4 animate-spin" />
                                   : <Circle className="h-4 w-4 opacity-60" />}
                        <span className={isActive ? "font-medium" : "text-muted-foreground"}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>,
          document.body
        ) : null
      ) : null}

      {errorMessage ? <div className="text-sm text-red-600">{errorMessage}</div> : null}

      {/* Source input — textarea for TEXT mode, URL input for LINK mode */}
      <div className="space-y-2">
        {sourceMode === "TEXT" ? (
          <>
            <Label htmlFor="jd">Job description</Label>
            <Textarea
              id="jd"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              disabled={draft !== null || isGenerating}
              placeholder="Paste the full job description here... We'll extract the relevant information for you!"
              className="min-h-[140px]"
            />
          </>
        ) : (
          <>
            <Label htmlFor="jobPostingUrl">Job posting URL</Label>
            <Input
              id="jobPostingUrl"
              type="url"
              value={jobPostingUrl}
              onChange={(e) => setJobPostingUrl(e.target.value)}
              disabled={draft !== null || isGenerating}
              placeholder="https://jobs.example.com/posting/12345"
            />
            <div className="text-xs text-muted-foreground">
              {`We'll fetch the page and extract the job details for you. Paste the JD instead if the link requires login.`}
            </div>
          </>
        )}

        {/* Generate progress — shown while isGenerating */}
        {isGenerating && generateStepLabel ? (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              {generateStepLabel}
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-[2000ms] ease-out"
                style={{
                  width:
                    sourceMode === "LINK"
                      ? generateStepLabel.includes("Connecting") ? "20%"
                        : generateStepLabel.includes("Fetching")  ? "55%"
                        : "80%"
                      : "70%",
                }}
              />
            </div>
          </div>
        ) : null}

        <div className="flex justify-end mt-4 gap-2">
          {draft ? (
            <Button type="button" variant="outline" onClick={handleReset} disabled={isGenerating || isSubmitting}>
              Reset
            </Button>
          ) : null}
          {isBlocked ? (
            <BlockedRunButton plan={planLabel} />
          ) : (
            sourceMode === "LINK" ? (
              <div className="flex flex-col items-end gap-1">
                <Button type="button" onClick={handleGenerate} disabled={!canGenerate || draft !== null} className="w-full mb-2">
                  {isGenerating ? "Generating…" : "Generate draft from link"}
                </Button>
                <CreditCostNote plan={planLabel} cost={1} />
              </div>
            ) : (
              <>
                <Button type="button" onClick={handleGenerate} disabled={!canGenerate || draft !== null} className="w-full mb-2">
                  {isGenerating ? "Generating…" : "Generate draft"}
                </Button>
                <CreditCostNote plan={planLabel} cost={1} />
              </>
            )
          )}
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
                {draft.ai.warnings.map((w) => <li key={w}>{w}</li>)}
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
                  onChange={(e) => setIsFavorite(e.target.checked)}
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
                {JOB_TYPE_OPTIONS.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
              </Select>
            </div>

            <div className="space-y-2 md:col-span-4">
              <Label htmlFor="workMode">Work Arrangement</Label>
              <Select id="workMode" value={workMode} onChange={(e) => setWorkMode(e.target.value as WorkMode)}>
                {WORK_MODE_OPTIONS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
              </Select>
            </div>

            <div className="space-y-2 md:col-span-4">
              <Label htmlFor="status">Application Status</Label>
              <Select id="status" value={applicationStatus} onChange={(e) => setApplicationStatus(e.target.value as ApplicationStatus)}>
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
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

            <div className="text-sm font-medium block mt-5 md:col-span-12">Extra Details:</div>

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
              <Input id="jobTypeDetails" value={jobTypeDetails} onChange={(e) => setJobTypeDetails(e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="workModeDetails">Work Arrangement Details</Label>
              <Input id="workModeDetails" value={workModeDetails} onChange={(e) => setWorkModeDetails(e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="locationDetails">Location Details</Label>
              <Input id="locationDetails" value={locationDetails} onChange={(e) => setLocationDetails(e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="salaryDetails">Salary Details</Label>
              <Input id="salaryDetails" value={salaryDetails} onChange={(e) => setSalaryDetails(e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-12">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[120px]"
              />

              <Button type="button" variant="link" className="px-0" onClick={() => setShowMore((v) => !v)}>
                {showMore ? "Hide extra fields" : "More fields"}
              </Button>

              {showMore ? (
                <div className="grid gap-x-6 gap-y-6 md:grid-cols-14">
                  {/* Documents: add controls */}
                  <div className="space-y-3 rounded-md border p-3 md:col-span-4">
                    <div className="text-sm font-medium">Documents</div>
                    <div className="space-y-2">
                      <Label htmlFor="docKind">Document type</Label>
                      <Select id="docKind" value={docKind} onChange={(e) => setDocKind(e.target.value as UploadableDocKind)}>
                        {DOC_KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
                      {docFile ? <div className="text-xs text-muted-foreground truncate">Selected: {docFile.name}</div> : null}
                    </div>
                    <Button type="button" onClick={addDocument} disabled={!docFile} className="w-full">
                      Add document
                    </Button>
                  </div>

                  {/* Documents: staged list */}
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

                  {/* Connections: search + suggestions */}
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
                      {isConnectionSuggestLoading ? <div className="text-xs text-muted-foreground">Searching...</div> : null}
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" variant="outline" size="sm" onClick={openCreateConn}>Create new</Button>
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

                  {/* Connections: selected list */}
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

          {/* ── AI tools after create ── */}
          <AiToolsAfterCreate
            enabled={aiEnabled}
            onEnabledChange={setAiEnabled}
            selections={selections}
            onSelectionsChange={updateSelections}
            baseResumeExists={baseResumeExists}
            baseCoverLetterExists={baseCoverLetterExists}
            overrideFile={overrideFile}
            onOverrideFileChange={setOverrideFile}
            templateFile={templateFile}
            onTemplateFileChange={(f) => void handleTemplateFile(f)}
            disabled={isSubmitting}
          />

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create application"}
            </Button>
          </div>

          {/* ── Resume validation dialog ─────────────────────────────────────
               Shown when AI tools are enabled but no resume is available.
               Lets the user upload one now or navigate to profile.         */}
          <Dialog open={isResumeValidationOpen} onOpenChange={setIsResumeValidationOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Resume required</DialogTitle>
                <DialogDescription>
                  {`A resume is needed to run AI tools. Upload one now or add a
                  base resume to your profile so it's always available.`}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 mt-2">
                <Input
                  type="file"
                  accept=".pdf,.txt,.docx"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setOverrideFile(f);
                  }}
                />
                {overrideFile && (
                  <p className="text-xs text-muted-foreground truncate">
                    Selected: {overrideFile.name}
                  </p>
                )}

                {/* Offer to also save as base resume so this doesn't happen again */}
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAsBaseResume}
                    onChange={(e) => setSaveAsBaseResume(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Also save as my base resume
                </label>
              </div>

              <DialogFooter className="gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    // Disable AI tools and proceed without them
                                  setIsResumeValidationOpen(false);
                    void createApplicationAfterDraft();
                  }}
                >
                  Create without AI tools
                </Button>
                <Button
                  type="button"
                  disabled={!overrideFile}
                  onClick={() => {
                    setIsResumeValidationOpen(false);
                    void createApplicationAfterDraft();
                  }}
                >
                  Continue
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ── Create connection dialog ── */}
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
                    <Input value={newConnDraft.company} onChange={(e) => setNewConnDraft((p) => ({ ...p, company: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={newConnDraft.title} onChange={(e) => setNewConnDraft((p) => ({ ...p, title: e.target.value }))} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={newConnDraft.email} onChange={(e) => setNewConnDraft((p) => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>LinkedIn URL</Label>
                    <Input value={newConnDraft.linkedInUrl} onChange={(e) => setNewConnDraft((p) => ({ ...p, linkedInUrl: e.target.value }))} />
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