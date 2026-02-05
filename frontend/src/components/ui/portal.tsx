"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

/**
 * Renders children into document.body.
 *
 * Useful for UI that must sit above modals/drawers (which often portal + create new stacking contexts).
 */
export function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid SSR/"document is not defined" issues.
  if (!mounted) return null;

  return createPortal(children, document.body);
}
