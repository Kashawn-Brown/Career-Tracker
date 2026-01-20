"use client";

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

  fileInputRef  
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Base Resume</CardTitle>
        <CardDescription>
          Upload a base resume once. You can replace it later.
        </CardDescription>

        <CardAction>
          <Dialog open={isDialogOpen} onOpenChange={onDialogOpenChange}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                View / Edit
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-xl">
              {/* pr-10 reserves space so the Radix close (X) never overlaps header actions */}
              <div className="pr-10">
                <DialogHeader>
                  <DialogTitle>Base Resume</DialogTitle>
                  <DialogDescription>
                    {baseResume
                      ? "Choose a new file to replace the saved resume."
                      : "No base resume saved yet. Upload one to start."}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <form className="mt-4 space-y-3" onSubmit={onSave}>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Resume file</div>

                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                  />

                  <div className="text-xs text-muted-foreground">
                    Accepted: PDF, TXT • up to 10MB
                  </div>
                </div>

                {/* Actions row (Dialog footer) */}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  {/* Cancel / Close */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onDialogOpenChange(false)}
                    disabled={isSaving || isDeleting}
                  >
                    Cancel
                  </Button>

                  {/* Download: only if we already have a saved base resume */}
                  {baseResume ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onDownload}
                      disabled={isSaving || isDeleting}
                    >
                      Download
                    </Button>
                  ) : null}

                  {/* Delete: only if we already have a saved base resume */}
                  {baseResume ? (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={onDelete}
                      disabled={isSaving || isDeleting}
                    >
                      Delete
                    </Button>
                  ) : null}

                  {/* Save / Upload */}
                  <Button type="submit" disabled={isSaving || isDeleting || !selectedFile}>
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardAction>
      </CardHeader>

      <CardContent className="text-sm">
        {baseResume ? (
          <div className="text-muted-foreground">A base resume is saved.</div>
        ) : (
          <div className="text-muted-foreground">No base resume saved yet.</div>
        )}
      </CardContent>
    </Card>
  );
}
