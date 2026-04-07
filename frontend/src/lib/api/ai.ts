import { apiFetch } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type { ApplicationDraftResponse } from "@/types/api";

/**
 * Mini client with small helpers for AI endpoints.
 * 
 * So UI components don’t have to repeat apiFetch(...) details everywhere (can just call here)
 * Centralizes the endpoint calls so UI code is cleaner and easier to maintain.
 */


/**
 * Extract job information from a job description.
 */
export const aiApi = {
  /** Extract job information from pasted job description text. */
  applicationFromJd(text: string) {
    return apiFetch<ApplicationDraftResponse>(routes.ai.applicationFromJd(), {
      method: "POST",
      body: { text },
    });
  },

  /** Fetch a job-posting URL and extract job information from it. */
  applicationFromLink(url: string) {
    return apiFetch<ApplicationDraftResponse>(routes.ai.applicationFromLink(), {
      method: "POST",
      body: { url },
    });
  },

  /**
   * Generic resume advice. Sends multipart/form-data.
   * resumeFile is optional — falls back to stored base resume if omitted.
   */
  resumeHelp(fields: {
    targetField?:       string;
    targetRolesText?:   string;
    targetKeywords?:    string;
    additionalContext?: string;
    resumeFile?:        File | null;
  }) {
    const form = new FormData();
    if (fields.targetField)       form.append("targetField",       fields.targetField);
    if (fields.targetRolesText)   form.append("targetRolesText",   fields.targetRolesText);
    if (fields.targetKeywords)    form.append("targetKeywords",    fields.targetKeywords);
    if (fields.additionalContext) form.append("additionalContext", fields.additionalContext);
    if (fields.resumeFile)        form.append("resumeFile",        fields.resumeFile);

    return apiFetch<import("@/types/api").UserAiArtifact<import("@/types/api").ResumeAdvicePayload>>(
      routes.ai.resumeHelp(),
      { method: "POST", body: form }
    );
  },

  /**
   * Generic cover letter generation. Sends multipart/form-data.
   * resumeFile is optional — falls back to stored base resume if omitted.
   */
  coverLetterHelp(fields: {
    targetField?:                string;
    targetRolesText?:            string;
    targetCompany?:              string;
    whyInterested?:              string;
    templateText?:               string;
    additionalContext?:          string;
    resumeFile?:                 File | null;
    // When true, skips the user's stored base cover letter template for this run
    skipBaseCoverLetterTemplate?: boolean;
  }) {
    const form = new FormData();
    if (fields.targetField)       form.append("targetField",       fields.targetField);
    if (fields.targetRolesText)   form.append("targetRolesText",   fields.targetRolesText);
    if (fields.targetCompany)     form.append("targetCompany",     fields.targetCompany);
    if (fields.whyInterested)     form.append("whyInterested",     fields.whyInterested);
    if (fields.templateText)      form.append("templateText",      fields.templateText);
    if (fields.additionalContext) form.append("additionalContext", fields.additionalContext);
    if (fields.resumeFile)        form.append("resumeFile",        fields.resumeFile);
    // Only append when true — absence means "use default behaviour" on the backend
    if (fields.skipBaseCoverLetterTemplate) form.append("skipBaseCoverLetterTemplate", "true");

    return apiFetch<import("@/types/api").UserAiArtifact<import("@/types/api").CoverLetterPayload>>(
      routes.ai.coverLetterHelp(),
      { method: "POST", body: form }
    );
  },

  /**
   * Generic interview prep. Sends multipart/form-data.
   * resumeFile is optional — falls back to stored base resume if omitted.
   * At least one of targetField, targetRolesText, or additionalContext is required.
   */
  interviewPrep(fields: {
    targetField?:       string;
    targetRolesText?:   string;
    additionalContext?: string;
    resumeFile?:        File | null;
  }) {
    const form = new FormData();
    if (fields.targetField)       form.append("targetField",       fields.targetField);
    if (fields.targetRolesText)   form.append("targetRolesText",   fields.targetRolesText);
    if (fields.additionalContext) form.append("additionalContext", fields.additionalContext);
    if (fields.resumeFile)        form.append("resumeFile",        fields.resumeFile);

    return apiFetch<import("@/types/api").UserAiArtifact<import("@/types/api").InterviewPrepPayload>>(
      routes.ai.interviewPrep(),
      { method: "POST", body: form }
    );
  },
};