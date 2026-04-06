/**
 * job-link-extraction.ts
 *
 * Safe server-side job-posting page fetcher and text extractor.
 *
 * Responsibilities:
 * - SSRF protection: block private/loopback/metadata IP ranges
 * - Fetch with timeout, redirect limit, and byte cap
 * - Extract canonical job text from JSON-LD JobPosting structured data (preferred)
 * - Fall back to cleaned visible page text if no structured data found
 * - Return a normalizedUrl + canonicalJdText ready for the extraction pipeline
 *
 * This module is intentionally self-contained and has no AI dependencies.
 */

import dns from "node:dns/promises";
import { AppError } from "../../errors/app-error.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS  = parseInt(process.env.JOB_LINK_FETCH_TIMEOUT_MS  ?? "10000", 10);
const FETCH_MAX_BYTES   = parseInt(process.env.JOB_LINK_FETCH_MAX_BYTES   ?? "2097152", 10); // 2 MB
const FETCH_USER_AGENT  = process.env.JOB_LINK_FETCH_USER_AGENT ?? "CareerTrackerBot/1.0 (+https://career-tracker.ca)";
const MAX_REDIRECTS     = 5;

// ─── SSRF guard ───────────────────────────────────────────────────────────────

/**
 * Returns true if the given IPv4 or IPv6 address is in a private,
 * loopback, or cloud-metadata range that should never be fetched.
 */
function isBlockedIp(ip: string): boolean {
  // IPv6 loopback
  if (ip === "::1" || ip === "0:0:0:0:0:0:0:1") return true;

  // IPv4-mapped IPv6 (::ffff:a.b.c.d) — unwrap and recheck
  const v4mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (v4mapped) return isBlockedIp(v4mapped[1]);

  // Parse dotted-decimal IPv4
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    // Not a plain IPv4 — treat as blocked if not parseable
    return false;
  }

  const [a, b] = parts;

  return (
    a === 10                              || // 10.0.0.0/8       private
    a === 127                             || // 127.0.0.0/8       loopback
    a === 0                               || // 0.0.0.0/8         "this network"
    (a === 172 && b >= 16 && b <= 31)    || // 172.16.0.0/12     private
    (a === 192 && b === 168)             || // 192.168.0.0/16    private
    (a === 169 && b === 254)             || // 169.254.0.0/16    link-local / cloud metadata
    (a === 100 && b >= 64 && b <= 127)   || // 100.64.0.0/10     shared address space
    (a === 192 && b === 0  && parts[2] === 0)   || // 192.0.0.0/24 IETF protocol
    (a === 192 && b === 0  && parts[2] === 2)   || // 192.0.2.0/24  TEST-NET-1
    (a === 198 && b === 51 && parts[2] === 100) || // 198.51.100.0/24 TEST-NET-2
    (a === 203 && b === 0  && parts[2] === 113) || // 203.0.113.0/24  TEST-NET-3
    a >= 240                               // 240.0.0.0/4      reserved
  );
}

/**
 * Validates and resolves the URL, throwing if:
 * - scheme is not http/https
 * - hostname resolves to a blocked IP range
 * Returns the normalized URL string.
 */
