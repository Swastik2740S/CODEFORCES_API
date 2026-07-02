"use client";

import { useEffect } from "react";
import useOverview, { refreshOverview } from "./useOverview";

export default function useSummary(refreshKey = 0) {
  const { data, loading } = useOverview();

  // Bumped by the header after a sync completes — reload the shared overview
  // so every dashboard section refreshes, not just the summary cards.
  useEffect(() => {
    if (refreshKey > 0) refreshOverview();
  }, [refreshKey]);

  return { data: data?.summary ?? null, loading };
}
