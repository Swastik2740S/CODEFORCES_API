"use client";

import { useState, useEffect } from "react";

export function useActivity(days = 365) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const API_BASE = process.env.NEXT_PUBLIC_URL;

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${API_BASE}/dashboard/activity?days=${days}`,
          { credentials: "include" }
        );

        if (!res.ok) throw new Error("Failed to fetch activity");

        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [days]);

  return { data, loading, error };
}