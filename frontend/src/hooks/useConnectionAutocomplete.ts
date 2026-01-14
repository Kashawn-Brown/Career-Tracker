"use client";

import { useEffect, useRef, useState } from "react";
import type { Connection } from "@/types/api";
import { connectionsApi } from "@/lib/api/connections";

/** 
 * Autocomplete the connections for a given name.
 * The hook will return the connections that match the given name.
 * Talks to the backend API to get the connections.
*/ 

export function useConnectionAutocomplete(name: string, enabled: boolean) {
  const [items, setItems] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const latestQueryRef = useRef("");

  // useEffect: fetches the connections when the name changes.
  useEffect(() => {
    if (!enabled) return;

    const q = name.trim();
    latestQueryRef.current = q;

    if (q.length < 2) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    // setTimeout: debounces the requests to the backend API.
    const t = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await connectionsApi.listConnections({
          page: 1,
          pageSize: 5,  // max 5 results
          name: q,
          sortBy: "name",
          sortDir: "asc",
        });

        // Ignore stale results
        if (latestQueryRef.current !== q) return;

        setItems(res.items);
      } finally {
        if (latestQueryRef.current === q) setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [name, enabled]);

  return { items, isLoading };
}
