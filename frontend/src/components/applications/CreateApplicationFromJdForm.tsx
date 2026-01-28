"use client";

import { useMemo, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { aiApi } from "@/lib/api/ai";
import { applicationsApi } from "@/lib/api/applications";
import type { ApplicationDraftResponse, ApplicationStatus, CreateApplicationRequest, JobType, WorkMode, DocumentKind, Connection } from "@/types/api";
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
import { ChevronDown, ChevronRight, Plus, Star, Trash2 } from "lucide-react";
import { ProAccessBanner } from "@/components/pro/ProAccessBanner";
import { RequestProDialog } from "@/components/pro/RequestProDialog";
import { useAuth } from "@/hooks/useAuth";
import { useConnectionAutocomplete } from "@/hooks/useConnectionAutocomplete";



export function CreateApplicationFromJdForm({ onCreated }: { onCreated: () => void }) {
  // Job description input + draft
  const [jdText, setJdText] = useState("");
  const [draft, setDraft] = useState<ApplicationDraftResponse | null>(null);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
  const [jobLink, setJobLink] = useState("");
  const [tagsText, setTagsText] = useState("");

  const [notes, setNotes] = useState("");

  const [isFavorite, setIsFavorite] = useState(false);

  // "More" section (attachments + connections to attach on create)
  const [showMore, setShowMore] = useState(false);

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

  const [isProDialogOpen, setIsProDialogOpen] = useState(false);

  function toOptionalTrimmed(value: string) {
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }

  const canGenerate = jdText.trim().length > 0 && !isGenerating && !isSubmitting;

  

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

  // Create application from draft
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!company.trim() || !position.trim()) {
      setErrorMessage("Company and position are required.");
      return;
    }

    const payload: CreateApplicationRequest = {
      company: company.trim(),
      position: position.trim(),

      status: applicationStatus,

      // Keep the “From JD” promise: store full JD
      description: jdText.trim(),

      // Prefilled from extracted.notes, user-editable
      notes: toOptionalTrimmed(notes),

      location: toOptionalTrimmed(location),
      locationDetails: toOptionalTrimmed(locationDetails),

      // Only send enums if not UNKNOWN (keeps payload clean)
      jobType: jobType === "UNKNOWN" ? undefined : jobType,
      jobTypeDetails: toOptionalTrimmed(jobTypeDetails),

      workMode: workMode === "UNKNOWN" ? undefined : workMode,
      workModeDetails: toOptionalTrimmed(workModeDetails),

      salaryText: toOptionalTrimmed(salaryText),
      jobLink: toOptionalTrimmed(jobLink),
      tagsText: toOptionalTrimmed(tagsText),

      isFavorite: isFavorite,

      // Match Manual behavior: if user flips to APPLIED, set dateApplied
      dateApplied: applicationStatus === "APPLIED" ? new Date().toISOString() : undefined,
    };

    try {
      setIsSubmitting(true);

      await applicationsApi.create(payload);

      // Reset to initial state
      resetToInitial();

      // Refresh list
      onCreated();
    } catch (err) {
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to create application.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
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

            <div className="space-y-2 md:col-span-4">
              <Label htmlFor="jobTypeDetails">Job Type Details</Label>
              <Input id="jobTypeDetails" value={jobTypeDetails} onChange={(e) => setJobTypeDetails(e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-4">
              <Label htmlFor="workModeDetails">Work Arrangement Details</Label>
              <Input
                id="workModeDetails"
                value={workModeDetails}
                onChange={(e) => setWorkModeDetails(e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-4">
              <Label htmlFor="locationDetails">Location Details</Label>
              <Input
                id="locationDetails"
                value={locationDetails}
                onChange={(e) => setLocationDetails(e.target.value)}
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

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create application"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
