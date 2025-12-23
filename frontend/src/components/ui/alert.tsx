import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Alert UI component for displaying status messages
const alertVariants = cva(
  "w-full rounded-md border px-4 py-3 text-sm",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        muted: "bg-muted/30 text-foreground",
        destructive: "border-destructive/30 bg-destructive/10 text-destructive",
        success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
        warning: "border-orange-500/30 bg-orange-500/10 text-orange-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// Alert component
function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Alert };
