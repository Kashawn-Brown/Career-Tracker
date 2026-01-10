import { apiFetch } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type {
    ListApplicationDocumentsResponse,
    UploadApplicationDocumentParams,
    UploadApplicationDocumentResponse,
} from "@/types/api";

export const applicationDocumentsApi = {

    // List documents for an application.
    list(applicationId: string): Promise<ListApplicationDocumentsResponse> {
        return apiFetch<ListApplicationDocumentsResponse>(routes.applications.documents.list(applicationId), {
            method: "GET",
        });
    },

    // Upload a document to an application.
    upload(params: UploadApplicationDocumentParams): Promise<UploadApplicationDocumentResponse> {
        const { applicationId, kind, file } = params;

        const form = new FormData();
        form.append("file", file);
        
        return apiFetch<UploadApplicationDocumentResponse>(routes.applications.documents.upload(applicationId, kind), {
            method: "POST",
            body: form,
        });
    },
    
}