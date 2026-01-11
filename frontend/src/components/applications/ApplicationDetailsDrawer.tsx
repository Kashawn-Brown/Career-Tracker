"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Application, UpdateApplicationRequest, ApplicationStatus, JobType, WorkMode, Document } from "@/types/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { STATUS_OPTIONS, JOB_TYPE_OPTIONS, WORK_MODE_OPTIONS, statusLabel, jobTypeLabel, workModeLabel } from "@/lib/applications/presentation";
import { dateAppliedFormat, toDateInputValue, dateInputToIso, todayInputValue } from "@/lib/applications/dates";
import { parseTags, serializeTags, splitTagInput } from "@/lib/applications/tags";
import { ApplicationDocumentsSection } from "@/components/applications/ApplicationDocumentsSection";
import { documentsApi } from "@/lib/api/documents";
import { ApiError } from "@/lib/api/client";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Save, X, Star } from "lucide-react";

// ApplicationDetailsDrawer.tsx: a drawer component for the app to use for displaying application details


// A helper component to display a section of the application details (e.g. Job details, Job link, Tags, Notes, Job description)
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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
}: {
  label: string;
  value?: string | null | undefined;
  details?: string | null;
  emptyValue?: string;
}) {
  const primary = value?.trim() ? value.trim() : emptyValue;
  const secondary = details?.trim() ? details.trim() : null;  // for optional details

  return (
    <div className="grid grid-cols-[140px_1fr] gap-3">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="space-y-1">
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
 * The draft of the application details being edited
 * Same as Application, but with inputs for the fields
 */
type Draft = {
  company: string;
  position: string;
  status: ApplicationStatus;

  salaryText: string;

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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application | null;
  onSave: (
    applicationId: string,
    patch: UpdateApplicationRequest
  ) => Promise<Application>;
  onDocumentsChanged?: (applicationId: string) => void;
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

      {/* Document preview */}
      {previewDocId ? (
        <div
          className="hidden lg:flex fixed inset-y-0 left-0 z-[60] pointer-events-none items-start justify-center p-4"
          style={{ right: "min(32rem, 75vw)" }} // keeps it from overlapping the drawer
        >
          <div className="pointer-events-auto mt-2 w-[min(900px,calc(100%-2rem))] h-[min(80vh,900px)] rounded-xl border bg-background shadow-xl overflow-hidden">
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

            <div className="h-[calc(100%-52px)]">
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

      
      {/* Application details */}
      <SheetContent side="right" className="space-y-5 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {application && draft
              ? (
                <>
                  Updated: {new Date(application.updatedAt).toLocaleString()}
                  <br />
                  <span className="font-medium">Status: {statusLabel(isEditing ? draft.status : application.status)}</span>
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
            <Section title="Job details">
              <div className="space-y-2">
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
                      />
                    ) : null}

                    {application.dateApplied ? (
                      <Field
                        label="Date applied"
                        value={dateAppliedFormat(application.dateApplied)}
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
                      />
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
                  </>
                )}
              </div>
            </Section>

            <Section title="Job link">
              {!isEditing ? (
                application.jobLink ? (
                  <a
                    href={application.jobLink}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all underline underline-offset-4"
                  >
                    {application.jobLink}
                  </a>
                ) : (
                  <span className="text-muted-foreground">
                    No job link available
                  </span>
                )
              ) : (
                <Input
                  value={draft.jobLink}
                  onChange={(e) =>
                    setDraft({ ...draft, jobLink: e.target.value })
                  }
                  placeholder="https://..."
                />
              )}
            </Section>

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

            <Section title="Notes">
              {!isEditing ? (
                application.notes ? (
                  <div className="whitespace-pre-wrap">{application.notes}</div>
                ) : (
                  <span className="text-muted-foreground">No notes</span>
                )
              ) : (
                <Textarea
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  placeholder="Notes..."
                />
              )}
            </Section>

            <Section title="Job description">
              {!isEditing ? (
                application.description ? (
                  <div className="max-h-[45vh] overflow-auto whitespace-pre-wrap">
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

            <Section title="Documents">
              <ApplicationDocumentsSection
                applicationId={application.id}
                open={open}
                isEditing={isEditing}
                onDocumentsChanged={onDocumentsChanged}
                activePreviewDocId={previewDocId}
                onPreviewRequested={handlePreviewRequest}
              />
            </Section>

            <Section title="AI">
              <span className="text-muted-foreground">
                Coming soon: summary, fit rating, and tailored docs.
              </span>
            </Section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
