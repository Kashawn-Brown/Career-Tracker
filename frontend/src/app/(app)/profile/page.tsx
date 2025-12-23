"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type { MeResponse, UpdateMeRequest } from "@/types/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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



  if (isLoading) {
    return (
      <Card className="max-w-2xl">
        <CardContent className="space-y-4 py-6 text-sm">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
          <div className="h-10 w-36 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Profile</CardTitle>
          <p className="text-sm text-muted-foreground">
            Update your account name and resume metadata.
          </p>
        </CardHeader>

        {/* Profile Update Section: name only (MVP). */}
        <CardContent className="space-y-5">
          {errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}
          {resumeErrorMessage ? (
            <div className="rounded-md border border-orange-500/30 bg-orange-500/5 px-3 py-2 text-sm text-orange-700">
              {resumeErrorMessage}
            </div>
          ) : null}
          {successMessage ? (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          <div className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium">{user?.email}</span>
          </div>

          <form className="space-y-4" onSubmit={handleSave}>
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" type="button" onClick={onReset}>
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* BaseResumeSection: metadata-only resume record (upload comes later). */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Base Resume</CardTitle>
          <p className="text-sm text-muted-foreground">
            Store a single base resume URL and metadata.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
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

          <form className="space-y-3" onSubmit={handleResumeSave}>
            <div className="space-y-1.5">
              <Label htmlFor="resumeUrl">Resume URL</Label>
              <Input
                id="resumeUrl"
                value={resumeUrl}
                onChange={(e) => setResumeUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="resumeName">File name</Label>
              <Input
                id="resumeName"
                value={resumeName}
                onChange={(e) => setResumeName(e.target.value)}
                placeholder="Resume.pdf"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="resumeMime">MIME type</Label>
              <Input
                id="resumeMime"
                value={resumeMime}
                onChange={(e) => setResumeMime(e.target.value)}
                placeholder="application/pdf"
              />
            </div>

            <div className="space-y-1.5">
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