async function validateAndNormalizeUrl(raw: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AppError("Invalid URL format.", 400, "JOB_LINK_INVALID_URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AppError("Only http and https URLs are allowed.", 400, "JOB_LINK_INVALID_SCHEME");
  }

  // Resolve hostname to IPs and block private ranges (SSRF protection)
  let addresses: string[];
  try {
    const records = await dns.lookup(url.hostname, { all: true });
    addresses = records.map((r) => r.address);
  } catch {
    throw new AppError(
      "Could not resolve the hostname. Check the URL and try again.",
      422,
      "JOB_LINK_DNS_FAILURE"
    );
  }

  for (const addr of addresses) {
    if (isBlockedIp(addr)) {
      throw new AppError(
        "That URL points to a restricted address.",
        422,
        "JOB_LINK_BLOCKED_ADDRESS"
      );
    }
  }

  // Normalize: lowercase host, strip fragment, strip known tracking params
  url.hostname = url.hostname.toLowerCase();
  url.hash     = "";

  const TRACKING_PARAMS = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","fbclid","gclid","msclkid"];
  for (const p of TRACKING_PARAMS) url.searchParams.delete(p);

  return url.toString();
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

/**
 * Fetches the URL with a timeout, manual redirect handling, and byte cap.
 *
 * Why manual redirects:
 * Using redirect: "follow" lets the runtime follow redirects without
 * re-validating the destination. An attacker could register a public domain
 * that redirects to a private/metadata IP, bypassing the SSRF guard entirely.
 * By handling redirects manually we re-run the full IP validation on every
 * Location header before following it.
 */
async function fetchPage(normalizedUrl: string, signal?: AbortSignal): Promise<string> {
  const controller     = new AbortController();
  const timeoutId      = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const combinedSignal = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;

  let currentUrl = normalizedUrl;
  let response:   Response;
  let hops = 0;

  try {
    while (true) {
      response = await fetch(currentUrl, {
        signal:   combinedSignal,
        redirect: "manual",
        headers: {
          "User-Agent": FETCH_USER_AGENT,
          "Accept":     "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        },
      });

      const isRedirect = response.status >= 300 && response.status < 400;
      if (!isRedirect) break;

      if (hops >= MAX_REDIRECTS) {
        throw new AppError(
          "Too many redirects following job posting URL.",
          422,
          "JOB_LINK_TOO_MANY_REDIRECTS"
        );
      }

      const location = response.headers.get("location");
      if (!location) {
        throw new AppError("Redirect with no Location header.", 502, "JOB_LINK_FETCH_FAILED");
      }

      // Resolve relative redirect URLs against the current URL
      const redirectUrl = new URL(location, currentUrl).toString();

      // Re-validate the redirect destination — this is the SSRF fix.
      // validateAndNormalizeUrl re-runs DNS resolution + IP block checks.
      currentUrl = await validateAndNormalizeUrl(redirectUrl);
      hops++;
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err instanceof AppError) throw err;
    if (err?.name === "AbortError") {
      throw new AppError("Request to job URL timed out.", 504, "JOB_LINK_TIMEOUT");
    }
    throw new AppError("Failed to fetch the job posting page.", 502, "JOB_LINK_FETCH_FAILED");
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new AppError(
      `Job posting page returned HTTP ${response.status}.`,
      422,
      "JOB_LINK_HTTP_ERROR"
    );
  }

  // Content-type check — must be HTML or plain text
  const ct = (response.headers.get("content-type") ?? "").toLowerCase();
  if (!ct.includes("html") && !ct.includes("text")) {
    throw new AppError(
      "The URL did not return an HTML or text page.",
      422,
      "JOB_LINK_UNSUPPORTED_CONTENT"
    );
  }

  // Stream with byte cap
  const reader = response.body?.getReader();
  if (!reader) throw new AppError("Empty response body.", 502, "JOB_LINK_EMPTY_BODY");

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      totalBytes += value.byteLength;
      if (totalBytes > FETCH_MAX_BYTES) {
        reader.cancel();
        break; // truncate — we have enough text
      }
      chunks.push(value);
    }
  }

  return Buffer.concat(chunks).toString("utf-8");
}

// ─── JSON-LD extraction ───────────────────────────────────────────────────────

/**
 * Attempts to extract a JobPosting JSON-LD block from the page HTML.
 * Returns a clean text representation of the posting if found.
 */
function extractJsonLd(html: string): string | null {
  const scriptRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRe.exec(html)) !== null) {
    let data: any;
    try {
      data = JSON.parse(match[1]);
    } catch {
      continue;
    }

    // Support both single object and @graph array
    const candidates: any[] = Array.isArray(data)
      ? data
      : data?.["@graph"]
      ? data["@graph"]
      : [data];

    for (const item of candidates) {
      if (item?.["@type"] !== "JobPosting") continue;

      const parts: string[] = [];

      if (item.title)              parts.push(`Title: ${item.title}`);
      if (item.hiringOrganization?.name) parts.push(`Company: ${item.hiringOrganization.name}`);
      if (item.jobLocation?.address) {
        const addr = item.jobLocation.address;
        const loc  = [addr.addressLocality, addr.addressRegion, addr.addressCountry]
          .filter(Boolean).join(", ");
        if (loc) parts.push(`Location: ${loc}`);
      }
      if (item.employmentType)     parts.push(`Employment type: ${item.employmentType}`);
      if (item.datePosted)         parts.push(`Posted: ${item.datePosted}`);
      if (item.validThrough)       parts.push(`Expires: ${item.validThrough}`);
      if (item.baseSalary) {
        const s = item.baseSalary;
        const range = s.value?.minValue && s.value?.maxValue
          ? `${s.value.minValue}–${s.value.maxValue}`
          : s.value?.value ?? "";
        const currency = s.currency ?? s.value?.currency ?? "";
        const unit = s.value?.unitText ?? "";
        if (range) parts.push(`Salary: ${range} ${currency} ${unit}`.trim());
      }
      if (item.identifier?.value) parts.push(`Job ID: ${item.identifier.value}`);
      if (item.description) {
        // Strip HTML tags from the description field
        const desc = item.description
        .replace(/<[^>]+>/g, " ")   // strip real HTML tags
        .replace(/&amp;/g,  "&")    // decode entities — some sites store HTML-escaped descriptions
        .replace(/&lt;/g,   "<")    // (these look like &lt;div&gt; in the raw JSON-LD field)
        .replace(/&gt;/g,   ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g,  "'")
        .replace(/&nbsp;/g, " ")
        .replace(/<[^>]+>/g, " ")   // strip any real tags that were hiding behind entities
        .replace(/\s{2,}/g, " ")
        .trim();        
        parts.push("", desc);
      }

      if (parts.length > 1) return parts.join("\n");
    }
  }

  return null;
}

