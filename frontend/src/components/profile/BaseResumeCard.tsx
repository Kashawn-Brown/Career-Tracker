"use client";

import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api/client";
import { documentsApi } from "@/lib/api/documents";

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
} from "@/components/ui/dialog";
import type { Document } from "@/types/api";

type Props = {
  isDialogOpen: boolean;
  onDialogOpenChange: (nextOpen: boolean) => void;

  baseResume: Document | null;

  isSaving: boolean;
  onSave: (e: React.FormEvent) => void;

  isDeleting: boolean;
  onDelete: () => void;

  onDownload: () => void;

  selectedFile: File | null;
  onFileChange: (file: File | null) => void;

  fileInputRef: React.RefObject<HTMLInputElement | null>;
};

export function BaseResumeCard({
  isDialogOpen,
  onDialogOpenChange,

  baseResume,

  isSaving,
  onSave,

  isDeleting,
  onDelete,

  onDownload,

  selectedFile,
  onFileChange,

  fileInputRef,
}: Props) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  function safeDocId(doc: Document): number {
    const id = typeof doc.id === "string" ? Number(doc.id) : doc.id;
    return Number.isFinite(id) ? id : -1;
  }

  async function openPreview() {
    if (!baseResume) return;

    const id = safeDocId(baseResume);
    if (id < 0) {
      setPreviewError("Invalid resume id.");
      setIsPreviewOpen(true);
      return;
    }

    setIsPreviewOpen(true);
    setIsPreviewLoading(true);
    setPreviewError(null);
    setPreviewUrl(null);

    try {
      const res = await documentsApi.getDownloadUrl(id, { disposition: "inline" });
      setPreviewUrl(res.downloadUrl);
    } catch (err) {
      if (err instanceof ApiError) setPreviewError(err.message);
      else setPreviewError("Failed to load preview.");
    } finally {
      setIsPreviewLoading(false);
    }
  }

  // Clear the signed URL on close so we don't keep stale URLs around.
  useEffect(() => {
    if (!isPreviewOpen) {
      setPreviewUrl(null);
      setPreviewError(null);
      setIsPreviewLoading(false);
    }
  }, [isPreviewOpen]);

  const updatedText = baseResume
    ? new Date(baseResume.updatedAt).toLocaleDateString()
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Base Resume</CardTitle>
        <CardDescription>
          Upload a base resume once. You can replace it later.
        </CardDescription>

        <CardAction>
          {baseResume ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={openPreview}
                disabled={isSaving || isDeleting}
              >
                View
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onDialogOpenChange(true)}
                disabled={isSaving || isDeleting}
              >
                Replace
              </Button>
            </div>
          ) : (
            null
          )}

          {/* Upload / replace dialog */}
          <Dialog open={isDialogOpen} onOpenChange={onDialogOpenChange}>
            <DialogContent className="max-w-xl">
              {/* pr-10 reserves space so the Radix close (X) never overlaps header content */}
              <div className="pr-10">
                <DialogHeader>
                  <DialogTitle>
                    {baseResume ? "Replace base resume" : "Upload base resume"}
                  </DialogTitle>
                  <DialogDescription>
                    {baseResume
                      ? "Choose a new file to replace the saved resume."
                      : "No base resume saved yet. Upload one to start."}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <form className="mt-4 space-y-3" onSubmit={onSave}>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Resume file</div>

                  {/* Hidden input + explicit button so it's obvious where to click */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt"
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
                      {selectedFile ? (
                        <div className="truncate">Selected: {selectedFile.name}</div>
                      ) : (
                        <div>No file selected</div>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Accepted: PDF, TXT • up to 10MB
                  </div>
                </div>

                {/* Actions row */}
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
                      {isSaving ? "Saving..." : baseResume ? "Replace" : "Upload"}
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
        {baseResume ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <div className="min-w-0">
                <div className="font-medium truncate">{baseResume.originalName}</div>
                <div className="text-xs text-muted-foreground">
                  Saved • Updated {updatedText}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDownload}
                disabled={isSaving || isDeleting}
              >
                Download
              </Button>

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
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-muted-foreground">No base resume saved yet.</div>
            <Button type="button" onClick={() => onDialogOpenChange(true)}>
              Upload base resume
            </Button>
          </div>
        )}
      </CardContent>

      {/* Preview dialog (similar spirit to the drawer preview) */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl p-0">
          <div className="border-b px-5 py-4 pr-12">
            <div className="text-sm font-medium truncate">
              {baseResume?.originalName ?? "Preview"}
            </div>
            <div className="text-xs text-muted-foreground">Document preview</div>
          </div>

          <div className="h-[75vh]">
            {isPreviewLoading ? (
              <div className="p-4 text-sm text-muted-foreground">
                Loading preview...
              </div>
            ) : previewError ? (
              <div className="p-4 text-sm text-destructive">{previewError}</div>
            ) : previewUrl ? (
              <iframe
                src={previewUrl}
                title={baseResume?.originalName ?? "Document preview"}
                className="h-full w-full bg-white"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="p-4 text-sm text-muted-foreground">
                No preview available.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
