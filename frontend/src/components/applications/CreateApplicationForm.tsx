"use client";

import { useState } from "react";
import { ApiError, apiFetch } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type { CreateApplicationRequest, ApplicationStatus, JobType, WorkMode } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

// CreateApplicationForm: MVP form to create a new application (POST /applications).
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
      await apiFetch(routes.applications.list(), {
        method: "POST",
        body: payload,
      });

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

        {/* Keep these “table-foundation” fields visible but not overwhelming */}
        <div className="space-y-1">
          <Label htmlFor="jobType">Job type</Label>
          <Select
            id="jobType"
            value={jobType}
            onChange={(e) => setJobType(e.target.value as JobType)}
          >
            <option value="UNKNOWN">-</option>
            <option value="FULL_TIME">Full-time</option>
            <option value="PART_TIME">Part-time</option>
            <option value="CONTRACT">Contract</option>
            <option value="INTERNSHIP">Internship</option>
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
          <Label htmlFor="workMode">Work mode</Label>
          <Select
            id="workMode"
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value as WorkMode)}
          >
            <option value="UNKNOWN">-</option>
            <option value="REMOTE">Remote</option>
            <option value="HYBRID">Hybrid</option>
            <option value="ONSITE">On-site</option>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="Status">Application Status</Label>
          <Select
            id="applicationStatus"
            value={applicationStatus}
            onChange={(e) => setApplicationStatus(e.target.value as ApplicationStatus)}
          >
            <option value="WISHLIST">Wishlist</option>
            <option value="APPLIED">Applied</option>
            <option value="INTERVIEW">Interview</option>
            <option value="OFFER">Offer</option>
            <option value="REJECTED">Rejected</option>
            <option value="WITHDRAWN">Withdrawn</option>
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
            <Label htmlFor="workModeDetails">Work Mode Details</Label>
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
