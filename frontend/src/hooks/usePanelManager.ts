"use client";

import { useCallback, useRef } from "react";

/**
 * usePanelManager — centralised open/close coordination for drawer panels.
 *
 * Each panel registers a close function under a unique string ID. When any
 * panel opens it calls closeOthers(myId), which closes every other registered
 * panel without needing to know their identities. New panels are added by
 * simply registering — no new refs or wiring needed in the drawer.
 *
 * Usage (at the drawer level):
 *   const { registerPanel, closeOthers, closeAll } = usePanelManager();
 *
 * Usage (at the panel level, curried in the parent):
 *   onRegisterClose={(fn) => registerPanel("my-panel", fn)}
 *   onCloseOthers={() => closeOthers("my-panel")}
 */
export function usePanelManager() {
  // Map of panelId → close function. useRef so mutations don't cause re-renders.
  const registry = useRef<Map<string, () => void>>(new Map());

  /** Register a panel's close function. Call inside the panel's useEffect. */
  const registerPanel = useCallback((id: string, closeFn: () => void) => {
    registry.current.set(id, closeFn);
  }, []);

  /** Close every panel except the one with the given ID. */
  const closeOthers = useCallback((exceptId: string) => {
    registry.current.forEach((close, id) => {
      if (id !== exceptId) close();
    });
  }, []);

  /** Close every registered panel — used when the drawer itself closes. */
  const closeAll = useCallback(() => {
    registry.current.forEach((close) => close());
  }, []);

  return { registerPanel, closeOthers, closeAll };
}