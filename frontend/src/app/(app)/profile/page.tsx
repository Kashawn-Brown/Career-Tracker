"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type { MeResponse, UpdateMeRequest } from "@/types/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { documentsApi } from "@/lib/api/documents";
import type { Document, UpsertBaseResumeRequest } from "@/types/api";

// ProfilePage: view + edit minimal profile fields via GET/PATCH /users/me.
export default function ProfilePage() {

  // Pulling from auth context
  const { user, setCurrentUser } = useAuth();

  // baseResume: current BASE_RESUME document metadata (null means none saved yet).
  const [baseResume, setBaseResume] = useState<Document | null>(null);

  // Resume form fields (MVP: metadata + URL only) (have to mimic an upload).
  const [resumeUrl, setResumeUrl] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [resumeMime, setResumeMime] = useState("");
  const [resumeSize, setResumeSize] = useState<string>(""); // keep as string for input simplicity

  const [isResumeSaving, setIsResumeSaving] = useState(false);
  const [isResumeDeleting, setIsResumeDeleting] = useState(false);

  // Profile edit mode: prevents accidental edits
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Local component state
  const [name, setName] = useState(user?.name ?? "");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resumeErrorMessage, setResumeErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
        setName(res.user.name ?? "");

        
        // Load base resume metadata for the logged-in user.
        try { // It's own try/catch block so it does not block profile load even if resume load fails 
          const resumeRes = await documentsApi.getBaseResume();
          setBaseResume(resumeRes.document);

          if (resumeRes.document) {
            setResumeUrl(resumeRes.document.url);
            setResumeName(resumeRes.document.originalName);
            setResumeMime(resumeRes.document.mimeType);
            setResumeSize(resumeRes.document.size ? String(resumeRes.document.size) : "");
          }

        } catch(err) {
          
          // Resume load failed: keep profile usable, show resume-only error message
          setBaseResume(null);
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
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsEditingProfile(false);
  }

  // Saving profile changes
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage("Name is required.");
      return;
    }

    if (name.trim() === user?.name) {
      setErrorMessage("Name is the same.");
      return;
    }

    const payload: UpdateMeRequest = { name: name.trim() };

    try {
      setIsSaving(true);

      // Save profile changes.
      const res = await apiFetch<MeResponse>(routes.users.me(), {
        method: "PATCH",
        body: payload,
      });

      // Sync auth state so header updates immediately.
      setCurrentUser(res.user);
      setSuccessMessage("Saved.");
    } catch (err) {
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  }


  // Resets the form to the currently loaded user profile values.
  function onReset() {
    setName(user?.name ?? "");
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  // Saves/replaces the base resume metadata.
  async function handleResumeSave(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!resumeUrl.trim() || !resumeName.trim() || !resumeMime.trim()) {
      setErrorMessage("Resume URL, file name, and MIME type are required.");
      return;
    }

    const payload: UpsertBaseResumeRequest = {
      url: resumeUrl.trim(),
      originalName: resumeName.trim(),
      mimeType: resumeMime.trim(),
      // size is optional; only send if provided
      ...(resumeSize.trim() ? { size: Number(resumeSize) } : {}),
    };

    try {
      setIsResumeSaving(true);

      const res = await documentsApi.upsertBaseResume(payload);
      setBaseResume(res.document);
      setSuccessMessage("Base resume saved.");
    } catch (err) {
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to save base resume.");
    } finally {
      setIsResumeSaving(false);
    }
  }


  // Deletes the base resume metadata.
  async function handleResumeDelete() {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      setIsResumeDeleting(true);

      await documentsApi.deleteBaseResume();
      setBaseResume(null);

      // Clear form inputs as well.
      setResumeUrl("");
      setResumeName("");
      setResumeMime("");
      setResumeSize("");

      setSuccessMessage("Base resume deleted.");
    } catch (err) {
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to delete base resume.");
    } finally {
      setIsResumeDeleting(false);
    }
  }



  if (isLoading) return <div className="text-sm">Loading profile...</div>;

  const hasMessages = !!(errorMessage || resumeErrorMessage || successMessage);

  // TODO: If base resume exists, switch to 2-col layout and render first-page preview thumbnail.

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {hasMessages ? (
        <div className="space-y-1">
          {errorMessage ? <div className="text-sm text-red-600">{errorMessage}</div> : null}
          {resumeErrorMessage ? (
            <div className="text-sm text-orange-600">{resumeErrorMessage}</div>
          ) : null}
          {successMessage ? (
            <div className="text-sm text-green-600">{successMessage}</div>
          ) : null}
        </div>
      ) : null}

      {/* Profile section */}
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
          <form className="space-y-4" onSubmit={handleSave}>
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

      {/* Base resume section */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Base Resume</CardTitle>
          <CardDescription>
            Store a link to your current resume (metadata-only for MVP).
          </CardDescription>

          <CardAction>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleResumeDelete}
              disabled={!baseResume || isResumeDeleting}
            >
              {isResumeDeleting ? "Deleting..." : "Delete"}
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {baseResume ? (
              <>
                Current:{" "}
                <a className="underline" href={baseResume.url} target="_blank" rel="noreferrer">
                  {baseResume.originalName}
                </a>
              </>
            ) : (
              "No base resume saved yet."
            )}
          </div>

          <form className="space-y-4" onSubmit={handleResumeSave}>
            <div className="space-y-1">
              <Label htmlFor="resumeUrl">Resume URL</Label>
              <Input
                id="resumeUrl"
                value={resumeUrl}
                onChange={(e) => setResumeUrl(e.target.value)}
                placeholder="https://... or https://storage.googleapis.com/..."
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="resumeName">File name</Label>
              <Input
                id="resumeName"
                value={resumeName}
                onChange={(e) => setResumeName(e.target.value)}
                placeholder="Kashawn_Brown_Resume.pdf"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="resumeMime">MIME type</Label>
              <Input
                id="resumeMime"
                value={resumeMime}
                onChange={(e) => setResumeMime(e.target.value)}
                placeholder="application/pdf"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="resumeSize">Size (bytes) (optional)</Label>
              <Input
                id="resumeSize"
                value={resumeSize}
                onChange={(e) => setResumeSize(e.target.value)}
                placeholder="123456"
              />
            </div>

            <Button type="submit" disabled={isResumeSaving}>
              {isResumeSaving ? "Saving..." : baseResume ? "Replace base resume" : "Save base resume"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

