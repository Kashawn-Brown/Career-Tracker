"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Application, UpdateApplicationRequest, ApplicationStatus, JobType, WorkMode, Document } from "@/types/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { STATUS_OPTIONS, JOB_TYPE_OPTIONS, WORK_MODE_OPTIONS, statusLabel, jobTypeLabel, workModeLabel } from "@/lib/applications/presentation";
import { dateAppliedFormat, toDateInputValue, dateInputToIso, todayInputValue } from "@/lib/applications/dates";
import { parseTags, serializeTags, splitTagInput } from "@/lib/applications/tags";
import { ApplicationDocumentsSection } from "@/components/applications/drawer/ApplicationDocumentsSection";
import { ApplicationConnectionsSection } from "@/components/applications/drawer/ApplicationConnectionsSection";
import { ApplicationAiToolsSection } from "@/components/applications/drawer/ApplicationAiToolsSection";
import { cn } from "@/lib/utils";
import { PILL_BASE_CLASS, getStatusPillTokens } from "@/lib/applications/pills";
import { documentsApi } from "@/lib/api/documents";
import { ApiError } from "@/lib/api/client";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Save, X, Star } from "lucide-react";
import type { CSSProperties } from "react";


// ApplicationDetailsDrawer.tsx: a drawer component for the app to use for displaying application details

// Selector for the application details drawer
const DRAWER_SELECTOR = '[data-app-drawer="application-details"]';

// Keep spacing consistent with Fit dialog docking
const PREVIEW_DOCK_PADDING_PX = 24;
const PREVIEW_MAX_WIDTH_PX = 900;


// A helper component to display a section of the application details (e.g. Job details, Job link, Tags, Notes, Job description)
function Section({
  title,
  children,
  noParent = false,
}: {
  title: string;
  children: React.ReactNode;
  noParent?: boolean;
}) {
  if (noParent) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium">{title}</div>
        <div>{children}</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{title}</div>
      <div className="rounded-md border bg-muted/10 p-3 text-sm">{children}</div>
    </div>
  );
}

