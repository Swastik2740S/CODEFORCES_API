"use client";

import { useState } from "react";
import { getRankColor } from "../../lib/cf";

// CF avatar with a rank-colored initial as fallback (shadow handles synced
// moments ago may not have an avatar yet; CF image URLs can also 404).
export default function Avatar({ handle, avatar, rating, size = "h-11 w-11" }) {
  const [broken, setBroken] = useState(false);
  if (avatar && !broken) {
    return (
      <img
        src={avatar}
        alt={handle}
        onError={() => setBroken(true)}
        className={`${size} rounded-full object-cover border border-white/10 shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${size} rounded-full flex items-center justify-center font-bold text-white shrink-0 border`}
      style={{
        backgroundColor: `${getRankColor(rating)}20`,
        borderColor: `${getRankColor(rating)}40`,
      }}
    >
      {handle?.[0]?.toUpperCase() || "?"}
    </div>
  );
}
