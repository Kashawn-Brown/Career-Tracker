"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Eye, FileText, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import { ApiError } from "@/lib/api/client";

import { applicationDocumentsApi } from "@/lib/api/application-documents";
import { documentsApi } from "@/lib/api/documents";

import type { Document, DocumentKind } from "@/types/api";

type ApplicationDocumentKind = Exclude<DocumentKind, "BASE_RESUME">;

const DOC_KIND_OPTIONS: Array<{ value: ApplicationDocumentKind; label: string }> =
  [
    { value: "RESUME", label: "Resume" },
    { value: "COVER_LETTER", label: "Cover Letter" },
    { value: "OTHER", label: "Other" },
  ];

const DOC_KIND_LABEL: Record<ApplicationDocumentKind, string> = {
  RESUME: "Resume",
  COVER_LETTER: "Cover Letter",
  OTHER: "Other",
};

function safeDocId(doc: Document): number {
  // Backend uses numeric IDs; this keeps UI safe if TS type is number|string.
  const n = Number(doc.id);
  return Number.isFinite(n) ? n : -1;
}

export function ApplicationDocumentsSection({
  applicationId,
  open,
  isEditing,
  onDocumentsChanged,
  activePreviewDocId,
  onPreviewRequested,
}: {
  applicationId: string;
  open: boolean;
  isEditing: boolean;
  onDocumentsChanged?: (applicationId: string) => void;
  activePreviewDocId?: string | null;
  onPreviewRequested?: (doc: Document | null) => void;
}) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [kind, setKind] = useState<ApplicationDocumentKind>("RESUME");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helps reset the <input type="file" />
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canUpload = useMemo(() => !!file && !isUploading, [file, isUploading]);

  // Resets the local UI state when switching apps / reopening.
  useEffect(() => {
    if (!open) return;
    if (!applicationId) return;

    // reset local UI state when switching apps / reopening
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, open]);
  
  // Refreshes the list of documents for the application.
  async function refresh() {
    setIsLoading(true);
    try {
      setErrorMessage(null);
      const res = await applicationDocumentsApi.list(applicationId);
      setDocs(res.documents ?? []);
    } catch (err) {
      // Keep the drawer usable even if docs fail
      setDocs([]);
      
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to load documents.");
    } finally {
      setIsLoading(false);
    }
  }

  // Uploads a document to the application.
  async function onUpload() {
    if (!file) return;

    setIsUploading(true);
    try {
      setErrorMessage(null);

      await applicationDocumentsApi.upload({ applicationId, kind, file });
      
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      await refresh();
      onDocumentsChanged?.(applicationId);

    } catch (err) {
      
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Document upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  // Opens a document in a new tab.
  async function onOpenInline(doc: Document) {
    const id = safeDocId(doc);
    if (id < 0) return;

    try {
      setErrorMessage(null);

      const res = await documentsApi.getDownloadUrl(id, { disposition: "inline" });
      // This acts as “preview” for now (new tab). Simple + not over-engineered.
      window.open(res.downloadUrl, "_blank", "noopener,noreferrer");

    } catch (err) {
      
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to open document.");
    }
  }

  // Downloads a document.
  async function onDownload(doc: Document) {
    const id = safeDocId(doc);
    if (id < 0) return;

    try {
      setErrorMessage(null);

      const res = await documentsApi.getDownloadUrl(id, { disposition: "attachment" });
      // This acts as “preview” for now (new tab). Simple + not over-engineered.
      window.open(res.downloadUrl, "_blank", "noopener,noreferrer");

    } catch (err) {
      
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to open document.");
    }
  }

  // Deletes a document.
  async function onDelete(doc: Document) {
    const id = safeDocId(doc);
    if (id < 0) return;

    const ok = window.confirm(`Delete "${doc.originalName}"?`);
    if (!ok) return;

    if (activePreviewDocId === String(doc.id)) {
      onPreviewRequested?.(null);
    }

    try {
      setErrorMessage(null);      
      await documentsApi.deleteById(id);
      await refresh();
      onDocumentsChanged?.(applicationId);

    } catch (err) {
      
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to delete document.");
    }
  }


  return (
    <div className="space-y-4">
      {/* Error message */}
      {errorMessage ? (
        <div className="rounded-md border px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {/* List */}
      <div className="rounded-md border">
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <div className="text-sm font-medium">Files</div>
          <div className="text-xs text-muted-foreground">
            {isLoading ? "Loading..." : `${docs.length} file(s)`}
          </div>
        </div>

        {docs.length === 0 && !isLoading ? (
          <div className="p-3 text-sm text-muted-foreground">
            No documents uploaded for this application yet.
          </div>
        ) : (
          <div className="divide-y">
            {docs.map((doc) => (
              <div
                key={String(doc.id)}
                className="px-3 py-2 flex items-center gap-3 hover:bg-muted/40 cursor-pointer"
                onClick={() => onOpenInline(doc)}
              >
                <FileText className="h-4 w-4 text-muted-foreground" />

                <div className="min-w-0 flex-1">
                  <div className="text-sm truncate">{doc.originalName}</div>
                  {"kind" in doc && doc.kind !== "BASE_RESUME" ? (
                    <div className="text-xs text-muted-foreground">
                      {DOC_KIND_LABEL[doc.kind as ApplicationDocumentKind] ??
                        doc.kind}
                    </div>
                  ) : null}
                </div>

                {/* Document Actions */}
                <div className="flex items-center gap-1">
                  {!isEditing ? (
                    <>
                      {doc.mimeType === "application/pdf" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreviewRequested?.(doc);
                          }}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      ) : null}
                    
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(doc);
                        }}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </>
                  ): 
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(doc);
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload row */}
      {isEditing && (
        <div className="rounded-md border p-3 space-y-3">
          <div className="text-sm font-medium">Upload document</div>

          <div className="space-y-3 grid grid-cols-1 gap-2">
            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
              <Select
                value={kind}
                onChange={(e) =>
                  setKind(e.target.value as ApplicationDocumentKind)
                }
              >
                {DOC_KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>

              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                className="text-xs text-muted-foreground"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <Button onClick={onUpload} disabled={!canUpload}>
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