// ─── Fallback text extraction ─────────────────────────────────────────────────

/**
 * Strips HTML to produce clean plain text for the extraction prompt.
 *
 * Strategy:
 * 1. Remove all script/style/nav/header/footer/aside blocks (pure noise)
 * 2. Try to isolate the main content block (main, article, or a div/section
 *    whose class/id suggests job description content)
 * 3. Fall back to the full page if no main block found
 * 4. Strip remaining tags, decode entities, normalize whitespace
 * 5. Cap at 15k characters — generous for any job posting, prevents passing
 *    entire social network pages (similar jobs, footers, etc.) to the model
 */
function extractPlainText(html: string): string {
  const MAX_CHARS = 15_000;

  // Step 1: remove known noise blocks entirely
  let working = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "");

  // Step 2: try to find the main content block.
  // Prefer <main> or <article>, then look for a container whose class/id
  // contains common job-description keywords.
  const mainMatch =
    working.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ??
    working.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ??
    working.match(/<[^>]+(?:class|id)="[^"]*(?:job-description|jobDescription|job_description|description|job-detail|jobDetail|job-content|jobContent|posting-description)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section|article)>/i);

  const source = mainMatch ? mainMatch[1] : working;

  // Step 3: strip remaining tags and clean up
  return source
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g,  "&")
    .replace(/&lt;/g,   "<")
    .replace(/&gt;/g,   ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_CHARS);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type JobLinkExtractionResult = {
  normalizedUrl:   string;
  canonicalJdText: string;
  pageTitle?:      string;
};

/**
 * Validates, fetches, and extracts canonical job posting text from a URL.
 *
 * Strategy:
 * 1. SSRF guard — validate URL and resolve IP against blocked ranges
 * 2. Fetch page with timeout + byte cap
 * 3. Try JSON-LD JobPosting structured data first (cleaner)
 * 4. Fall back to stripped visible page text
 *
 * Throws AppError with a user-facing message on any failure.
 */
export async function extractJobPostingFromUrl(
  rawUrl: string,
  opts?: { signal?: AbortSignal }
): Promise<JobLinkExtractionResult> {
  // Step 1 — validate + SSRF guard
  const normalizedUrl = await validateAndNormalizeUrl(rawUrl);

  // Step 2 — fetch
  const html = await fetchPage(normalizedUrl, opts?.signal);

  // Step 3 — try JSON-LD
  const jsonLdText = extractJsonLd(html);
  if (jsonLdText && jsonLdText.trim().length > 100) {
    // Extract page <title> for context
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const pageTitle  = titleMatch ? titleMatch[1].trim() : undefined;

    return { normalizedUrl, canonicalJdText: jsonLdText.trim(), pageTitle };
  }

  // Step 4 — fallback to plain text
  const plainText = extractPlainText(html);
  if (plainText.length < 200) {
    throw new AppError(
      "Could not extract readable job posting content from that URL. Try pasting the job description manually.",
      422,
      "JOB_LINK_INSUFFICIENT_CONTENT"
    );
  }

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const pageTitle  = titleMatch ? titleMatch[1].trim() : undefined;

  return { normalizedUrl, canonicalJdText: plainText, pageTitle };
}