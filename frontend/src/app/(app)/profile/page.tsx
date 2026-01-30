"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type { MeResponse, UpdateMeRequest } from "@/types/api";
import { useAuth } from "@/hooks/useAuth";
import { AccountSecurityDialog } from "@/components/profile/AccountSecurityDialog";
import { ProfileProAccessCard } from "@/components/profile/ProfileProAccessCard";
import { UserProfileCard } from "@/components/profile/UserProfileCard";
import { JobSearchPreferencesCard } from "@/components/profile/JobSearchPreferencesCard";
import { ProfileConnectionsCard } from "@/components/profile/ProfileConnectionsCard";
import { BaseResumeCard } from "@/components/profile/BaseResumeCard";
import { documentsApi } from "@/lib/api/documents";
import { Alert } from "@/components/ui/alert";
import type { Document, WorkMode } from "@/types/api";

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
  
  // Cancels the base resume edit mode.
  function cancelResumeEdit() {
    setResumeFile(null);
    if (resumeFileInputRef.current) resumeFileInputRef.current.value = "";
    setResumeErrorMessage(null);
    setSuccessMessage(null);
    setIsEditingResume(false);
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
  
      const res = await documentsApi.uploadBaseResume(resumeFile);
  
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

  async function handleResumeDownload() {
    if (!baseResume) return;
  
    const id =
      typeof baseResume.id === "string" ? Number(baseResume.id) : baseResume.id;
  
    if (!Number.isFinite(id)) {
      setResumeErrorMessage("Invalid resume id.");
      return;
    }
  
    try {
      const res = await documentsApi.getDownloadUrl(id, { disposition: "attachment" });
      window.open(res.downloadUrl, "_blank");
    } catch (err) {
      if (err instanceof ApiError) setResumeErrorMessage(err.message);
      else setResumeErrorMessage("Failed to download base resume.");
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
  
  const hasMessages = !!(errorMessage || successMessage);

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
          {errorMessage ? (
            <div className="relative">
              <Alert variant="destructive" className="pr-10">
                {errorMessage}
              </Alert>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="absolute right-2 top-2 rounded-md px-2 py-1 opacity-70 hover:bg-black/5 hover:opacity-100"
                aria-label="Dismiss message"
                title="Dismiss"
              >
                ×
              </button>
            </div>
          ) : null}

          {successMessage ? (
            <div className="relative">
              <Alert variant="success" className="pr-10">
                {successMessage}
              </Alert>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="absolute right-2 top-2 rounded-md px-2 py-1 opacity-70 hover:bg-black/5 hover:opacity-100"
                aria-label="Dismiss message"
                title="Dismiss"
              >
                ×
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
        <>
          {/* Account security section */}
          <div className="space-y-6 text-right mb-3 mt-[-40]">
            <AccountSecurityDialog />
          </div>

          <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
            
            {/* Left: Profile section */}
            <div className="space-y-6 lg:col-span-7">
              <ProfileProAccessCard />


              <UserProfileCard
                email={user?.email ?? "—"}
                isEditing={isEditingProfile}
                isSaving={isSaving}
                onStartEdit={startProfileEdit}
                onCancelEdit={cancelProfileEdit}
                onSave={handleProfileSave}
                name={name}
                setName={setName}
                location={location}
                setLocation={setLocation}
                currentCompany={currentCompany}
                setCurrentCompany={setCurrentCompany}
                currentRole={currentRole}
                setCurrentRole={setCurrentRole}
                skillsText={skillsInput}
                setSkillsText={setSkillsInput}
                linkedInUrl={linkedInUrl}
                setLinkedInUrl={setLinkedInUrl}
                githubUrl={githubUrl}
                setGithubUrl={setGithubUrl}
                portfolioUrl={portfolioUrl}
                setPortfolioUrl={setPortfolioUrl}
              />
            </div>
          

            {/* Right: secondary cards stacked */}
            <div className="space-y-6 lg:col-span-5">


              {/* Job search preferences section */}
              <JobSearchPreferencesCard
                isDialogOpen={isJobSearchDialogOpen}
                onDialogOpenChange={handleJobSearchDialogOpenChange}
                isEditing={isEditingJobSearch}
                onStartEdit={startJobSearchEdit}
                onCancelEdit={cancelJobSearchEdit}
                isSaving={isJobSearchSaving}
                onSave={handleJobSearchSave}
                titlesText={jobSearchTitlesText}
                setTitlesText={setJobSearchTitlesText}
                locationsText={jobSearchLocationsText}
                setLocationsText={setJobSearchLocationsText}
                keywordsText={jobSearchKeywordsText}
                setKeywordsText={setJobSearchKeywordsText}
                summary={jobSearchSummary}
                setSummary={setJobSearchSummary}
                workMode={jobSearchWorkMode}
                setWorkMode={setJobSearchWorkMode}
              />


              {/* Connections section */}
              <ProfileConnectionsCard />


              {/* Base resume section */}
              <BaseResumeCard
                isDialogOpen={isResumeDialogOpen}
                onDialogOpenChange={handleResumeDialogOpenChange}
                baseResume={baseResume}
                isSaving={isResumeSaving}
                onSave={handleResumeSave}
                isDeleting={isResumeDeleting}
                onDelete={handleResumeDelete}
                onDownload={handleResumeDownload}
                selectedFile={resumeFile}
                onFileChange={setResumeFile}
                fileInputRef={resumeFileInputRef}
                resumeErrorMessage={resumeErrorMessage}
                onClearResumeError={() => setResumeErrorMessage(null)}
              />
            </div>
          </div>
        </>
      </div>
    </div>

  );
}

