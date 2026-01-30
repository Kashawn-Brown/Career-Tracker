"use client";

import { useMemo, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { applicationsApi } from "@/lib/api/applications";
import { applicationDocumentsApi } from "@/lib/api/application-documents";
import type { CreateApplicationRequest, ApplicationStatus, JobType, WorkMode, DocumentKind, Connection } from "@/types/api";
import { STATUS_OPTIONS, JOB_TYPE_OPTIONS, WORK_MODE_OPTIONS } from "@/lib/applications/presentation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Star, Trash2 } from "lucide-react";
import { useConnectionAutocomplete } from "@/hooks/useConnectionAutocomplete";

// CreateApplicationForm: Form to create a new application (POST /applications).
export function CreateApplicationForm({ onCreated }: { onCreated: () => void }) {

  // Form state
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");

  // New fields (table foundations)
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>("WISHLIST");
  const [isFavorite, setIsFavorite] = useState(false);
  const [jobType, setJobType] = useState<JobType>("UNKNOWN");
  const [workMode, setWorkMode] = useState<WorkMode>("UNKNOWN");
  const [salaryText, setSalaryText] = useState("");
  const [salaryDetails, setSalaryDetails] = useState("");

  const [location, setLocation] = useState("");
  const [locationDetails, setLocationDetails] = useState("");

  // Optional extra info (kept behind “More fields”)
  const [showMore, setShowMore] = useState(false);
  const [jobTypeDetails, setJobTypeDetails] = useState("");
  const [workModeDetails, setWorkModeDetails] = useState("");
  const [jobLink, setJobLink] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [tagsText, setTagsText] = useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  type UploadableDocKind = Exclude<DocumentKind, "BASE_RESUME">;
  type StagedDocument = { id: string; kind: UploadableDocKind; file: File };

  const DOC_KIND_OPTIONS: Array<{ value: UploadableDocKind; label: string }> = [
    { value: "RESUME", label: "Resume" },
    { value: "COVER_LETTER", label: "Cover Letter" },
    { value: "OTHER", label: "Other" },
  ];

  const [docKind, setDocKind] = useState<UploadableDocKind>("OTHER");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<StagedDocument[]>([]);

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


  // Helper functions to format form data for the API schema.
  function toOptionalTrimmed(value: string) {
    const trimmed = value.trim();

    // Return undefined if the trimmed string is empty.
    if (trimmed.length === 0) return undefined;
    return trimmed;
  }

  // Submitting Form (Add new application record)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();   // Prevent page refresh
    setErrorMessage(null);

    const stagedDocuments = [...documents];
    const stagedConnections = [...selectedConnections];


    // Simple validation
    if (!company.trim() || !position.trim()) {
      setErrorMessage("Company and position are required.");
      return;
    }

    // Build payload
    const payload: CreateApplicationRequest = {
      company: company.trim(),
      position: position.trim(),
      isFavorite: isFavorite,
      status: applicationStatus,
      // If status is APPLIED, set dateApplied automatically
      dateApplied: applicationStatus === "APPLIED" ? new Date().toISOString() : undefined,
      
      // Only send enums if not UNKNOWN (keeps payload clean; backend has defaults anyway)
      jobType: jobType === "UNKNOWN" ? undefined : jobType,
      workMode: workMode === "UNKNOWN" ? undefined : workMode,

      location: toOptionalTrimmed(location),
      locationDetails: toOptionalTrimmed(locationDetails),

      jobTypeDetails: toOptionalTrimmed(jobTypeDetails),
      workModeDetails: toOptionalTrimmed(workModeDetails),

      salaryText: toOptionalTrimmed(salaryText),
      salaryDetails: toOptionalTrimmed(salaryDetails),

      jobLink: toOptionalTrimmed(jobLink),
      description: toOptionalTrimmed(description),
      notes: toOptionalTrimmed(notes),
      tagsText: toOptionalTrimmed(tagsText),
    };

    try {
      setIsSubmitting(true);

      // Create application for the current user.
      const created = await applicationsApi.create(payload);

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

      const connResults = stagedConnections.length
        ? await Promise.allSettled(
            stagedConnections.map((c) =>
              applicationsApi.attachConnectionToApplication(created.id, c.id)
            )
          )
        : [];

      const failedDocs = docResults.filter((r) => r.status === "rejected").length;
      const failedConns = connResults.filter((r) => r.status === "rejected").length;


      // Reset form and refresh list.
      setCompany("");
      setPosition("");
      setIsFavorite(false);

      setLocation("");
      setLocationDetails("");

      setApplicationStatus("WISHLIST");

      setJobType("UNKNOWN");
      setWorkMode("UNKNOWN");
      setSalaryText("");

      setJobTypeDetails("");
      setWorkModeDetails("");
      setSalaryDetails("");

      setJobLink("");
      setDescription("");
      setNotes("");
      setTagsText("");

      setShowMore(false);

      setDocKind("OTHER");
      setDocFile(null);
      setDocuments([]);
      setConnectionQuery("");
      setSelectedConnections([]);

      onCreated();

      if (failedDocs || failedConns) {
        setErrorMessage(
          `Application created, but ${failedDocs ? `${failedDocs} document(s)` : ""}${
            failedDocs && failedConns ? " and " : ""
          }${failedConns ? `${failedConns} connection(s)` : ""} failed to attach.`
        );
      }      

    } catch (err) {
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to create application.");
      
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      {errorMessage ? <div className="text-sm text-red-600">{errorMessage}</div> : null}

      <div className="grid gap-x-6 gap-y-6 md:grid-cols-12">

        <div className="space-y-2 md:col-span-5">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company name"
          />
        </div>

        <div className="space-y-2 md:col-span-5">
          <Label htmlFor="position">Position</Label>
          <Input
            id="position"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="Role title"
          />
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
          <Select
            id="jobType"
            value={jobType}
            onChange={(e) => setJobType(e.target.value as JobType)}
          >
            {JOB_TYPE_OPTIONS.map((j) => (
              <option key={j.value} value={j.value}>
                {j.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2 md:col-span-4">
          <Label htmlFor="workMode">Work Arrangement</Label>
          <Select
            id="workMode"
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value as WorkMode)}
          >
            {WORK_MODE_OPTIONS.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2 md:col-span-4">
          <Label htmlFor="Status">Application Status</Label>
          <Select
            id="applicationStatus"
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
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Toronto, ON"
          />
        </div>

        <div className="space-y-2 md:col-span-6">
          <Label htmlFor="salaryText">Salary</Label>
          <Input
            id="salaryText"
            value={salaryText}
            onChange={(e) => setSalaryText(e.target.value)}
            placeholder='$90k–110k CAD, $55/hr, etc.'
          />
        </div>
      </div>

      <Button
        type="button"
        variant="link"
        className="px-0"
        onClick={() => setShowMore((v) => !v)}
      >
        {showMore ? "Hide extra fields" : "More fields"}
      </Button>

      {/* Show more fields if the user clicks the "More fields" button */}
      {showMore ? (
        <>
          <div className="grid gap-x-6 gap-y-6 md:grid-cols-12">
            
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="jobTypeDetails">Job Type Details</Label>
              <Input
                id="jobTypeDetails"
                value={jobTypeDetails}
                onChange={(e) => setJobTypeDetails(e.target.value)}
                placeholder="e.g., 6-month contract"
              />
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="workModeDetails">Work Arrangement Details</Label>
              <Input
                id="workModeDetails"
                value={workModeDetails}
                onChange={(e) => setWorkModeDetails(e.target.value)}
                placeholder="e.g., 2 days in office"
              />
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="locationDetails">Location Details</Label>
              <Input
                id="locationDetails"
                value={locationDetails}
                onChange={(e) => setLocationDetails(e.target.value)}
                placeholder="e.g., 159 St. George St."
              />
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="salaryDetails">Salary Details</Label>
              <Input
                id="salaryDetails"
                value={salaryDetails}
                onChange={(e) => setSalaryDetails(e.target.value)}
                placeholder="Annual bonus, stock options, etc."
              />
            </div>
          </div>

          <div className="grid gap-x-6 gap-y-6 md:grid-cols-12 mt-8">
            
            {/* Job link + tags (stacked in the other half) */}
            <div className="md:col-span-6 grid gap-y-6">
              <div className="space-y-2">
                <Label htmlFor="jobLink">Job Link</Label>
                <Input
                  id="jobLink"
                  value={jobLink}
                  onChange={(e) => setJobLink(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagsText">Tags</Label>
                <Input
                  id="tagsText"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="e.g., Backend, Java, Remote"
                />
              </div>
            </div>

            {/* Notes (half width) */}
            <div className="space-y-2 md:col-span-6">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[136px]"
                placeholder="Anything important to remember about this role..."
              />
            </div>

            {/* Job description (full width) */}
            <div className="space-y-2 md:col-span-12">
              <Label htmlFor="description">Job Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[180px]"
                placeholder="Paste the job description here..."
              />
            </div>
          </div>
          
          <div className="grid gap-x-6 gap-y-6 md:grid-cols-14 mt-8">
            {/* Documents: add */}
            <div className="space-y-3 rounded-md border p-3 md:col-span-4">
              <div className="text-sm font-medium">Documents</div>

              <div className="space-y-2">
                <Label htmlFor="docKind">Document type</Label>
                <Select id="docKind" value={docKind} onChange={(e) => setDocKind(e.target.value as UploadableDocKind)}>
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
                {docFile ? <div className="text-xs text-muted-foreground truncate">Selected: {docFile.name}</div> : null}
              </div>

              <Button type="button" onClick={addDocument} disabled={!docFile} className="w-full">
                Add document
              </Button>
            </div>

            {/* Documents: staged */}
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

            {/* Connections: search */}
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

            {/* Connections: selected */}
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
        </>
      ) : null}
      
      <div className="flex justify-end mt-8">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Adding..." : "Add application"}
        </Button>
      </div>
    </form>
  );
}
