"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useContests } from "../hooks/useInsights";

// ── Components ──────────────────────────────────────────────────────────────

function RatingBadge({ change }) {
  if (change > 0) return (
    <span className="inline-flex items-center gap-0.5 text-emerald-400 font-semibold tabular-nums text-sm sm:text-base">
      +{change}
    </span>
  );
  if (change < 0) return (
    <span className="inline-flex items-center gap-0.5 text-red-400 font-semibold tabular-nums text-sm sm:text-base">
      {change}
    </span>
  );
  return <span className="text-gray-500 text-sm sm:text-base">±0</span>;
}

function RankBar({ rank, maxRank }) {
  // In competitive programming, lower rank is better. 
  // 100 - pct means a shorter bar for a worse rank, fuller bar for a better rank.
  const pct = Math.min((rank / maxRank) * 100, 100);
  return (
    <div className="flex items-center gap-2 justify-end">
      <span className="text-xs sm:text-sm text-gray-300 tabular-nums">
        #{rank.toLocaleString()}
      </span>
      {/* Hide the visual bar on tiny mobile screens to save space */}
      <div className="hidden sm:block w-12 lg:w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#D85D3F] shadow-[0_0_8px_rgba(216,93,63,0.8)]"
          style={{ width: `${100 - pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Main Dashboard Component ────────────────────────────────────────────────

export default function ContestHistory() {
  const [limit, setLimit] = useState(10);
  const { data, loading, error } = useContests(limit);

  // Loading State (Glass Skeleton)
  if (loading) return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl animate-pulse overflow-hidden shadow-lg">
      <div className="h-12 bg-white/5 border-b border-white/10" />
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-16 bg-white/[0.01] border-b border-white/5" />
      ))}
    </div>
  );

  // Empty/Error State
  if (error || !data?.contests?.length) return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 text-center shadow-lg">
      <p className="text-gray-500 text-sm italic">No contest history yet.</p>
    </div>
  );

  const maxRank = Math.max(...data.contests.map((c) => c.rank));

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl overflow-hidden shadow-lg">
      
      {/* ── Table Header (Hidden on Mobile) ── */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-white/5 border-b border-white/10">
        <span className="col-span-5 text-[10px] uppercase tracking-widest text-gray-500 font-medium">Contest</span>
        <span className="col-span-2 text-[10px] uppercase tracking-widest text-gray-500 font-medium">Date</span>
        <span className="col-span-2 text-[10px] uppercase tracking-widest text-gray-500 font-medium text-right">Rank</span>
        <span className="col-span-2 text-[10px] uppercase tracking-widest text-gray-500 font-medium text-right">Rating</span>
        <span className="col-span-1 text-[10px] uppercase tracking-widest text-gray-500 font-medium text-right">Change</span>
      </div>

      {/* ── Rows ── */}
      <div className="flex flex-col">
        {data.contests.map((c, i) => (
          <motion.div
            key={c.contestId}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03, duration: 0.3 }}
            // Switch from flex-col (mobile) to grid-cols-12 (desktop)
            className="flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 px-4 sm:px-6 py-4 border-b border-white/5 hover:bg-white/[0.04] transition-colors duration-200 items-start md:items-center group"
          >
            
            {/* Contest Name & Mobile Date */}
            <div className="md:col-span-5 flex flex-col min-w-0 w-full">
              <p className="text-sm sm:text-base text-gray-200 truncate font-medium group-hover:text-white transition-colors">
                {c.contestName}
              </p>
              {/* Date is shown here ONLY on mobile */}
              <p className="text-[10px] sm:text-xs text-gray-500 md:hidden mt-1">
                {new Date(c.date).toLocaleDateString("default", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </p>
            </div>

            {/* Date (Desktop Only) */}
            <div className="hidden md:block col-span-2">
              <p className="text-xs text-gray-400">
                {new Date(c.date).toLocaleDateString("default", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </p>
            </div>

            {/* Bottom Row Wrapper for Mobile / Standard Columns for Desktop */}
            <div className="flex items-center justify-between w-full md:contents mt-2 md:mt-0">
              
              {/* Rank */}
              <div className="md:col-span-2 flex justify-start md:justify-end">
                <RankBar rank={c.rank} maxRank={maxRank} />
              </div>

              {/* Rating & Change */}
              <div className="flex items-center justify-end gap-4 md:gap-0 md:col-span-3">
                <div className="md:w-2/3 text-right">
                  <span className="text-sm sm:text-base font-medium text-gray-300 tabular-nums">
                    <span className="text-gray-600 md:hidden mr-2 text-xs">Rating:</span>
                    {c.newRating}
                  </span>
                </div>
                
                <div className="md:w-1/3 text-right">
                  <RatingBadge change={c.ratingChange} />
                </div>
              </div>

            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Load More Button ── */}
      {data.contests.length >= limit && limit < 50 && (
        <div className="px-4 py-4 flex justify-center bg-white/[0.01]">
          <button
            onClick={() => setLimit((l) => l + 10)}
            className="text-xs text-gray-400 hover:text-[#D85D3F] hover:bg-[#D85D3F]/10 px-6 py-2 rounded-full transition-all duration-300 font-medium border border-transparent hover:border-[#D85D3F]/30"
          >
            Load previous contests
          </button>
        </div>
      )}
    </div>
  );
}