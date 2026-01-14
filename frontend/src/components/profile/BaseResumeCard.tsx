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

type Props = {
  isDialogOpen: boolean;
  onDialogOpenChange: (nextOpen: boolean) => void;

  hasBaseResume: boolean;

  isSaving: boolean;
  onSave: (e: React.FormEvent) => void;

  isDeleting: boolean;
  onDelete: () => void;

  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
};

export function BaseResumeCard({
  isDialogOpen,
  onDialogOpenChange,

  hasBaseResume,

  isSaving,
  onSave,

  isDeleting,
  onDelete,

  selectedFile,
  onFileChange,
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
                    {hasBaseResume
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

                <div className="flex items-center justify-end gap-2 pt-2">
                  {hasBaseResume ? (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={onDelete}
                      disabled={isDeleting || isSaving}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={isSaving || isDeleting || !selectedFile}
                    title={!selectedFile ? "Choose a file first" : undefined}
                  >
                    {isSaving ? "Saving..." : "Save base resume"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardAction>
      </CardHeader>

      <CardContent className="text-sm">
        {hasBaseResume ? (
          <div className="text-muted-foreground">A base resume is saved.</div>
        ) : (
          <div className="text-muted-foreground">No base resume saved yet.</div>
        )}
      </CardContent>
    </Card>
  );
}
