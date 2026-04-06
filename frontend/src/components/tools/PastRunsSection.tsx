"use client";

import { useEffect, useState } from "react";
import { Button }               from "@/components/ui/button";
import { userAiArtifactsApi }   from "@/lib/api/user-ai-artifacts";
import { documentsApi }         from "@/lib/api/documents";
import { ResumeAdviceResult }   from "@/components/tools/ResumeAdviceResult";
import { CoverLetterResult }    from "@/components/tools/CoverLetterResult";
import type {
  UserAiArtifact,
  UserAiArtifactKind,
  ResumeAdvicePayload,
  CoverLetterPayload,
} from "@/types/api";

interface Props {
  kind:       UserAiArtifactKind;
  /** Increment to trigger a re-fetch after a new run completes */
  refreshKey?: number;
  /** Called after a deletion so the parent can refresh its own state if needed */
  onDeleted?: () => void;
}

/**
 * PastRunsSection — displays the user's stored results for a given tool kind.
 *
 * Shows up to 3 previous runs (the backend cap). Each run shows:
 *   - When it was generated
 *   - Which resume was used (base or uploaded)
 *   - A "View" toggle to expand the full result inline
 *   - A download link for the resume used (if it was an upload)
 *   - A delete button to remove the run
 *
 * Sits in the collapsed card header so users immediately see past work
 * without needing to expand the form first.
 */
export function PastRunsSection({ kind, refreshKey = 0, onDeleted }: Props) {
  const [artifacts, setArtifacts] = useState<UserAiArtifact[] | null>(null);
  const [loading,   setLoading]   = useState(true);

  // Track which artifact's result is currently expanded
  const [openId, setOpenId] = useState<string | null>(null);

  // Track delete-in-progress per artifact id
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    userAiArtifactsApi
      .list({ kind })
      .then((res) => { if (!cancelled) setArtifacts(res.artifacts); })
      .catch(() => { if (!cancelled) setArtifacts([]); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  // refreshKey incremented by parent after a new run so the list updates immediately
  }, [kind, refreshKey]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await userAiArtifactsApi.delete(id);
      setArtifacts((prev) => prev?.filter((a) => a.id !== id) ?? []);
      if (openId === id) setOpenId(null);
      onDeleted?.();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDownloadResume(documentId: number) {
    try {
      // Get a signed download URL for the uploaded resume document
      const { downloadUrl } = await documentsApi.getDownloadUrl(documentId, { disposition: "attachment" });
      window.open(downloadUrl, "_blank");
    } catch {
      // Silent — the doc may have been deleted
    }
  }

  if (loading) {
    return <p className="text-xs text-muted-foreground px-5 pb-3">Loading past runs…</p>;
  }

  if (!artifacts || artifacts.length === 0) return null;

  const label = kind === "RESUME_ADVICE" ? "resume advice run" : "cover letter";

  return (
    <div className="border-t px-5 py-3 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Previous runs ({artifacts.length} of 3 saved)
      </p>

      {artifacts.map((artifact) => {
        const isOpen    = openId === artifact.id;
        const isDeleting = deletingId === artifact.id;
        const date      = new Date(artifact.createdAt).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
        const sourceLabel =
          artifact.resumeSource === "UPLOAD"
            ? "Uploaded resume"
            : "Base resume";

        return (
          <div key={artifact.id} className="rounded-md border bg-muted/20 p-3 space-y-2">
            {/* Run metadata */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs font-medium text-foreground capitalize">{label}</p>
                <p className="text-xs text-muted-foreground">{date}</p>
                <p className="text-xs text-muted-foreground">
                  {sourceLabel}
                  {/* If an uploaded resume was used, offer a download link */}
                  {artifact.resumeSource === "UPLOAD" && artifact.sourceDocumentId && (
                    <button
                      type="button"
                      className="ml-1.5 underline underline-offset-2 hover:text-foreground"
                      onClick={() => void handleDownloadResume(artifact.sourceDocumentId!)}
                    >
                      Download
                    </button>
                  )}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenId(isOpen ? null : artifact.id)}
                >
                  {isOpen ? "Hide" : "View"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isDeleting}
                  onClick={() => void handleDelete(artifact.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  {isDeleting ? "…" : "Delete"}
                </Button>
              </div>
            </div>

            {/* Expanded result — only one open at a time */}
            {isOpen && (
              <div className="border-t pt-2">
                {kind === "RESUME_ADVICE" ? (
                  <ResumeAdviceResult
                    payload={artifact.payload as ResumeAdvicePayload}
                  />
                ) : (
                  <CoverLetterResult
                    payload={artifact.payload as CoverLetterPayload}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}