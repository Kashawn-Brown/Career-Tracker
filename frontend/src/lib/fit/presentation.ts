// frontend/src/lib/fit/presentation.ts

export type FitBand = {
    label: string;
    stripeClass: string;
    badgeClass: string;
  };
  
  /**
   * Converts a numeric fit score into a UI "band" (label + styles).
   * Used across: table badge, drawer summary stripe, and fit report dialog.
   */
  export function getFitBand(score: number): FitBand {
    if (score >= 85) {
      return {
        label: "Strong fit",
        stripeClass: "border-l-green-500",
        badgeClass: "border-green-200 bg-green-50 text-green-700",
      };
    }
  
    if (score >= 70) {
      return {
        label: "Good fit",
        stripeClass: "border-l-emerald-500",
        badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    }
  
    if (score >= 50) {
      return {
        label: "Mixed fit",
        stripeClass: "border-l-amber-500",
        badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
      };
    }
  
    return {
      label: "Weak fit",
      stripeClass: "border-l-red-500",
      badgeClass: "border-red-200 bg-red-50 text-red-700",
    };
  }
  
  /**
   * Table-only convenience: badge class for a score.
   * (This is derived from the same band mapping to keep behavior consistent.)
   */
  export function getFitBadgeClass(score: number): string {
    return getFitBand(score).badgeClass;
  }
  