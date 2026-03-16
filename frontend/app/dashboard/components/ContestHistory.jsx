"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useContests } from "../hooks/useInsights";

function RatingBadge({ change }) {
  if (change > 0) return (
    <span className="inline-flex items-center gap-0.5 text-emerald-400 font-semibold tabular-nums text-sm">
      +{change}
    </span>
  );
  if (change < 0) return (
    <span className="inline-flex items-center gap-0.5 text-red-400 font-semibold tabular-nums text-sm">
      {change}
    </span>
  );
  return <span className="text-zinc-500 text-sm">±0</span>;
}

function RankBar({ rank, maxRank }) {
  const pct = Math.min((rank / maxRank) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-zinc-300 tabular-nums w-16 text-right">
        #{rank.toLocaleString()}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden max-w-[80px]">
        <div
          className="h-full rounded-full bg-cyan-600"
          style={{ width: `${100 - pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ContestHistory() {
  const [limit, setLimit] = useState(10);
  const { data, loading, error } = useContests(limit);

  if (loading) return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 animate-pulse">
      <div className="h-10 bg-zinc-800 rounded-t-2xl mb-px" />
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-12 bg-zinc-900 border-t border-zinc-800" />
      ))}
    </div>
  );

  if (error || !data?.contests?.length) return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
      <p className="text-zinc-500 text-sm italic">No contest history yet.</p>
    </div>
  );

  const maxRank = Math.max(...data.contests.map((c) => c.rank));

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-zinc-800/60 border-b border-zinc-800">
        {["Contest", "Date", "Rank", "Rating", "Change"].map((h, i) => (
          <span
            key={h}
            className={`text-[10px] uppercase tracking-widest text-zinc-500 font-medium ${
              i === 0 ? "col-span-4" : i === 1 ? "col-span-3" : "col-span-2"
            } ${i >= 2 ? "text-right" : ""}`}
          >
            {h}
          </span>
        ))}
        <span className="col-span-1" />
      </div>

      {/* Rows */}
      {data.contests.map((c, i) => (
        <motion.div
          key={c.contestId}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03, duration: 0.3 }}
          className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors duration-150 items-center"
        >
          {/* Contest name */}
          <div className="col-span-4 min-w-0">
            <p className="text-sm text-zinc-200 truncate font-medium">{c.contestName}</p>
          </div>

          {/* Date */}
          <div className="col-span-3">
            <p className="text-xs text-zinc-500">
              {new Date(c.date).toLocaleDateString("default", {
                day: "numeric", month: "short", year: "numeric",
              })}
            </p>
          </div>

          {/* Rank with mini bar */}
          <div className="col-span-2 flex justify-end">
            <RankBar rank={c.rank} maxRank={maxRank} />
          </div>

          {/* New rating */}
          <div className="col-span-2 text-right">
            <span className="text-sm text-zinc-300 tabular-nums">{c.newRating}</span>
          </div>

          {/* Rating change */}
          <div className="col-span-1 text-right">
            <RatingBadge change={c.ratingChange} />
          </div>
        </motion.div>
      ))}

      {/* Load more */}
      {data.contests.length >= limit && limit < 50 && (
        <div className="px-4 py-3 flex justify-center border-t border-zinc-800">
          <button
            onClick={() => setLimit((l) => l + 10)}
            className="text-xs text-zinc-500 hover:text-cyan-400 transition-colors duration-150 font-medium"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
