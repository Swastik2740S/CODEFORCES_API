"use client";
import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_URL;

function useInsight(endpoint, params = "") {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const url = `${API_BASE}/dashboard/${endpoint}${params ? `?${params}` : ""}`;
    setLoading(true);
    fetch(url, { credentials: "include" })
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [endpoint, params]);

  return { data, loading, error };
}

export function useContests(limit = 20) {
  return useInsight("contests", `limit=${limit}`);
}
export function useRatingHistory() {
  return useInsight("rating-history");
}
export function useVerdictStats() {
  return useInsight("verdict-stats");
}
export function useLanguageStats() {
  return useInsight("language-stats");
}
export function useDifficultyStats() {
  return useInsight("difficulty-stats");
}
export function useAttemptsStats() {
  return useInsight("attempts-stats");
}
export function useTagMastery() {
  return useInsight("tag-mastery");
}
export function useContestExtremes() {
  return useInsight("contest-extremes");
}
