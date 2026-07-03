// Shared Codeforces helpers for pages outside the dashboard.

export const API = "/api";

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// CF rank color ramp (matches RatingHistoryChart's palette).
export function getRankColor(rating) {
  if (rating == null) return "#a1a1aa";
  if (rating >= 2400) return "#f87171"; // Grandmaster (Red)
  if (rating >= 2100) return "#fbbf24"; // Master (Yellow)
  if (rating >= 1900) return "#c084fc"; // CM (Purple)
  if (rating >= 1600) return "#60a5fa"; // Expert (Blue)
  if (rating >= 1400) return "#22d3ee"; // Specialist (Cyan)
  if (rating >= 1200) return "#4ade80"; // Pupil (Green)
  return "#a1a1aa";                     // Newbie/Unrated (Gray)
}

export function timeAgo(date) {
  if (!date) return "never";
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString("default", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
