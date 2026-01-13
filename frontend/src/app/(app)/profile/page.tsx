"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type { MeResponse, UpdateMeRequest } from "@/types/api";
import { useAuth } from "@/hooks/useAuth";
import { ProfileConnectionsCard } from "@/components/profile/ProfileConnectionsCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { documentsApi } from "@/lib/api/documents";
import { Alert } from "@/components/ui/alert";
import type { Document, WorkMode } from "@/types/api";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { workModeLabel } from "@/lib/applications/presentation";

// ProfilePage: view + edit minimal profile fields via GET/PATCH /users/me.
export default function ProfilePage() {

  // Pulling from auth context
  const { user, setCurrentUser } = useAuth();

  // baseResume: current BASE_RESUME document metadata (null means none saved yet).
  const [baseResume, setBaseResume] = useState<Document | null>(null);

  // Resume file state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const resumeFileInputRef = useRef<HTMLInputElement | null>(null);

  const [isResumeSaving, setIsResumeSaving] = useState(false);
  const [isResumeDeleting, setIsResumeDeleting] = useState(false);

  // Profile edit mode: prevents accidental edits
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Base resume edit mode: avoids accidental edits
  const [isEditingResume, setIsEditingResume] = useState(false);

  // Local component state (profile fields)
  const [name, setName] = useState(user?.name ?? "");
  const [location, setLocation] = useState(user?.location ?? "");
  const [currentRole, setCurrentRole] = useState(user?.currentRole ?? "");
  const [currentCompany, setCurrentCompany] = useState(user?.currentCompany ?? "");
  const [skillsInput, setSkillsInput] = useState((user?.skills ?? []).join(", "));
  const [linkedInUrl, setLinkedInUrl] = useState(user?.linkedInUrl ?? "");
  const [githubUrl, setGithubUrl] = useState(user?.githubUrl ?? "");
  const [portfolioUrl, setPortfolioUrl] = useState(user?.portfolioUrl ?? "");

  // Job search preferences edit mode
  const [isEditingJobSearch, setIsEditingJobSearch] = useState(false);
  const [isJobSearchSaving, setIsJobSearchSaving] = useState(false);

  const [jobSearchTitlesText, setJobSearchTitlesText] = useState(user?.jobSearchTitlesText ?? "");
  const [jobSearchLocationsText, setJobSearchLocationsText] = useState(user?.jobSearchLocationsText ?? "");
  const [jobSearchKeywordsText, setJobSearchKeywordsText] = useState(user?.jobSearchKeywordsText ?? "");
  const [jobSearchSummary, setJobSearchSummary] = useState(user?.jobSearchSummary ?? "");
  const [jobSearchWorkMode, setJobSearchWorkMode] = useState<WorkMode>(user?.jobSearchWorkMode ?? "UNKNOWN");

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resumeErrorMessage, setResumeErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isJobSearchDialogOpen, setIsJobSearchDialogOpen] = useState(false);
  const [isResumeDialogOpen, setIsResumeDialogOpen] = useState(false);

  // Helpers
  function toDisplayString(x: string | null | undefined) {
    return x ?? "";
  }

  function parseSkills(input: string): string[] {
    // Comma-separated list → trimmed array; drops empties; de-dupes.
    const items = input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    return Array.from(new Set(items));
  }

  function arraysEqual(a: string[], b: string[]) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }

  function safeDocId(doc: Document): number {
    const raw = doc.id;
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : -1;
  }

  // Loading the profile on mount (& depending on setCurrentUser)
  useEffect(() => {
    async function load() {
      setErrorMessage(null);
      setResumeErrorMessage(null);
      setSuccessMessage(null);

      try {
        
        // Fetch freshest user data for profile screen.
        const res = await apiFetch<MeResponse>(routes.users.me(), { method: "GET" });
        
        setCurrentUser(res.user);
        
        // Hydrate local form state from API response (source of truth).
        setName(res.user.name ?? "");
        setLocation(toDisplayString(res.user.location));
        setCurrentRole(toDisplayString(res.user.currentRole));
        setCurrentCompany(toDisplayString(res.user.currentCompany));
        setSkillsInput((res.user.skills ?? []).join(", "));
        setLinkedInUrl(toDisplayString(res.user.linkedInUrl));
        setGithubUrl(toDisplayString(res.user.githubUrl));
        setPortfolioUrl(toDisplayString(res.user.portfolioUrl));
        setJobSearchTitlesText(toDisplayString(res.user.jobSearchTitlesText));
        setJobSearchLocationsText(toDisplayString(res.user.jobSearchLocationsText));
        setJobSearchKeywordsText(toDisplayString(res.user.jobSearchKeywordsText));
        setJobSearchSummary(toDisplayString(res.user.jobSearchSummary));
        setJobSearchWorkMode(res.user.jobSearchWorkMode ?? "UNKNOWN");

        
        // Load base resume metadata for the logged-in user.
        try { // It's own try/catch block so it does not block profile load even if resume load fails 
          const resumeRes = await documentsApi.getBaseResume();
          setBaseResume(resumeRes.baseResume);
          setIsEditingResume(!resumeRes.baseResume); // if none exists, go straight to edit mode


        } catch(err) {
          
          // Resume load failed: keep profile usable, show resume-only error message
          setBaseResume(null);
          setIsEditingResume(true); // if we can't load, allow user to enter a resume anyway

          if (err instanceof ApiError) setResumeErrorMessage(err.message);
          else setResumeErrorMessage("Failed to load base resume.")
        }

      } catch (err) {
        if (err instanceof ApiError) setErrorMessage(err.message);
        else setErrorMessage("Failed to load profile.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [setCurrentUser]);

  // Starts the profile edit mode.
  function startProfileEdit() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsEditingProfile(true);
  }

  // Cancels the profile edit mode.
  function cancelProfileEdit() {
    // Cancel = revert local form state back to last saved user values
    setName(user?.name ?? "");
    setLocation(toDisplayString(user?.location));
    setCurrentRole(toDisplayString(user?.currentRole));
    setCurrentCompany(toDisplayString(user?.currentCompany));
    setSkillsInput((user?.skills ?? []).join(", "));
    setLinkedInUrl(toDisplayString(user?.linkedInUrl));
    setGithubUrl(toDisplayString(user?.githubUrl));
    setPortfolioUrl(toDisplayString(user?.portfolioUrl));
    
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsEditingProfile(false);
  }

  // Saving profile changes
  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Name is required.");
      return;
    }

    const payload: UpdateMeRequest = {};

    // Only send fields that changed (keeps updates intentional)
    if (trimmedName !== (user?.name ?? "")) payload.name = trimmedName;

    if (location !== toDisplayString(user?.location)) payload.location = location;
    if (currentRole !== toDisplayString(user?.currentRole)) payload.currentRole = currentRole;
    if (currentCompany !== toDisplayString(user?.currentCompany)) payload.currentCompany = currentCompany;

    const nextSkills = parseSkills(skillsInput);
    const currentSkills = user?.skills ?? [];
    if (!arraysEqual(nextSkills, currentSkills)) payload.skills = nextSkills;

    if (linkedInUrl !== toDisplayString(user?.linkedInUrl)) payload.linkedInUrl = linkedInUrl;
    if (githubUrl !== toDisplayString(user?.githubUrl)) payload.githubUrl = githubUrl;
    if (portfolioUrl !== toDisplayString(user?.portfolioUrl)) payload.portfolioUrl = portfolioUrl;

    if (Object.keys(payload).length === 0) {
      setErrorMessage("No changes.");
      return;
    }

    try {
      setIsSaving(true);

      // Save profile changes.
      const res = await apiFetch<MeResponse>(routes.users.me(), {
        method: "PATCH",
        body: payload,
      });

      // Sync auth state so header updates immediately.
      setCurrentUser(res.user);

      // Update local form state to match the saved result.
      setName(res.user.name ?? "");
      setLocation(toDisplayString(res.user.location));
      setCurrentRole(toDisplayString(res.user.currentRole));
      setCurrentCompany(toDisplayString(res.user.currentCompany));
      setSkillsInput((res.user.skills ?? []).join(", "));
      setLinkedInUrl(toDisplayString(res.user.linkedInUrl));
      setGithubUrl(toDisplayString(res.user.githubUrl));
      setPortfolioUrl(toDisplayString(res.user.portfolioUrl));

      setIsEditingProfile(false);
      setSuccessMessage("Saved.");
    } catch (err) {
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  }


  // Starts the base resume edit mode.
  function startResumeEdit() {
    setResumeErrorMessage(null);
    setSuccessMessage(null);
    setResumeFile(null);
    if (resumeFileInputRef.current) resumeFileInputRef.current.value = "";
    setIsEditingResume(true);
  }
  
  // Cancels the base resume edit mode.
  function cancelResumeEdit() {
    setResumeFile(null);
    if (resumeFileInputRef.current) resumeFileInputRef.current.value = "";
    setResumeErrorMessage(null);
    setSuccessMessage(null);
    setIsEditingResume(false);
  }

  // Opens the base resume in a new tab.
  async function handleResumeOpen() {
    if (!baseResume) return;
  
    const id = safeDocId(baseResume);
    if (id < 0) {
      setResumeErrorMessage("Invalid resume id.");
      return;
    }
  
    try {
      setResumeErrorMessage(null);
      const res = await documentsApi.getDownloadUrl(id);
      window.open(res.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      if (err instanceof ApiError) setResumeErrorMessage(err.message);
      else setResumeErrorMessage("Failed to open resume.");
    }
  }

  // Saves/replaces the base resume file.
  async function handleResumeSave(e: React.FormEvent) {
    e.preventDefault();
    setResumeErrorMessage(null);
    setSuccessMessage(null);
  
    if (!resumeFile) {
      setResumeErrorMessage("Choose a file to upload.");
      return;
    }
  
    try {
      setIsResumeSaving(true);
  
      const res = await documentsApi.upsertBaseResume(resumeFile);
  
      setBaseResume(res.baseResume);
      setResumeFile(null);
      if (resumeFileInputRef.current) resumeFileInputRef.current.value = "";
  
      setIsEditingResume(false);
      setSuccessMessage("Base resume saved.");
      setIsResumeDialogOpen(false);
    } catch (err) {
      if (err instanceof ApiError) setResumeErrorMessage(err.message);
      else setResumeErrorMessage("Failed to save base resume.");
    } finally {
      setIsResumeSaving(false);
    }
  }
  

  // Deletes the base resume file.
  async function handleResumeDelete() {
    if (!baseResume || isResumeSaving) return;
  
    const confirmed = window.confirm(
      "Delete your base resume?\n\nThis removes the saved resume and deletes the stored file."
    );
    if (!confirmed) return;
  
    setResumeErrorMessage(null);
    setSuccessMessage(null);
  
    try {
      setIsResumeDeleting(true);
  
      await documentsApi.deleteBaseResume();
      setBaseResume(null);
  
      setResumeFile(null);
      if (resumeFileInputRef.current) resumeFileInputRef.current.value = "";
  
      setIsEditingResume(true);
      setSuccessMessage("Base resume deleted.");
      setIsResumeDialogOpen(false);
    } catch (err) {
      if (err instanceof ApiError) setResumeErrorMessage(err.message);
      else setResumeErrorMessage("Failed to delete base resume.");
    } finally {
      setIsResumeDeleting(false);
    }
  }


  // Handles the resume dialog open state changes.
  function handleResumeDialogOpenChange(nextOpen: boolean) {
    setIsResumeDialogOpen(nextOpen);

    if (nextOpen) {
      // If no resume exists, go straight to edit mode (matches your current UX).
      setIsEditingResume(!baseResume);
      return;
    }

    // Closing discards any unsaved edits.
    if (isEditingResume) cancelResumeEdit();
    else setIsEditingResume(false);
  }



  // Starts the job search preferences edit mode.
  function startJobSearchEdit() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsEditingJobSearch(true);
  }

  // Cancels the job search preferences edit mode.
  function cancelJobSearchEdit() {
    setJobSearchTitlesText(toDisplayString(user?.jobSearchTitlesText));
    setJobSearchLocationsText(toDisplayString(user?.jobSearchLocationsText));
    setJobSearchKeywordsText(toDisplayString(user?.jobSearchKeywordsText));
    setJobSearchSummary(toDisplayString(user?.jobSearchSummary));
    setJobSearchWorkMode(user?.jobSearchWorkMode ?? "UNKNOWN");

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsEditingJobSearch(false);
  }

  // Saves the job search preferences.
  async function handleJobSearchSave(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload: UpdateMeRequest = {};

    if (jobSearchTitlesText !== toDisplayString(user?.jobSearchTitlesText)) {
      payload.jobSearchTitlesText = jobSearchTitlesText;
    }
    if (jobSearchLocationsText !== toDisplayString(user?.jobSearchLocationsText)) {
      payload.jobSearchLocationsText = jobSearchLocationsText;
    }
    if (jobSearchKeywordsText !== toDisplayString(user?.jobSearchKeywordsText)) {
      payload.jobSearchKeywordsText = jobSearchKeywordsText;
    }
    if (jobSearchSummary !== toDisplayString(user?.jobSearchSummary)) {
      payload.jobSearchSummary = jobSearchSummary;
    }

    const currentMode = user?.jobSearchWorkMode ?? "UNKNOWN";
    if (jobSearchWorkMode !== currentMode) {
      payload.jobSearchWorkMode = jobSearchWorkMode;
    }

    if (Object.keys(payload).length === 0) {
      setErrorMessage("No changes.");
      return;
    }

    try {
      setIsJobSearchSaving(true);

      const res = await apiFetch<MeResponse>(routes.users.me(), {
        method: "PATCH",
        body: payload,
      });

      setCurrentUser(res.user);

      // sync local state to saved values
      setJobSearchTitlesText(toDisplayString(res.user.jobSearchTitlesText));
      setJobSearchLocationsText(toDisplayString(res.user.jobSearchLocationsText));
      setJobSearchKeywordsText(toDisplayString(res.user.jobSearchKeywordsText));
      setJobSearchSummary(toDisplayString(res.user.jobSearchSummary));
      setJobSearchWorkMode(res.user.jobSearchWorkMode ?? "UNKNOWN");

      setIsEditingJobSearch(false);
      setSuccessMessage("Saved.");
      setIsJobSearchDialogOpen(false);

    } catch (err) {
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to save job search preferences.");
    } finally {
      setIsJobSearchSaving(false);
    }
  }


  // Handles the job search dialog open state changes.
  function handleJobSearchDialogOpenChange(nextOpen: boolean) {
    setIsJobSearchDialogOpen(nextOpen);
  
    // Always open in view-mode (editing is intentional).
    if (nextOpen) {
      setIsEditingJobSearch(false);
      return;
    }
  
    // If user closes while editing, discard unsaved changes safely.
    if (isEditingJobSearch) {
      cancelJobSearchEdit();
    } else {
      setIsEditingJobSearch(false);
    }
  }
  
  const hasMessages = !!(errorMessage || resumeErrorMessage || successMessage);

  // TODO: If base resume exists, switch to 2-col layout and render first-page preview thumbnail.


  if (isLoading) {
    return (
      <div className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
            Loading profile...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        {hasMessages ? (
          <div className="space-y-2">
            {errorMessage ? <Alert variant="destructive">{errorMessage}</Alert> : null}
            {resumeErrorMessage ? <Alert variant="warning">{resumeErrorMessage}</Alert> : null}
            {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
          
          {/* Left: Profile section */}
          <div className="lg:col-span-7">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                  Signed in as <span className="font-medium">{user?.email}</span>
                </CardDescription>

                {/* Profile edit mode: show edit button */}
                {!isEditingProfile ? (
                    <CardAction>
                      <Button type="button" variant="outline" size="sm" onClick={startProfileEdit}>
                        Edit
                      </Button>
                    </CardAction>
                  ) : null}
                </CardHeader>

                <CardContent className="space-y-4">
                <form className="space-y-4" onSubmit={handleProfileSave}>
                  <div className="space-y-1">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      readOnly={!isEditingProfile}
                      className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="..."
                      readOnly={!isEditingProfile}
                      className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="currentCompany">Current company</Label>
                    <Input
                      id="currentCompany"
                      value={currentCompany}
                      onChange={(e) => setCurrentCompany(e.target.value)}
                      placeholder="..."
                      readOnly={!isEditingProfile}
                      className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="currentRole">Current role</Label>
                    <Input
                      id="currentRole"
                      value={currentRole}
                      onChange={(e) => setCurrentRole(e.target.value)}
                      placeholder="..."
                      readOnly={!isEditingProfile}
                      className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="skills">Skills (comma-separated)</Label>
                    <Input
                      id="skills"
                      value={skillsInput}
                      onChange={(e) => setSkillsInput(e.target.value)}
                      placeholder="..."
                      readOnly={!isEditingProfile}
                      className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="linkedInUrl">LinkedIn URL</Label>
                    <Input
                      id="linkedInUrl"
                      value={linkedInUrl}
                      onChange={(e) => setLinkedInUrl(e.target.value)}
                      placeholder="..."
                      readOnly={!isEditingProfile}
                      className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="githubUrl">GitHub URL</Label>
                    <Input
                      id="githubUrl"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="..."
                      readOnly={!isEditingProfile}
                      className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="portfolioUrl">Portfolio URL</Label>
                    <Input
                      id="portfolioUrl"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="..."
                      readOnly={!isEditingProfile}
                      className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                    />
                  </div>

                  {isEditingProfile ? (
                    <div className="flex gap-2">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save"}
                      </Button>

                      <Button type="button" variant="outline" onClick={cancelProfileEdit} disabled={isSaving}>
                        Cancel
                      </Button>
                    </div>
                  ) : null}
                </form>
              </CardContent>
            </Card>
          </div>
        

          {/* Right: secondary cards stacked */}
          <div className="space-y-6 lg:col-span-5">
            {/* Job search preferences section */}
            <Card>
              <CardHeader>
                <CardTitle>Job Search Preferences</CardTitle>
                <CardDescription>
                  Used later for AI tailoring (titles, locations, keywords, preferred arrangement).
                </CardDescription>

                <CardAction>
                  <Dialog open={isJobSearchDialogOpen} onOpenChange={handleJobSearchDialogOpenChange}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        View / Edit
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="max-w-2xl">
                      <div className="flex items-start justify-between gap-4">
                        <DialogHeader>
                          <DialogTitle>Job Search Preferences</DialogTitle>
                          <DialogDescription>
                            View first. Click Edit to make changes, then Save to persist.
                          </DialogDescription>
                        </DialogHeader>

                        {!isEditingJobSearch ? (
                          <Button type="button" variant="outline" size="sm" onClick={startJobSearchEdit}>
                            Edit
                          </Button>
                        ) : null}
                      </div>

                      <form className="mt-4 space-y-4" onSubmit={handleJobSearchSave}>
                        <div className="space-y-1">
                          <Label htmlFor="jobSearchTitlesText">Target titles (comma-separated)</Label>
                          <Input
                            id="jobSearchTitlesText"
                            value={jobSearchTitlesText}
                            onChange={(e) => setJobSearchTitlesText(e.target.value)}
                            placeholder="e.g., Backend Engineer, SRE, DevOps, ..."
                            readOnly={!isEditingJobSearch}
                            className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="jobSearchLocationsText">Preferred locations (comma-separated)</Label>
                          <Input
                            id="jobSearchLocationsText"
                            value={jobSearchLocationsText}
                            onChange={(e) => setJobSearchLocationsText(e.target.value)}
                            placeholder="e.g., Toronto, USA, Ottawa, ..."
                            readOnly={!isEditingJobSearch}
                            className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="jobSearchWorkMode">Preferred work arrangement</Label>
                          <Select
                            id="jobSearchWorkMode"
                            value={jobSearchWorkMode}
                            onChange={(e) => setJobSearchWorkMode(e.target.value as WorkMode)}
                            disabled={!isEditingJobSearch}
                          >
                            <option value="UNKNOWN">Any</option>
                            <option value="REMOTE">Remote</option>
                            <option value="HYBRID">Hybrid</option>
                            <option value="ONSITE">On-site</option>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="jobSearchKeywordsText">Keywords (comma-separated)</Label>
                          <Input
                            id="jobSearchKeywordsText"
                            value={jobSearchKeywordsText}
                            onChange={(e) => setJobSearchKeywordsText(e.target.value)}
                            placeholder="e.g., AWS, Kubernetes, Terraform, Java, ..."
                            readOnly={!isEditingJobSearch}
                            className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="jobSearchSummary">Short summary</Label>
                          <Textarea
                            id="jobSearchSummary"
                            value={jobSearchSummary}
                            onChange={(e) => setJobSearchSummary(e.target.value)}
                            placeholder="A few lines about what you’re targeting and what you’re strong at..."
                            readOnly={!isEditingJobSearch}
                            className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                          />
                        </div>

                        {isEditingJobSearch ? (
                          <div className="flex items-center justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={cancelJobSearchEdit}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={isJobSearchSaving}>
                              {isJobSearchSaving ? "Saving..." : "Save"}
                            </Button>
                          </div>
                        ) : null}
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardAction>
              </CardHeader>

              {/* Compact summary (keeps page from being a long stack of forms) */}
              <CardContent className="space-y-2 text-sm">
                <div className="grid gap-1">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Work arrangement</span>
                    <span className="truncate font-medium">
                      {jobSearchWorkMode === "UNKNOWN" ? "Any" : workModeLabel(jobSearchWorkMode)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Titles</span>
                    <span className="truncate font-medium" title={jobSearchTitlesText}>
                      {jobSearchTitlesText.trim() ? jobSearchTitlesText : "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Locations</span>
                    <span className="truncate font-medium" title={jobSearchLocationsText}>
                      {jobSearchLocationsText.trim() ? jobSearchLocationsText : "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Keywords</span>
                    <span className="truncate font-medium" title={jobSearchKeywordsText}>
                      {jobSearchKeywordsText.trim() ? jobSearchKeywordsText : "—"}
                    </span>
                  </div>
                </div>

                <div className="text-muted-foreground">
                  {jobSearchSummary.trim() ? jobSearchSummary : "No summary set yet."}
                </div>
              </CardContent>
            </Card>


            {/* Connections section */}
            <ProfileConnectionsCard />

            {/* Base resume section */}
            <Card>
              <CardHeader>
                <CardTitle>Base Resume</CardTitle>
                <CardDescription>
                  Upload your current resume once, then reuse it across applications.
                </CardDescription>

                <CardAction>
                  <Dialog open={isResumeDialogOpen} onOpenChange={handleResumeDialogOpenChange}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        View / Edit
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="max-w-2xl">
                      <div className="flex items-start justify-between gap-4">
                        <DialogHeader>
                          <DialogTitle>Base Resume</DialogTitle>
                          <DialogDescription>
                            Click Edit to replace. Delete removes the saved resume.
                          </DialogDescription>
                        </DialogHeader>

                        <div className="flex gap-2">
                          {baseResume && !isEditingResume ? (
                            <Button type="button" variant="outline" size="sm" onClick={handleResumeOpen}>
                              Open
                            </Button>
                          ) : null}

                          {!isEditingResume ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={startResumeEdit}
                              disabled={!baseResume}
                            >
                              Edit
                            </Button>
                          ) : null}

                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={handleResumeDelete}
                            disabled={!baseResume || isResumeDeleting}
                          >
                            {isResumeDeleting ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 text-sm text-muted-foreground">
                        {baseResume ? (
                          <>
                            Current: <span className="font-medium">{baseResume.originalName}</span>
                          </>
                        ) : (
                          "No base resume saved yet."
                        )}
                      </div>

                      <form className="mt-4 space-y-4" onSubmit={handleResumeSave}>
                        <div className="space-y-1">
                          <Label htmlFor="resumeFile">Resume file</Label>
                          <Input
                            id="resumeFile"
                            ref={resumeFileInputRef}
                            type="file"
                            accept=".pdf,.txt,application/pdf,text/plain"
                            disabled={!isEditingResume}
                            onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                          />
                          <div className="text-xs text-muted-foreground">Accepted: PDF, TXT • up to 10MB</div>
                        </div>

                        {isEditingResume ? (
                          <div className="flex items-center justify-end gap-2 pt-2">
                            {baseResume ? (
                              <Button type="button" variant="outline" onClick={cancelResumeEdit} disabled={isResumeSaving}>
                                Cancel
                              </Button>
                            ) : null}

                            <Button type="submit" disabled={isResumeSaving || !resumeFile}>
                              {isResumeSaving
                                ? "Saving..."
                                : baseResume
                                ? "Replace base resume"
                                : "Save base resume"}
                            </Button>
                          </div>
                        ) : null}
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardAction>
              </CardHeader>

              <CardContent className="text-sm text-muted-foreground">
                {baseResume ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate">
                      Current: <span className="font-medium">{baseResume.originalName}</span>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleResumeOpen}>
                      Open
                    </Button>
                  </div>
                ) : (
                  "No base resume saved yet."
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>

  );
}

