"use client";

import { useMemo, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { aiApi } from "@/lib/api/ai";
import { applicationsApi } from "@/lib/api/applications";
import type { ApplicationDraftResponse, ApplicationStatus, CreateApplicationRequest, JobType, WorkMode, } from "@/types/api";
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
import { ChevronDown, ChevronRight } from "lucide-react";

export function CreateApplicationFromJdForm({ onCreated }: { onCreated: () => void }) {
  // Job description input + draft
  const [jdText, setJdText] = useState("");
  const [draft, setDraft] = useState<ApplicationDraftResponse | null>(null);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showMore, setShowMore] = useState(false);
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

  function toOptionalTrimmed(value: string) {
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }

  const canGenerate = jdText.trim().length > 0 && !isGenerating && !isSubmitting;

  const extractedNotesText = useMemo(() => {
    const bullets = draft?.extracted.notes ?? [];
    // Keep the “pseudo list” feel in a plain textarea
    return bullets.map((s) => `- ${s}`).join("\n");
  }, [draft]);

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

      // Match Manual behavior: if user flips to APPLIED, set dateApplied
      dateApplied: applicationStatus === "APPLIED" ? new Date().toISOString() : undefined,
    };

    try {
      setIsSubmitting(true);

      await applicationsApi.create(payload);

      // Reset + refresh
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
      setShowMore(false);
      setShowSummary(false);

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

      <div className="space-y-2">
        <Label htmlFor="jd">Job description</Label>
        <Textarea
          id="jd"
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder={`Paste the full job description here...  We'll extract the relevant information for you!`}
          className="min-h-[140px]"
        />
        <div className="flex justify-end mt-4">
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
              <Button type="button" variant="outline" className="w-full justify-between">
                Summary
                {showSummary ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <Alert variant="muted" className="font-medium">{draft.ai.jdSummary}</Alert>
            </CollapsibleContent>
          </Collapsible>

          {/* Editable extracted fields */}
          <div className="grid gap-x-6 gap-y-6 md:grid-cols-12">
            <div className="space-y-2 md:col-span-6">
              <Label htmlFor="company">Company</Label>
              <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-6">
              <Label htmlFor="position">Position</Label>
              <Input id="position" value={position} onChange={(e) => setPosition(e.target.value)} />
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
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[120px]" />
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
