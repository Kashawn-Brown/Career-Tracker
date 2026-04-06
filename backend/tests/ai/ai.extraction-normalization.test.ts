/**
 * Unit tests for AI extraction normalization.
 *
 * Tests run against normalizeApplicationFromJdResponse() and cleanJdText()
 * which are the public entry points for all normalization logic.
 * Individual helpers (normalizeTagsText, normalizeJobLink, etc.) are tested
 * indirectly through the fields they control.
 */

import { describe, it, expect } from "vitest";
import {
  normalizeApplicationFromJdResponse,
  cleanJdText,
  sanitizeJdForModerationRetry,
  type ApplicationFromJdResponse,
  type DraftSource,
} from "../../modules/ai/ai.dto.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TEXT_SOURCE: DraftSource = {
  mode:            "TEXT",
  canonicalJdText: "some jd text",
};

/**
 * Build a minimal raw response with only the fields under test populated.
 * Keeps test cases readable — only the field being tested is non-empty.
 */
function raw(extracted: Partial<ApplicationFromJdResponse["extracted"]>): ApplicationFromJdResponse {
  return {
    extracted: {
      company:  "Acme",
      position: "Engineer",
      notes:    [],
      ...extracted,
    },
    ai:     { jdSummary: "summary" },
    source: TEXT_SOURCE,
  };
}

function normalize(extracted: Partial<ApplicationFromJdResponse["extracted"]>) {
  return normalizeApplicationFromJdResponse(raw(extracted), TEXT_SOURCE).extracted;
}


// ── Tags ──────────────────────────────────────────────────────────────────────

describe("normalization > tagsText", () => {
  it("passes a clean comma-separated list through unchanged", () => {
    const r = normalize({ tagsText: "TypeScript, Node.js, PostgreSQL" });
    expect(r.tagsText).toBe("TypeScript, Node.js, PostgreSQL");
  });

  it("splits on semicolons and normalizes spacing", () => {
    const r = normalize({ tagsText: "TypeScript;Node.js;PostgreSQL" });
    expect(r.tagsText).toBe("TypeScript, Node.js, PostgreSQL");
  });

  it("splits on newlines", () => {
    const r = normalize({ tagsText: "TypeScript\nNode.js\nPostgreSQL" });
    expect(r.tagsText).toBe("TypeScript, Node.js, PostgreSQL");
  });

  it("deduplicates case-insensitively, keeps first-seen casing", () => {
    const r = normalize({ tagsText: "Node.js, node.js, NODE.JS, TypeScript" });
    expect(r.tagsText).toBe("Node.js, TypeScript");
  });

  it("trims whitespace around each token", () => {
    const r = normalize({ tagsText: "  TypeScript ,  Node.js ,  PostgreSQL  " });
    expect(r.tagsText).toBe("TypeScript, Node.js, PostgreSQL");
  });

  it("returns undefined for empty or placeholder values", () => {
    expect(normalize({ tagsText: "" }).tagsText).toBeUndefined();
    expect(normalize({ tagsText: "n/a" }).tagsText).toBeUndefined();
  });
});


// ── Job link ──────────────────────────────────────────────────────────────────

describe("normalization > jobLink", () => {
  it("passes a clean https URL through", () => {
    const r = normalize({ jobLink: "https://jobs.example.com/posting/123" });
    expect(r.jobLink).toBe("https://jobs.example.com/posting/123");
  });

  it("lowercases the hostname", () => {
    const r = normalize({ jobLink: "https://JOBS.Example.COM/posting/123" });
    expect(r.jobLink).toBe("https://jobs.example.com/posting/123");
  });

  it("strips utm_* tracking params", () => {
    const r = normalize({
      jobLink: "https://jobs.example.com/posting/123?utm_source=linkedin&utm_medium=email&ref=homepage",
    });
    expect(r.jobLink).toBe("https://jobs.example.com/posting/123?ref=homepage");
  });

  it("strips fbclid and gclid", () => {
    const r = normalize({
      jobLink: "https://jobs.example.com/posting/123?fbclid=abc123&gclid=xyz456",
    });
    expect(r.jobLink).toBe("https://jobs.example.com/posting/123");
  });

  it("strips the fragment (#...)", () => {
    const r = normalize({ jobLink: "https://jobs.example.com/posting/123#apply" });
    expect(r.jobLink).toBe("https://jobs.example.com/posting/123");
  });

  it("preserves non-tracking query params", () => {
    const r = normalize({ jobLink: "https://jobs.example.com/search?q=engineer&location=Toronto" });
    expect(r.jobLink).toBe("https://jobs.example.com/search?q=engineer&location=Toronto");
  });

  it("returns undefined for non-http/https schemes", () => {
    expect(normalize({ jobLink: "ftp://files.example.com/jobs" }).jobLink).toBeUndefined();
    expect(normalize({ jobLink: "file:///etc/passwd" }).jobLink).toBeUndefined();
  });

  it("returns undefined for non-URL strings", () => {
    expect(normalize({ jobLink: "not a url" }).jobLink).toBeUndefined();
  });

  it("returns undefined for empty/placeholder values", () => {
    expect(normalize({ jobLink: "" }).jobLink).toBeUndefined();
    expect(normalize({ jobLink: "n/a" }).jobLink).toBeUndefined();
  });
});


