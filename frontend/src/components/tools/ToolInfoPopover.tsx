"use client";

import { HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Props {
  title:   string;
  content: string; // plain-text explanation shown in the popover
}

/**
 * ToolInfoPopover — small ? button that opens a plain-text explanation
 * of what a tool does, what inputs it needs, and what to expect.
 *
 * Used in every tool card header (Tools page + drawer) so users can
 * learn more without cluttering the card UI itself.
 */
export function ToolInfoPopover({ title, content }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`About ${title}`}
          className="shrink-0 rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-4 text-sm space-y-1.5" align="end">
        <div className="font-medium text-foreground">{title}</div>
        {/* Render each newline-separated paragraph as its own block */}
        {content.split("\n\n").map((para, i) => (
          <p key={i} className="text-muted-foreground leading-relaxed">
            {para}
          </p>
        ))}
      </PopoverContent>
    </Popover>
  );
}