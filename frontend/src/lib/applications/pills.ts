// frontend/src/lib/applications/pills.ts
import type { ApplicationStatus } from "@/types/api";

/**
 * Presentation-only Tailwind class tokens for pill badges.
 * Centralize these so table + homepage preview stay consistent.
 */

// Pill base class for all pills
export const PILL_BASE_CLASS =
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap";

// Neutral pill class for "All" status
export const PILL_NEUTRAL_CLASS = "bg-muted/40 text-foreground border-border";

export function getStatusPillTokens(
  status: ApplicationStatus
): { wrap: string; dot: string } {
  switch (status) {
    case "OFFER":
      return {
        wrap: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
        dot: "bg-green-600",
      };

    case "INTERVIEW":
      return {
        wrap: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
        dot: "bg-blue-600",
      };

    case "APPLIED":
      return {
        wrap: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20",
        dot: "bg-amber-600",
      };

    case "WISHLIST":
      return {
        wrap: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
        dot: "bg-purple-600",
      };

    case "REJECTED":
      return {
        wrap: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
        dot: "bg-red-600",
      };

    case "WITHDRAWN":
    default:
      return {
        wrap: "bg-muted/40 text-muted-foreground border-border",
        dot: "bg-muted-foreground",
      };
  }
}