// ── Location ──────────────────────────────────────────────────────────────────

describe("normalization > location", () => {
  it("passes a correctly formatted location through", () => {
    expect(normalize({ location: "Toronto, ON" }).location).toBe("Toronto, ON");
  });

  it("expands full province name to abbreviation", () => {
    expect(normalize({ location: "Toronto, Ontario" }).location).toBe("Toronto, ON");
  });

  it("expands full US state name to abbreviation", () => {
    expect(normalize({ location: "San Francisco, California" }).location).toBe("San Francisco, CA");
  });

  it("handles lowercase province names", () => {
    expect(normalize({ location: "Toronto, ontario" }).location).toBe("Toronto, ON");
  });

  it("preserves +N suffix", () => {
    expect(normalize({ location: "Toronto, Ontario +2" }).location).toBe("Toronto, ON +2");
  });

  it("preserves country-only values", () => {
    expect(normalize({ location: "Canada" }).location).toBe("Canada");
    expect(normalize({ location: "United States" }).location).toBe("United States");
  });

  it("does not abbreviate standalone province with no city", () => {
    expect(normalize({ location: "Ontario" }).location).toBe("Ontario");
    expect(normalize({ location: "California" }).location).toBe("California");
  });

  it("preserves international city/country locations", () => {
    expect(normalize({ location: "London, UK" }).location).toBe("London, UK");
  });

  it("returns undefined for empty/placeholder values", () => {
    expect(normalize({ location: "" }).location).toBeUndefined();
    expect(normalize({ location: "remote" }).location).toBe("remote"); // not stripped — not a placeholder
  });
});


// ── Salary ────────────────────────────────────────────────────────────────────

describe("normalization > salaryText", () => {
  it("passes a well-formatted range through", () => {
    const r = normalize({ salaryText: "$80,000 – $120,000 CAD" });
    expect(r.salaryText).toBe("$80,000 – $120,000 CAD");
  });

  it("expands k shorthand", () => {
    const r = normalize({ salaryText: "80k-120k" });
    expect(r.salaryText).toContain("$80,000");
    expect(r.salaryText).toContain("$120,000");
  });

  it("expands decimal k shorthand", () => {
    const r = normalize({ salaryText: "61.6k-113.9k" });
    expect(r.salaryText).toContain("$61,600");
    expect(r.salaryText).toContain("$113,900");
  });

  it("standardizes range separator to em-dash", () => {
    const r = normalize({ salaryText: "$80,000-$120,000" });
    expect(r.salaryText).toContain("–"); // em-dash
    expect(r.salaryText).not.toContain("--");
  });

  it("moves currency to end", () => {
    const r = normalize({ salaryText: "CAD 80k-120k" });
    expect(r.salaryText).toMatch(/CAD$/);
  });

  it("adds $ prefix to bare numbers", () => {
    const r = normalize({ salaryText: "80000 – 120000" });
    // commas are only added during k-expansion; bare integers get $ prefix only
    expect(r.salaryText).toContain("$80000");
    expect(r.salaryText).toContain("$120000");
  });

  it("preserves hourly rate format", () => {
    const r = normalize({ salaryText: "$25/hr" });
    expect(r.salaryText).toContain("/hr");
  });

  it("returns undefined for empty string", () => {
    expect(normalize({ salaryText: "" }).salaryText).toBeUndefined();
  });
});


// ── Notes ─────────────────────────────────────────────────────────────────────

