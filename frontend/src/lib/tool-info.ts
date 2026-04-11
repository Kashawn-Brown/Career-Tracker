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

  JD_EXTRACTION: {
    title: "JD Extraction",
    content:
      "Paste a job description or provide a link and we will extract the key details " +
      "into a structured draft application — company, role, location, type, salary range, " +
      "and a plain-English summary of what the role is looking for.\n\n" +
      "The draft is fully editable before you save it, so you can correct or fill in " +
      "anything the extraction missed.\n\n" +
      "Credit cost: 1 credit per run.",
  },

  COMPATIBILITY_CHECK: {
    title: "Compatibility Check",
    content:
      "This tool analyses how well your profile lines up with the job based on " +
      "the application's job description and your resume / CV.\n\n" +
      "It produces a match score (0–100), a fit label, and a breakdown of your " +
      "strengths, gaps, what the role is prioritising, and areas worth brushing up on.\n\n" +
      "By default it uses your saved base resume. You can optionally upload a " +
      "different resume file for this specific run. That file will be attached " +
      "to the application so you can reference it later.\n\n" +
      "For best results you can consider using a full CV covering all of your skills, experience, projects and achievements.\n\n" +
      "A job description must be present on this application for the tool to run. The tool will only use the job description and your resume / CV to generate the report.\n\n" +
      "To prepare for an interview for this role — including likely questions and topics to study — use the Interview Prep tool.\n\n" +
      "Credit cost: 2 credits per run.",
  },

  RESUME_ADVICE: {
    title: "Resume Advice",
    content:
      "This tool reviews your resume in the context of this specific job and " +
      "gives you targeted, actionable advice to improve and tailor it for the role.\n\n" +
      "It covers what you should emphasise, what gaps exist, what keywords are " +
      "worth covering, and specific directional rewrites — without inventing " +
      "experiences you don't have.\n\n" +
      "By default it uses your saved base resume. You can upload a different " +
      "resume for this run and it will be attached to the application.\n\n" +
      "A job description must be present on this application for the tool to run.\n\n" + 
      "For generic resume advice targetted to your field, use the resume help tool on the Tools page.\n\n" +
      "Credit cost: 2 credits per run.",
  },

  COVER_LETTER: {
    title: "Cover Letter",
    content:
      "This tool generates a tailored draft cover letter for this specific role " +
      "using your resume and the job description.\n\n" +
      "The draft is grounded only in facts from your resume — it will never " +
      "invent experience or company details that aren't there. Placeholders " +
      "mark spots you'll need to fill in personally.\n\n" +
      "You can optionally upload an existing cover letter or template (.txt or .docx) " +
      "and we will build on its structure and tone instead of starting from scratch.\n\n" +
      "By default it uses your saved base resume. You can upload a different " +
      "resume for this run and it will be attached to the application.\n\n" +
      "A job description must be present on this application for the tool to run.\n\n" +
      "Credit cost: 3 credits per run.",
  },

  INTERVIEW_PREP: {
    title: "Interview Prep",
    content:
      "This tool generates a personalised interview prep pack for this specific role " +
      "using the job description and your resume.\n\n" +
      "It covers the topics you should focus on, questions you are likely to be asked " +
      "across background, technical, behavioural, situational, and motivational areas, " +
      "challenge questions that may probe your weaknesses relative to this role, and " +
      "strong questions for you to ask the interviewer.\n\n" +
      "It does not generate answers — the goal is to surface what to prepare, " +
      "not to script your responses.\n\n" +
      "A job description must be present on this application for the tool to run. " +
      "Resume is optional but produces richer, more personalised output when provided.\n\n" +
      "For general interview prep not tied to a specific role, use the Interview Prep " +
      "tool on the Tools page.\n\n" +
      "Credit cost: 3 credits per run.",
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
      "and use the Resume Advice tool in the application drawer.\n\n" +
      "Credit cost: 2 credits per run.",
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
      "that role and use the Cover Letter tool in the application drawer.\n\n" +
      "Credit cost: 3 credits per run.",
  },

  GENERIC_INTERVIEW_PREP: {
    title: "Interview Prep",
    content:
      "This tool helps you prepare to explain and defend your own background — " +
      "your career history, projects, decisions, and skills.\n\n" +
      "It generates focus topics, a question bank across multiple interview styles " +
      "(background, technical, behavioural, situational, motivational), and questions " +
      "you should ask in return.\n\n" +
      "It does not generate answers — the goal is to surface what you should be " +
      "ready to discuss, not to script your responses.\n\n" +
      "Provide at least a target field or roles so the prep has direction. " +
      "A resume is required — without it the output would be generic boilerplate " +
      "not grounded in your actual experience.\n\n" +
      "Results are saved to your account. Up to 3 results are kept.\n\n" +
      "For prep tailored to a specific role, create an application and use the " +
      "Interview Prep tool in the application drawer.\n\n" +
      "Credit cost: 3 credits per run.",
  },

} as const;