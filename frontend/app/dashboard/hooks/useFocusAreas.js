"use client";

import { useEffect, useState } from "react";

export default function useFocusAreas(refreshKey) {
  const API_BASE = process.env.NEXT_PUBLIC_URL;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // ✅ Guard INSIDE effect, not outside
      if (!API_BASE) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const res = await fetch(`${API_BASE}/dashboard/focus-areas`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) throw new Error("Request failed");

        const json = await res.json();

        if (!cancelled) {
          setData(json.focusAreas || []);
        }
      } catch (err) {
        console.error("Failed to load focus areas", err);
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [API_BASE, refreshKey]); // ✅ stable & constant

  return { data, loading };
}