describe("normalization > notes", () => {
  it("passes a clean notes array through", () => {
    const r = normalize({ notes: ["TypeScript required", "Remote-first culture"] });
    expect(r.notes).toEqual(["TypeScript required", "Remote-first culture"]);
  });

  it("deduplicates identical bullets case-insensitively", () => {
    const r = normalize({ notes: ["TypeScript required", "typescript required", "Remote-first"] });
    expect(r.notes).toEqual(["TypeScript required", "Remote-first"]);
  });

  it("hoists a Job ID bullet to the first position", () => {
    const r = normalize({
      notes: [
        "TypeScript required",
        "Remote-first culture",
        "Job ID: R260003457",
        "5+ years experience",
      ],
    });
    expect(r.notes![0]).toBe("Job ID: R260003457");
    expect(r.notes!.length).toBe(4);
  });

  it("hoists Requisition ID variants to first position", () => {
    const notes = ["TypeScript required", "Req #: P71181", "Remote-first"];
    const r = normalize({ notes });
    expect(r.notes![0]).toBe("Req #: P71181");
  });

  it("caps at 20 items", () => {
    const many = Array.from({ length: 25 }, (_, i) => `Note ${i}`);
    const r = normalize({ notes: many });
    expect(r.notes!.length).toBe(20);
  });

  it("returns empty array for null/empty input", () => {
    expect(normalize({ notes: [] }).notes).toEqual([]);
  });
});


// ── cleanJdText ───────────────────────────────────────────────────────────────

describe("cleanJdText", () => {
  it("collapses 3+ consecutive blank lines to a single blank line", () => {
    const input  = "Paragraph one.\n\n\n\nParagraph two.";
    const result = cleanJdText(input);
    expect(result).toBe("Paragraph one.\n\nParagraph two.");
  });

  it("does not collapse 2 blank lines", () => {
    const input  = "Paragraph one.\n\nParagraph two.";
    const result = cleanJdText(input);
    expect(result).toBe("Paragraph one.\n\nParagraph two.");
  });

  it("replaces non-breaking spaces with regular spaces", () => {
    const input  = "Job\u00A0Title:\u00A0Engineer";
    const result = cleanJdText(input);
    expect(result).toBe("Job Title: Engineer");
  });

  it("strips zero-width characters", () => {
    const input  = "Job\u200BTitle\u200C Engineer";
    const result = cleanJdText(input);
    expect(result).not.toContain("\u200B");
    expect(result).not.toContain("\u200C");
  });

  it("normalizes CRLF line endings to LF", () => {
    const input  = "Line one\r\nLine two\r\nLine three";
    const result = cleanJdText(input);
    expect(result).not.toContain("\r");
    expect(result).toBe("Line one\nLine two\nLine three");
  });

  it("trims leading and trailing whitespace", () => {
    const input  = "   \n\nSome JD text\n\n   ";
    const result = cleanJdText(input);
    expect(result).toBe("Some JD text");
  });
});


// ── sanitizeJdForModerationRetry ─────────────────────────────────────────────

describe("sanitizeJdForModerationRetry", () => {
  it("replaces http(s) URLs with a placeholder", () => {
    const input = "Apply at https://jobs.example.com/role?id=1 today.";
    expect(sanitizeJdForModerationRetry(input)).toBe("Apply at [link] today.");
  });

  it("replaces bare www links with a placeholder", () => {
    const input = "See www.example.com/careers for more.";
    expect(sanitizeJdForModerationRetry(input)).toBe("See [link] for more.");
  });

  it("replaces email addresses with a placeholder", () => {
    const input = "Contact hr.team@company.co.uk for details.";
    expect(sanitizeJdForModerationRetry(input)).toBe("Contact [email] for details.");
  });
});


// ── source passthrough ────────────────────────────────────────────────────────

describe("normalization > source passthrough", () => {
  it("attaches the TEXT source to the response", () => {
    const source: DraftSource = {
      mode:            "TEXT",
      canonicalJdText: "some jd",
    };
    const result = normalizeApplicationFromJdResponse(raw({}), source);
    expect(result.source.mode).toBe("TEXT");
    expect(result.source.canonicalJdText).toBe("some jd");
    expect(result.source.sourceUrl).toBeUndefined();
  });

  it("attaches the LINK source with sourceUrl to the response", () => {
    const source: DraftSource = {
      mode:            "LINK",
      canonicalJdText: "fetched job text",
      sourceUrl:       "https://jobs.example.com/123",
    };
    const result = normalizeApplicationFromJdResponse(raw({}), source);
    expect(result.source.mode).toBe("LINK");
    expect(result.source.sourceUrl).toBe("https://jobs.example.com/123");
  });
});