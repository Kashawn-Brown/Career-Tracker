"use client";

import { useState } from "react";
import { Button }       from "@/components/ui/button";
import {
  Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { Document } from "@/types/api";

// Accepted formats — cover letters are typically .docx or .pdf, .txt also useful
const ACCEPT = ".pdf,.txt,.docx";

type Props = {
  isDialogOpen:       boolean;
  onDialogOpenChange: (open: boolean) => void;
  baseCoverLetter:    Document | null;
  isSaving:           boolean;
  onSave:             (e: React.FormEvent) => void;
  isDeleting:         boolean;
  onDelete:           () => void;
  selectedFile:       File | null;
  onFileChange:       (file: File | null) => void;
  fileInputRef:       React.RefObject<HTMLInputElement | null>;
  errorMessage:       string | null;
  onClearError:       () => void;
};

/**
 * BaseCoverLetterCard — profile section for the user's default cover letter template.
 *
 * The stored file is automatically used as the starting point for every cover
 * letter generation unless the user overrides it on a per-run basis.
 *
 * Mirrors BaseResumeCard in structure so the profile page stays consistent.
 */
export function BaseCoverLetterCard({
  isDialogOpen, onDialogOpenChange,
  baseCoverLetter,
  isSaving, onSave,
  isDeleting, onDelete,
  selectedFile, onFileChange, fileInputRef,
  errorMessage, onClearError,
}: Props) {
  const updatedText = baseCoverLetter
    ? new Date(baseCoverLetter.updatedAt).toLocaleDateString()
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Base Cover Letter Template</CardTitle>
        <CardDescription>
          Upload a cover letter or template you want to reuse. It will be used automatically
          as the starting point for cover letter generations — you can always override
          it on a per-run basis.
        </CardDescription>

        <CardAction>
          {baseCoverLetter && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onDialogOpenChange(true)}
              disabled={isSaving || isDeleting}
            >
              Replace
            </Button>
          )}

          {/* Upload / replace dialog */}
          <Dialog open={isDialogOpen} onOpenChange={onDialogOpenChange}>
            <DialogContent className="max-w-xl" onInteractOutside={(e) => e.preventDefault()}>

              {/* Floating error banner — same pattern as BaseResumeCard */}
              {errorMessage && (
                <div className="fixed inset-x-0 top-[-35%] z-[60] flex justify-center px-4">
                  <div className="relative w-full max-w-xl">
                    <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 pr-10 text-sm text-destructive shadow-lg">
                      {errorMessage}
                    </div>
                    <button
                      type="button"
                      onClick={onClearError}
                      className="absolute right-2 top-2 rounded-md px-2 py-1 opacity-70 hover:bg-black/5 hover:opacity-100"
                      aria-label="Dismiss"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              <div className="pr-10">
                <DialogHeader>
                  <DialogTitle>
                    {baseCoverLetter ? "Replace template" : "Upload cover letter template"}
                  </DialogTitle>
                  <DialogDescription>
                    {baseCoverLetter
                      ? "Choose a new file to replace your saved template."
                      : "No template saved yet. Upload one to use as your default starting point."}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <form className="mt-4 space-y-3" onSubmit={onSave}>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Template file</div>

                  {/* Hidden file input — triggered by the button below */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT}
                    className="hidden"
                    onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                  />

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSaving || isDeleting}
                    >
                      {selectedFile ? "Change file" : "Choose file"}
                    </Button>
                    <div className="min-w-0 text-xs text-muted-foreground">
                      {selectedFile
                        ? <span className="truncate">Selected: {selectedFile.name}</span>
                        : <span>No file selected</span>}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Accepted: PDF, DOCX, TXT • up to 10MB
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onDialogOpenChange(false)}
                    disabled={isSaving || isDeleting}
                  >
                    Cancel
                  </Button>
                  {selectedFile ? (
                    <Button type="submit" disabled={isSaving || isDeleting}>
                      {isSaving ? "Saving…" : baseCoverLetter ? "Replace" : "Upload"}
                    </Button>
                  ) : (
                    <div className="text-xs text-muted-foreground self-center">
                      Choose a file to enable upload.
                    </div>
                  )}
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardAction>
      </CardHeader>

      <CardContent className="text-sm">
        {baseCoverLetter ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              {/* Green dot — visual indicator that a template is saved */}
              <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <div className="min-w-0">
                <div className="font-medium truncate">{baseCoverLetter.originalName}</div>
                <div className="text-xs text-muted-foreground">
                  Saved • Updated {updatedText}
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={isSaving || isDeleting}
            >
              Delete
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-muted-foreground">No cover letter template saved yet.</div>
            <Button type="button" onClick={() => onDialogOpenChange(true)}>
              Upload template
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}