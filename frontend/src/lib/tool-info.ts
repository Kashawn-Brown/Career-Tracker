/**
 * tool-info.ts
 *
 * Plain-text explanations for each AI tool, shown in the ? info popover.
 * Defined centrally so Tools page and drawer cards stay consistent.
 *
 * Each string uses "\n\n" to separate paragraphs — the popover component
 * splits on these and renders each as its own <p> element.
 */

export const TOOL_INFO = {

    COMPATIBILITY_CHECK: {
      title: "Compatibility Check",
      content:
        "This tool analyses how well your profile lines up with the job based on " +
        "the application's job description and your resume.\n\n" +
        "It produces a match score (0–100), a fit label, and a breakdown of your " +
        "strengths and gaps relative to what the role requires.\n\n" +
        "By default it uses your saved base resume. You can optionally upload a " +
        "different resume file for this specific run — that file will be attached " +
        "to the application so you can reference it later.\n\n" +
        "A job description must be present on this application for the tool to run.",
    },
  
    RESUME_ADVICE: {
      title: "Resume Advice",
      content:
        "This tool reviews your resume in the context of this specific job and " +
        "gives you targeted, actionable advice to improve it for the role.\n\n" +
        "It covers what you should emphasise, what gaps exist, what keywords are " +
        "worth covering, and specific directional rewrites — without inventing " +
        "experience you don't have.\n\n" +
        "By default it uses your saved base resume. You can upload a different " +
        "resume for this run and it will be attached to the application.\n\n" +
        "A job description must be present on this application for the tool to run.",
    },
  
    COVER_LETTER: {
      title: "Cover Letter",
      content:
        "This tool generates a tailored draft cover letter for this specific role " +
        "using your resume and the job description.\n\n" +
        "The draft is grounded only in facts from your resume — it will never " +
        "invent experience or company details that aren't there. Placeholders " +
        "like [Hiring Manager Name] mark spots you'll need to fill in personally.\n\n" +
        "You can optionally upload an existing cover letter or template (.txt or .docx) " +
        "and the AI will build on its structure and tone instead of starting from scratch.\n\n" +
        "By default it uses your saved base resume. You can upload a different " +
        "resume for this run and it will be attached to the application.\n\n" +
        "A job description must be present on this application for the tool to run.",
    },
  
    GENERIC_RESUME_HELP: {
      title: "Resume Help",
      content:
        "This tool reviews your resume and gives you general improvement advice " +
        "based on the target field, roles, and keywords you provide.\n\n" +
        "It is not tied to a specific job — it is designed to help you strengthen " +
        "your resume for the kinds of roles you are generally going after.\n\n" +
        "If you have a base resume saved to your profile it will be used " +
        "automatically. You can also upload a different resume file just for this run.\n\n" +
        "Results are saved to your account so you can come back to them. " +
        "Up to 3 results are kept — the oldest is removed when you generate a new one.\n\n" +
        "For advice tailored to a specific job, create an application for that role " +
        "and use the Resume Advice tool in the application drawer.",
    },
  
    GENERIC_COVER_LETTER: {
      title: "Cover Letter Help",
      content:
        "This tool generates a reusable cover letter draft based on your resume " +
        "and the targeting information you provide.\n\n" +
        "It is not tied to a specific job — it produces a draft you can adapt and " +
        "personalise for different applications.\n\n" +
        "You can provide a target company, your motivation for the role, and any " +
        "additional context to make the draft more personal. You can also upload " +
        "an existing cover letter (.txt or .docx) for the AI to build on.\n\n" +
        "If you have a base resume saved to your profile it will be used " +
        "automatically. You can also upload a different resume file just for this run.\n\n" +
        "Results are saved to your account. Up to 3 results are kept.\n\n" +
        "For a cover letter tailored to a specific job, create an application for " +
        "that role and use the Cover Letter tool in the application drawer.",
    },
  
  } as const;