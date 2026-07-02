"use client";

import useOverview from "./useOverview";

// All insight hooks read their slice from the single shared /overview fetch —
// same return shapes as before, but the dashboard makes one request, not eight.

function useSlice(pick) {
  const { data, loading, error } = useOverview();
  return { data: data ? pick(data) : null, loading, error };
}

export function useContests(limit = 20) {
  const { data, loading, error } = useOverview();
  if (!data) return { data: null, loading, error };
  const contests = (data.contests?.contests ?? []).slice(0, limit);
  return { data: { contests, total: contests.length }, loading, error };
}

export function useRatingHistory() {
  return useSlice((d) => d.ratingHistory);
}
export function useVerdictStats() {
  return useSlice((d) => d.verdictStats);
}
export function useLanguageStats() {
  return useSlice((d) => d.languageStats);
}
export function useDifficultyStats() {
  return useSlice((d) => d.difficultyStats);
}
export function useAttemptsStats() {
  return useSlice((d) => d.attemptsStats);
}
export function useTagMastery() {
  return useSlice((d) => d.tagMastery);
}
export function useContestExtremes() {
  return useSlice((d) => d.contestExtremes);
}
