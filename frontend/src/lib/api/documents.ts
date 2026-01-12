// documents.ts: tiny API helpers for base resume endpoints (keeps components simpler).
import { apiFetch } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type {
  OkResponse,
  GetBaseResumeResponse,
  UpsertBaseResumeResponse,
  GetDocumentDownloadUrlResponse,
} from "@/types/api";

export const documentsApi = {

  // Fetches the current base resume metadata for the logged-in user.
  getBaseResume() {
    return apiFetch<GetBaseResumeResponse>(routes.documents.baseResume(), { 
      method: "GET" 
    });
  },

  // Creates/replaces the base resume metadata for the logged-in user
  upsertBaseResume(file: File): Promise<UpsertBaseResumeResponse> {
      
    // Create a FormData object to send the file to the backend.
    const form = new FormData();
    form.append("file", file);

    return apiFetch<UpsertBaseResumeResponse>(routes.documents.baseResume(), {
      method: "POST",
      body: form,
    });
  },

  // Deletes the base resume metadata for the logged-in user.
  deleteBaseResume() {
    return apiFetch<OkResponse>(routes.documents.baseResume(), { 
      method: "DELETE" 
    });
  },

  // Get a download URL for a document.
  getDownloadUrl(documentId: number, opts?: { disposition?: "inline" | "attachment" }) {
    return apiFetch<GetDocumentDownloadUrlResponse>(
      routes.documents.download(documentId, opts), { 
        method: "GET" 
      }
    );
  },
  
  // Delete a document by id 
  deleteById(documentId: number) {
    return apiFetch<OkResponse>(routes.documents.byId(documentId), {
      method: "DELETE",
    });
  },

}