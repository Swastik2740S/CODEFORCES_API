"use client";

import { useEffect, useState } from "react";

export default function useSummary(refreshKey = 0) {
  const API_BASE = process.env.NEXT_PUBLIC_URL;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/dashboard/summary`, {
          credentials: "include",
          cache: "no-store",
        });

        const json = await res.json();

        if (alive) {
          setData(json);
        }
      } catch (err) {
        console.error("Failed to load dashboard summary", err);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      alive = false; 
    };
  }, [refreshKey]); 

  return { data, loading };
}
