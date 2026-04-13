/**
 * ToolEntitlementGate
 *
 * Shared entitlement UI for AI tool surfaces.
 *
 * - CreditCostNote: shows "Uses X credits" for REGULAR users only. PRO sees nothing.
 * - BlockedRunButton: replaces the normal run button when the user is out of credits.
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";

// ─── Credit cost note ─────────────────────────────────────────────────────────

interface CreditCostNoteProps {
  plan:  string;
  cost:  number;
}

/**
 * Renders a subtle "Uses X credits" note for REGULAR users.
 * Returns null for PRO / PRO_PLUS so their UI stays clean.
 */
export function CreditCostNote({ plan, cost }: CreditCostNoteProps) {
  if (plan !== "REGULAR") return null;

  return (
    <p className="text-xs text-muted-foreground text-right">
      Uses {cost} {cost === 1 ? "credit" : "credits"}
    </p>
  );
}


// ─── Blocked run button ───────────────────────────────────────────────────────

interface BlockedRunButtonProps {
  plan: string;
}

/**
 * Shown instead of the normal run button when the user has exhausted their
 * monthly credits. Explains the situation and surfaces the relevant next action.
 */
export function BlockedRunButton({ plan }: BlockedRunButtonProps) {
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2">
      <p className="text-sm font-medium text-destructive">
        Monthly credit limit reached
      </p>
      <p className="text-xs text-muted-foreground">
        Your credits will reset at the start of next month. You can request more credits from your profile.
      </p>
      <div className="flex gap-2 pt-1">
        <Button asChild size="sm" variant="outline">
          <Link href="/profile">
            Request more credits
          </Link>
        </Button>
      </div>
    </div>
  );
}