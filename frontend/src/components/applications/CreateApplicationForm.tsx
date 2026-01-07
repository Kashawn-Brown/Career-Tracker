"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import { applicationsApi } from "@/lib/api/applications";
import type { CreateApplicationRequest, ApplicationStatus, JobType, WorkMode } from "@/types/api";
import { STATUS_OPTIONS, JOB_TYPE_OPTIONS, WORK_MODE_OPTIONS } from "@/lib/applications/presentation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

// CreateApplicationForm: Form to create a new application (POST /applications).
export function CreateApplicationForm({ onCreated }: { onCreated: () => void }) {

  // Form state
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");

  // New fields (table foundations)
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>("WISHLIST");
  
  const [jobType, setJobType] = useState<JobType>("UNKNOWN");
  const [workMode, setWorkMode] = useState<WorkMode>("UNKNOWN");
  const [salaryText, setSalaryText] = useState("");

  // Optional extra info (kept behind “More fields”)
  const [showMore, setShowMore] = useState(false);
  const [jobTypeDetails, setJobTypeDetails] = useState("");
  const [workModeDetails, setWorkModeDetails] = useState("");
  const [jobLink, setJobLink] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

    // Simple validation
    if (!company.trim() || !position.trim()) {
      setErrorMessage("Company and position are required.");
      return;
    }

    // Build payload
    const payload: CreateApplicationRequest = {
      company: company.trim(),
      position: position.trim(),
      
      status: applicationStatus,
      // If status is APPLIED, set dateApplied automatically
      dateApplied: applicationStatus === "APPLIED" ? new Date().toISOString() : undefined,
      
      // Only send enums if not UNKNOWN (keeps payload clean; backend has defaults anyway)
      jobType: jobType === "UNKNOWN" ? undefined : jobType,
      workMode: workMode === "UNKNOWN" ? undefined : workMode,

      jobTypeDetails: toOptionalTrimmed(jobTypeDetails),
      workModeDetails: toOptionalTrimmed(workModeDetails),

      salaryText: toOptionalTrimmed(salaryText),

      jobLink: toOptionalTrimmed(jobLink),
      description: toOptionalTrimmed(description),
      notes: toOptionalTrimmed(notes),
    };

    try {
      setIsSubmitting(true);

      // Create application for the current user.
      await applicationsApi.create(payload);

      // Reset form and refresh list.
      setCompany("");
      setPosition("");

      setApplicationStatus("WISHLIST");

      setJobType("UNKNOWN");
      setWorkMode("UNKNOWN");
      setSalaryText("");

      setJobTypeDetails("");
      setWorkModeDetails("");
      setJobLink("");
      setDescription("");
      setNotes("");

      setShowMore(false);
      onCreated();

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

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company name"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="position">Position</Label>
          <Input
            id="position"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="Role title"
          />
        </div>

        <div className="space-y-1">
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

        <div className="space-y-1">
          <Label htmlFor="salaryText">Salary</Label>
          <Input
            id="salaryText"
            value={salaryText}
            onChange={(e) => setSalaryText(e.target.value)}
            placeholder='$90k–110k CAD, $55/hr, etc.'
          />
        </div>

        <div className="space-y-1">
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

        <div className="space-y-1">
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
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="jobTypeDetails">Job Type Details</Label>
            <Input
              id="jobTypeDetails"
              value={jobTypeDetails}
              onChange={(e) => setJobTypeDetails(e.target.value)}
              placeholder="e.g., 6-month contract"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="workModeDetails">Work Arrangement Details</Label>
            <Input
              id="workModeDetails"
              value={workModeDetails}
              onChange={(e) => setWorkModeDetails(e.target.value)}
              placeholder="e.g., 2 days in office"
            />
          </div>
        </div>
      ) : null}
      
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Adding..." : "Add application"}
        </Button>
      </div>
    </form>
  );
}
