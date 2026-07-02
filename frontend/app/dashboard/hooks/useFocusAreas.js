"use client";

import useOverview from "./useOverview";

export default function useFocusAreas() {
  const { data, loading } = useOverview();
  return { data: data?.focusAreas?.focusAreas ?? [], loading };
}
