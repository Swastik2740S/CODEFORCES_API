"use client";

import { useEffect, useState } from "react";

export default function useSummary() {
  const API_BASE = process.env.NEXT_PUBLIC_URL;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/dashboard/summary`, {
          credentials: "include",
          cache: "no-store"
        });
        const json = await res.json();
        setData(json);
      } catch {
        console.error("Failed to load dashboard summary");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return { data, loading };
}