// A helper component to display a field of the application details (e.g. Company, Position, Salary, Job type, Work mode, Date applied)
function Field({
  label,
  value,
  details,
  emptyValue = "—",
  link = false,
}: {
  label: string;
  value?: string | null | undefined;
  details?: string | null;
  emptyValue?: string;
  link?: boolean;
}) {
  const primary = value?.trim() ? value.trim() : emptyValue;
  const secondary = details?.trim() ? details.trim() : null;  // for optional details

  if (link) {
    return (
      <div className="grid grid-cols-[140px_1fr] gap-3 text-muted-foreground">
        <div className="text-sm">{label}</div>
        <a 
          href={primary}
          target="_blank"
          rel="noreferrer"
          className="break-all underline underline-offset-4 text-right"
        >
          {primary}
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 space-y-1">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="space-y-1 text-right">
        <div className="text-sm">{primary}</div>
        {/* Optional details are only shown when present */}
        {secondary ? (
          <div className="text-xs text-muted-foreground font-light">
            {secondary}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Used for editing fields in the application details drawer
 * Same grid as Field, but lets us render inputs on the right side.
 */
function EditRow({
  label,
  children,
  labelClassName,
}: {
  label: string;
  children: React.ReactNode;
  labelClassName?: string;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
      <div className={`text-sm text-muted-foreground ${labelClassName ?? ""}`}>{label}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

/**
 * Simple expand/collapse for large pre-wrapped text blocks.
 * Keeps the drawer scan-friendly while still letting users read the full content.
 */
function ExpandableText({
  text,
  collapsedMaxHeightClass = "max-h-40",
  minCharsToEnable = 350,
}: {
  text: string;
  collapsedMaxHeightClass?: string;
  minCharsToEnable?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = text.trim().length >= minCharsToEnable;

  const formatText = text.split("\n");

  return (
    <div className="space-y-2">
      <div
        className={[
          "whitespace-pre-wrap text-muted-foreground",
          expanded || !canExpand ? "" : `${collapsedMaxHeightClass} overflow-hidden`,
        ].join(" ")}
      >
        {/* {text} */}
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          {formatText.map((item) => (
            <li key={item}>{item.replace(/^-+/, "")}</li>
          ))}
        </ul>
      </div>

      {canExpand ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => setExpanded((prev) => !prev)}
          >
          {expanded ? "Show less" : "Show more"}
        </Button>
        </div>
      ) : null}
    </div>
  );
}


/**
 * Helper component for creating a status pill
 */
type StatusPillProps = {
  status: ApplicationStatus;
  className?: string;
};

function StatusPill({ status, className }: StatusPillProps) {
  const { wrap, dot } = getStatusPillTokens(status);
  return (
    <span className={cn("font-medium text", className)}>
      <span className={cn(PILL_BASE_CLASS, wrap, "text-md")}>
        <span className={cn("w-1.5 h-1.5 rounded-full mr-2", dot)} />
        {statusLabel(status)}
      </span>
    </span>
  );
}

// Usage example: 
// <StatusPill status={application.status} />


/**
 * The draft of the application details being edited
 * Same as Application, but with inputs for the fields
 */
type Draft = {
  company: string;
  position: string;
  status: ApplicationStatus;

  salaryText: string;
  salaryDetails: string;

  location: string;
  locationDetails: string;

  jobType: JobType;
  jobTypeDetails: string;

  workMode: WorkMode;
  workModeDetails: string;

  dateApplied: string; // yyyy-mm-dd for input
  jobLink: string;
  notes: string;
  description: string;

  isFavorite: boolean;
  tags: string[];
};

// Convert an Application to a Draft (for editing)
function toDraft(app: Application): Draft {
  return {
    company: app.company,
    position: app.position,
    status: app.status,

    salaryText: app.salaryText ?? "",
    salaryDetails: app.salaryDetails ?? "",

    location: app.location ?? "",
    locationDetails: app.locationDetails ?? "",

    jobType: app.jobType,
    jobTypeDetails: app.jobTypeDetails ?? "",

    workMode: app.workMode,
    workModeDetails: app.workModeDetails ?? "",

    dateApplied: toDateInputValue(app.dateApplied),

    jobLink: app.jobLink ?? "",
    notes: app.notes ?? "",
    description: app.description ?? "",

    isFavorite: app.isFavorite,
    tags: parseTags(app.tagsText),
  };
}


export function ApplicationDetailsDrawer({
  open,
  onOpenChange,
  application,
  onSave,
  onDocumentsChanged,
  onConnectionsChanged,
  onApplicationChanged,
  autoOpenFitForAppId,
  onAutoOpenFitConsumed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application | null;
  onSave: (
    applicationId: string,
    patch: UpdateApplicationRequest
  ) => Promise<Application>;
  onDocumentsChanged?: (applicationId: string) => void;
  onConnectionsChanged?: (applicationId: string) => void;
  onApplicationChanged?: (applicationId: string) => void;
  autoOpenFitForAppId?: string | null;
  onAutoOpenFitConsumed?: () => void;
}) {
  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Draft | null>(null);

  // Tags input state (only used in edit mode)
  const [tagInput, setTagInput] = useState("");
  const [armedTagIndex, setArmedTagIndex] = useState<number | null>(null);

  // The today's date in the <input type="date" /> format
  const todayString = todayInputValue();

  // A ref to the last application id that was opened
  const lastAppIdRef = useRef<string | null>(null);

  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Base resume document
  const [baseResume, setBaseResume] = useState<Document | null>(null);
  const baseResumeExists = Boolean(baseResume);
  const baseResumeId = baseResume ? Number(baseResume.id) : null;


  const [useAiOverride, setUseAiOverride] = useState(false);
  const [aiOverrideFile, setAiOverrideFile] = useState<File | null>(null);

  // Docking style for the document preview
  const [previewDockedStyle, setPreviewDockedStyle] = useState<CSSProperties | null>(null);

  // A key to force a reload of the documents list
  const [docsReloadKey, setDocsReloadKey] = useState(0);


  // keep the drawer’s draft in sync with the selected application.
  useEffect(() => {

    // The id of the currently selected application (null if none).
    const nextId = application?.id ?? null;
    // The id of the last application that was opened (stored in a ref so it persists between renders).
    const prevId = lastAppIdRef.current;
  
    // If the drawer closes or there’s no selected application -> hard reset
    if (!open || !application) {
      setIsEditing(false);
      setIsSaving(false);
      setError(null);
      setDraft(null);
      setTagInput("");
      setArmedTagIndex(null);
      return;
    }

    // true only when you were on one app and are now on a different one
    const switchedRows = prevId !== null && nextId !== null && prevId !== nextId;

    // Rebuild the draft from the selected application when:
    // - switching rows, or
    // - not editing.
    // if same row, don’t overwrite unsaved edits while editing.
    if (switchedRows || !isEditing) {
      setDraft(toDraft(application));
      setIsEditing(false);
      setIsSaving(false);
      setError(null);
      setTagInput("");
      setArmedTagIndex(null);
    }

    lastAppIdRef.current = nextId;

  }, [open, application, isEditing]);

  // Loads the base resume document for the current user
  useEffect(() => {
    let cancelled = false;
  
    async function loadBaseResume() {
      if (!open) return;
  
      try {
        const res = await documentsApi.getBaseResume();
        if (!cancelled) setBaseResume(res.baseResume ?? null);
      } catch {
        if (!cancelled) setBaseResume(null);
      }
    }
  
    loadBaseResume();
  
    return () => {
      cancelled = true;
    };
  }, [open]);
  

  // Resets the AI override state when the application changes
  useEffect(() => {
    setUseAiOverride(false);
    setAiOverrideFile(null);
  }, [application?.id]);

  // Reset the AI override state when the drawer is closed
  useEffect(() => {
    if (!open) {
      setUseAiOverride(false);
      setAiOverrideFile(null);
    }
  }, [open]);

  // Starts the edit mode.
  function startEdit() {
    if (!application) return;
    setDraft(toDraft(application));
    setIsEditing(true);
    setError(null);
    setTagInput("");
    setArmedTagIndex(null);
  }

  // Cancels the edit mode.
  function cancelEdit() {
    if (!application) return;
    setDraft(toDraft(application));
    setIsEditing(false);
    setError(null);
    setTagInput("");
    setArmedTagIndex(null);
  }

  // Adds tags from the input.
  function addTagsFromInput() {
    if (!draft) return;

    const newTags = splitTagInput(tagInput);
    if (newTags.length === 0) return;

    // de-dupe (case-insensitive), but keep original casing of first occurrence
    const seen = new Set(draft.tags.map((t) => t.toLowerCase()));
    const merged = [...draft.tags];

    for (const t of newTags) {
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(t);
    }

    setDraft({ ...draft, tags: merged });
    setTagInput("");
    setArmedTagIndex(null);
  }

  // Removes a tag at the given index.
  function removeTagAt(index: number) {
    if (!draft) return;
    const next = draft.tags.filter((_, i) => i !== index);
    setDraft({ ...draft, tags: next });
    setArmedTagIndex(null);
  }

  // Saves the changes to the application.
  async function handleSave() {
    if (!application || !draft) return;

    setError(null);

    const company = draft.company.trim();
    const position = draft.position.trim();

    if (!company) {
      setError("Company cannot be empty.");
      return;
    }
    if (!position) {
      setError("Position cannot be empty.");
      return;
    }

    const patch: UpdateApplicationRequest = {
      company,
      position,
      status: draft.status,
      location: draft.location,
      locationDetails: draft.locationDetails,
      jobType: draft.jobType,
      workMode: draft.workMode,
      isFavorite: draft.isFavorite,

      salaryText: draft.salaryText, // allow blank if user clears
      
      jobTypeDetails: draft.jobTypeDetails,
      workModeDetails: draft.workModeDetails,
      salaryDetails: draft.salaryDetails,

      jobLink: draft.jobLink,
      notes: draft.notes,
      description: draft.description,

      // Persist deletions too: empty tags => ""
      tagsText: serializeTags(draft.tags),
    };

    // Handle date applied
    if (!draft.dateApplied.trim()) {
      if (application.dateApplied) patch.dateApplied = null; // only clear if there was one
    } else {
      if (draft.dateApplied > todayString) {
        setError("Date applied cannot be in the future.");
        return;
      }
      patch.dateApplied = dateInputToIso(draft.dateApplied)!;
    }

    try {
      setIsSaving(true);
      const updated = await onSave(application.id, patch);

      // Sync drawer immediately (even before parent rerenders)
      setDraft(toDraft(updated));
      setIsEditing(false);
      setTagInput("");
      setArmedTagIndex(null);
    } catch {
      setError("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  // Clears the document preview.
  function clearPreview() {
    setPreviewDocId(null);
    setPreviewTitle(null);
    setPreviewUrl(null);
    setPreviewError(null);
    setIsPreviewLoading(false);
  }

  // Clears the document preview when the drawer closes.
  useEffect(() => {
    if (!open) clearPreview();
  }, [open]);
  
  // Clears the document preview when the application changes.
  useEffect(() => {
    clearPreview();
  }, [application?.id]);

  // Handles a document preview request.
  async function handlePreviewRequest(doc: Document | null) {
    if (!doc) {
      clearPreview();
      return;
    }
  
    // Only support PDF preview
    if (doc.mimeType !== "application/pdf") return;
  
    const docIdStr = String(doc.id);
  
    // Close if already open
    if (previewDocId === docIdStr) {
      clearPreview();
      return;
    }
  
    const id = Number(doc.id);
    if (!Number.isFinite(id)) return;
  
    setPreviewDocId(docIdStr);
    setPreviewTitle(doc.originalName ?? "Document");
    setPreviewUrl(null);         // prevents “old PDF flashes” when switching docs
    setPreviewError(null);
    setIsPreviewLoading(true);
  
    try {
      const res = await documentsApi.getDownloadUrl(id, { disposition: "inline" });
      setPreviewUrl(res.downloadUrl);
    } catch (err) {
      if (err instanceof ApiError) setPreviewError(err.message);
      else setPreviewError("Failed to load preview.");
    } finally {
      setIsPreviewLoading(false);
    }
  }

  // Computes the docking style for the document preview
  useEffect(() => {
    if (!previewDocId) {
      setPreviewDockedStyle(null);
      return;
    }
  
    // Dock the preview inside the space left of the drawer (even padding on both sides)
    const compute = () => {
      const drawerEl = document.querySelector(DRAWER_SELECTOR) as HTMLElement | null;
      const drawerRect = drawerEl?.getBoundingClientRect() ?? null;
  
      const availableWidth = drawerRect ? drawerRect.left : window.innerWidth;
      const centerX = Math.max(availableWidth / 2, PREVIEW_DOCK_PADDING_PX);
  
      const width = Math.min(
        PREVIEW_MAX_WIDTH_PX,
        Math.max(availableWidth - PREVIEW_DOCK_PADDING_PX * 2, 0)
      );
  
      setPreviewDockedStyle({
        left: `${centerX}px`,
        width: `${width}px`,
      });
    };
  
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [previewDocId]);
  
  

  // The title of the application details drawer (e.g. "⭐ Position @ Company")
  const title = useMemo(() => {
    if (!application) return "Application details";
    const company = isEditing ? draft?.company ?? application.company : application.company;
    const position = isEditing ? draft?.position ?? application.position : application.position;
    const fav = isEditing ? draft?.isFavorite ?? application.isFavorite : application.isFavorite;
    return `${fav ? "⭐ " : ""}${position} @ ${company}`;
  }, [application, draft, isEditing]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      
      {/* Application details */}
      <SheetContent side="right" className="space-y-5 overflow-y-auto" data-app-drawer="application-details">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {application && draft
              ? (
                <>
                  <span className="block">Updated: {new Date(application.updatedAt).toLocaleString()}</span>
                  <StatusPill status={application.status} className="mt-2 inline-flex" />
                </>
              )
              : "Select an application to view details."}
          </SheetDescription>

          {application ? (
            <div className="pt-2 flex items-center gap-2">
              {!isEditing ? (
                <Button size="sm" variant="outline" onClick={startEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={cancelEdit}
                    disabled={isSaving}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>

                  {/* Favorite toggle stays in the header while editing */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setDraft((prev) =>
                        prev ? { ...prev, isFavorite: !prev.isFavorite } : prev
                      )
                    }
                    aria-pressed={draft?.isFavorite}
                    title="Toggle favorite"
                  >
                    <Star
                      className="mr-2 h-4 w-4"
                      fill={draft?.isFavorite ? "currentColor" : "none"}
                    />
                    Favorite
                  </Button>
                </>
              )}
            </div>
          ) : null}

          {error ? (
            <div className="pt-2 text-sm text-destructive">{error}</div>
          ) : null}
        </SheetHeader>

        {!application || !draft ? (
          <div className="text-sm text-muted-foreground">
            No application selected.
          </div>
        ) : (
          <div className="space-y-5">
            
            {/* Job details section */}
            <Section title="">
              <div className="space-y-2">
                {/* Displaying the application details */}
                {!isEditing ? (
                  // Displaying the application details
                  <>
                    <Field label="Company" value={application.company} />
                    <Field label="Position" value={application.position} />

                    {application.location ? (
                      <Field 
                        label="Location" 
                        value={application.location} 
                        details={application.locationDetails}
                        emptyValue="N/A"
                      />
                    ) : null}
                    
                    {application.jobType!="UNKNOWN" ? (
                      <Field
                        label="Job type"
                        value={jobTypeLabel(application.jobType)}
                        details={application.jobTypeDetails}
                      />
                    ) : null}

                    {application.workMode!="UNKNOWN" ? (
                      <Field
                      label="Work arrangement"
                      value={workModeLabel(application.workMode)}
                      details={application.workModeDetails}
                    />
                    ) : null}

                    {application.salaryText ? (
                      <Field
                      label="Salary"
                      value={application.salaryText}
                      emptyValue="Not specified"
                      details={application.salaryDetails}
                      />
                    ) : null}

                    {application.dateApplied ? (
                      <Field
                        label="Date applied"
                        value={dateAppliedFormat(application.dateApplied)}
                      />
                    ) : null}

                    {application.jobLink ? (
                      <Field
                        label="Job link"
                        value={application.jobLink}
                        link={true}
                      />
                    ) : null}
                  </>
                ) : (
                  // Editing the application details
                  <>
                    {/* Company */}
                    <EditRow label="Company">
                      <Input
                        value={draft.company}
                        onChange={(e) =>
                          setDraft({ ...draft, company: e.target.value })
                        }
                      />
                    </EditRow>

                    <EditRow label="Position">
                      <Input
                        value={draft.position}
                        onChange={(e) =>
                          setDraft({ ...draft, position: e.target.value })
                        }
                        className="mb-5"
                      />
                    </EditRow>

                    <EditRow label="Location">
                      <Input
                        value={draft.location}
                        onChange={(e) =>
                          setDraft({ ...draft, location: e.target.value })
                        }
                        placeholder="e.g., Toronto, ON"
                      />
                    </EditRow>

                    <EditRow label="Location details" labelClassName="font-light">
                      <Input
                        value={draft.locationDetails}
                        onChange={(e) =>
                          setDraft({ ...draft, locationDetails: e.target.value })
                        }
                        placeholder="e.g., 159 St. George St."
                        className="mb-5"
                      />
                    </EditRow>

                    {/* Job type + details are connected (details is a sub-input) */}
                    <EditRow label="Job type">
                      <Select
                        value={draft.jobType}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            jobType: e.target.value as JobType,
                          })
                        }
                      >
                        {JOB_TYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </EditRow>

                    {/* Job type details (sub-row) */}
                    <EditRow label="Job type details" labelClassName="font-light">
                      <Input
                        value={draft.jobTypeDetails}
                        onChange={(e) =>
                          setDraft({ ...draft, jobTypeDetails: e.target.value })
                        }
                        placeholder="e.g., 6-month contract, potential for extension..."
                        className="mb-5"
                      />
                    </EditRow>                    

                    {/* Work mode + details are connected (details is a sub-input) */}
                    <EditRow label="Work arrangement">
                      <Select
                        value={draft.workMode}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            workMode: e.target.value as WorkMode,
                          })
                        }
                      >
                        {WORK_MODE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </EditRow>

                    {/* Work mode details (sub-row) */}
                    <EditRow label="Work arrangement details" labelClassName="font-light">
                      <Input
                        value={draft.workModeDetails}
                        onChange={(e) =>
                          setDraft({ ...draft, workModeDetails: e.target.value })
                        }
                        placeholder="e.g., 2 days in office, downtown Toronto, hybrid-flex"
                        className="mb-5"
                      />
                    </EditRow>

                    <EditRow label="Salary">
                      <Input
                        value={draft.salaryText}
                        onChange={(e) =>
                          setDraft({ ...draft, salaryText: e.target.value })
                        }
                        placeholder="e.g., $90k–110k CAD"
                      />
                    </EditRow>

                    <EditRow label="Salary details" labelClassName="font-light">
                      <Input
                        value={draft.salaryDetails}
                        onChange={(e) =>
                          setDraft({ ...draft, salaryDetails: e.target.value })
                        }
                        placeholder="Annual bonus, stock options, etc."
                        className="mb-5"
                      />
                    </EditRow>

                    <EditRow label="Status">
                      <Select
                        value={draft.status}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            status: e.target.value as ApplicationStatus,
                          })
                        }
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </EditRow>

                    <EditRow label="Date applied">
                      <Input
                        type="date"
                        max={todayString}
                        value={draft.dateApplied}
                        onChange={(e) =>
                          setDraft({ ...draft, dateApplied: e.target.value })
                        }
                      />
                      <div className="text-xs text-muted-foreground text-right">
                        <button className="text-blue-500 hover:text-blue-600 hover:underline" onClick={() => setDraft({ ...draft, dateApplied: "" })}>Clear applied date.</button>
                      </div>
                    </EditRow>

                    <EditRow label="Job link" labelClassName="font-light">
                    <Input
                      value={draft.jobLink}
                      onChange={(e) =>
                        setDraft({ ...draft, jobLink: e.target.value })
                      }
                      placeholder="https://..."
                    />
                    </EditRow> 
                  </>
                )}
              </div>
            </Section>

            {/* Tags section */}
            <Section title="Tags">
              {!isEditing ? (
                parseTags(application.tagsText).length ? (
                  <div className="flex flex-wrap gap-2">
                    {parseTags(application.tagsText).map((t) => (
                      <span
                        key={t}
                        className="rounded-full border px-2 py-0.5 text-xs"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">No tags</span>
                )
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {draft.tags.length ? (
                      draft.tags.map((t, idx) => {
                        const isArmed = armedTagIndex === idx;
                        return (
                          <span
                            key={`${t}-${idx}`}
                            className={[
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                              isArmed ? "ring-2 ring-primary/40" : "",
                            ].join(" ")}
                          >
                            {t}
                            <button
                              type="button"
                              className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-muted"
                              onClick={() => removeTagAt(idx)}
                              aria-label={`Remove tag ${t}`}
                              title="Remove tag"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        No tags
                      </span>
                    )}
                  </div>

                  <Input
                    value={tagInput}
                    onChange={(e) => {
                      setTagInput(e.target.value);
                      // typing should un-arm the last tag highlight
                      if (armedTagIndex !== null) setArmedTagIndex(null);
                    }}
                    placeholder="Type a tag and press Enter"
                    onKeyDown={(e) => {
                      if (!draft) return;

                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTagsFromInput();
                        return;
                      }

                      if (e.key === "Backspace") {
                        // Only applies when input is empty
                        if (tagInput.length === 0 && draft.tags.length > 0) {
                          e.preventDefault();

                          const lastIndex = draft.tags.length - 1;

                          // Backspace #1 arms last tag, Backspace #2 deletes it
                          if (armedTagIndex === lastIndex) {
                            removeTagAt(lastIndex);
                          } else {
                            setArmedTagIndex(lastIndex);
                          }
                        }
                      }
                    }}
                  />

                  <div className="text-xs text-muted-foreground">
                    Enter adds a tag. Backspace (empty input) arms last tag, backspace again deletes it.
                  </div>
                </div>
              )}
            </Section>

            {/* Notes section */}
            <Section title="Highlights">
              {!isEditing ? (
                application.notes ? (
                  <ExpandableText
                    key={`${application.id}-notes`}
                    text={application.notes}
                    collapsedMaxHeightClass="max-h-32"
                  />
                ) : (
                  <span className="text-muted-foreground">Nothing noted</span>
                )
              ) : (
                <Textarea
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  placeholder="Notes..."
                />
              )}
            </Section>

            {/* Job description section */}
            <Section title="Job description">
              {!isEditing ? (
                application.description ? (
                  <div className="max-h-[45vh] overflow-auto whitespace-pre-wrap text-muted-foreground">
                    {application.description}
                  </div>
                ) : (
                  <span className="text-muted-foreground">
                    No job description available
                  </span>
                )
              ) : (
                <Textarea
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                  placeholder="Paste JD here..."
                  className="min-h-[140px]"
                />
              )}
            </Section>

            {/* Application Connections section */}
            <Section title="Connections" noParent={true}>
              <ApplicationConnectionsSection
                applicationId={application.id}
                open={open}
                isEditing={isEditing}
                onConnectionsChanged={onConnectionsChanged}
              />
            </Section>

            {/* Application Documents section */}
            <Section title="Documents" noParent={true}>
              <ApplicationDocumentsSection
                applicationId={application.id}
                open={open}
                isEditing={isEditing}
                onDocumentsChanged={onDocumentsChanged}
                activePreviewDocId={previewDocId}
                onPreviewRequested={handlePreviewRequest}
                docsReloadKey={docsReloadKey}
              />
            </Section>

            {/* AI Tools section */}
            <Section title="AI Tools" noParent={true}>
              <ApplicationAiToolsSection 
                drawerOpen={open}
                application={application} 
                baseResumeExists={baseResumeExists} 
                baseResumeId={baseResumeId}
                useOverride={useAiOverride}
                overrideFile={aiOverrideFile}
                onToggleOverride={(checked) => {
                  setUseAiOverride(checked);
                  if (!checked) setAiOverrideFile(null);
                }}
                onOverrideFile={setAiOverrideFile}
                onDocumentsChanged={(applicationId) => {
                  setDocsReloadKey((k) => k + 1);      // refresh drawer docs list
                  onDocumentsChanged?.(applicationId); // refresh main table
                }}
                onRequestClosePreview={clearPreview}
                onApplicationChanged={onApplicationChanged}
                autoOpenLatestFit={autoOpenFitForAppId === application.id}
                onAutoOpenLatestFitConsumed={onAutoOpenFitConsumed}
              />
            </Section>
          </div>
        )}

        {previewDocId ? (
          <div
            className="hidden lg:block fixed inset-y-6 z-[60] -translate-x-1/2"
            style={previewDockedStyle ?? undefined}
          >
            <div className="h-full rounded-xl border bg-background shadow-xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {previewTitle ?? "Preview"}
                  </div>
                  <div className="text-xs text-muted-foreground">PDF preview</div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearPreview}
                  title="Close preview"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1">
                {isPreviewLoading ? (
                  <div className="p-4 text-sm text-muted-foreground">Loading preview...</div>
                ) : previewError ? (
                  <div className="p-4 text-sm text-destructive">{previewError}</div>
                ) : previewUrl ? (
                  <iframe
                    src={previewUrl}
                    title={previewTitle ?? "PDF preview"}
                    className="h-full w-full bg-white"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

      </SheetContent>
    </Sheet>
  );
}
