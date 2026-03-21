"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTagMastery } from "../hooks/useInsights";

function SuccessBar({ rate }) {
  // Orange-based color ramp matching the new theme
  const color =
    rate >= 80 ? "#34d399" : // Emerald (Great)
    rate >= 60 ? "#a3e635" : // Lime (Good)
    rate >= 40 ? "#fbbf24" : // Amber (Okay)
    rate >= 20 ? "#D85D3F" : // Brand Orange (Warning)
                 "#f87171";  // Red (Danger)

  return (
    <div className="flex items-center justify-end md:justify-start gap-2 w-full">
      {/* Hide the visual bar on extremely small screens to save space */}
      <div className="hidden sm:block flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden shadow-inner max-w-[80px] md:max-w-full">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${rate}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full"
          style={{ 
            background: color,
            boxShadow: `0 0 8px ${color}80` // Adds a subtle glow based on the rate color
          }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums w-9 text-right" style={{ color }}>
        {rate}%
      </span>
    </div>
  );
}

const SORT_OPTIONS = ["solved", "successRate", "avgDifficulty"];
const SORT_LABELS  = { solved: "Most Solved", successRate: "Best Rate", avgDifficulty: "Hardest" };

export default function TagMastery() {
  const { data, loading, error } = useTagMastery();
  const [sort, setSort]         = useState("solved");
  const [show, setShow]         = useState(12);

  // ── Glass Skeleton Loader ──
  if (loading) return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 sm:p-8 animate-pulse shadow-lg">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-white/5 mb-3 border border-white/5" />
      ))}
    </div>
  );

  // ── Empty State ──
  if (error || !data?.tagMastery?.length) return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 text-center shadow-lg">
      <p className="text-gray-500 text-sm italic">No tag data available yet.</p>
    </div>
  );

  // Sorting Logic
  const sortedTags = [...data.tagMastery].sort((a, b) => {
    if (sort === "avgDifficulty") return (b.avgDifficulty ?? 0) - (a.avgDifficulty ?? 0);
    return b[sort] - a[sort];
  });

  const visibleTags = sortedTags.slice(0, show);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl overflow-hidden shadow-lg flex flex-col"
    >
      {/* ── Header Area ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-5 sm:px-6 py-4 bg-white/5 border-b border-white/10">
        <span className="text-[10px] sm:text-xs uppercase tracking-widest text-gray-400 font-semibold">
          Tag Mastery <span className="text-gray-600 px-1">•</span> {data.totalTags} tags
        </span>
        
        {/* Sorting Pills */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {SORT_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`text-[10px] px-3 py-1.5 rounded-full transition-all duration-300 font-medium border ${
                sort === s
                  ? "bg-[#D85D3F]/20 text-[#D85D3F] border-[#D85D3F]/30 shadow-[0_0_10px_rgba(216,93,63,0.15)]"
                  : "bg-white/[0.03] text-gray-500 border-white/5 hover:text-gray-300 hover:bg-white/10"
              }`}
            >
              {SORT_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table Column Headers (Hidden on Mobile) ── */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/5 bg-white/[0.01]">
        <span className="col-span-4 text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Tag</span>
        <span className="col-span-2 text-[10px] uppercase tracking-widest text-gray-500 font-semibold text-right">Solved</span>
        <span className="col-span-2 text-[10px] uppercase tracking-widest text-gray-500 font-semibold text-right">Attempted</span>
        <span className="col-span-2 text-[10px] uppercase tracking-widest text-gray-500 font-semibold text-right">Avg Diff</span>
        <span className="col-span-2 text-[10px] uppercase tracking-widest text-gray-500 font-semibold text-right">Success Rate</span>
      </div>

      {/* ── Data Rows ── */}
      <div className="flex flex-col">
        {visibleTags.map((t, i) => (
          <motion.div
            key={t.tag}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.025, duration: 0.3 }}
            className="flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 px-5 sm:px-6 py-4 md:py-3 border-b border-white/5 hover:bg-white/[0.04] transition-colors duration-200 items-start md:items-center group"
          >
            {/* Tag Name (Top row on mobile, col 1 on desktop) */}
            <span className="col-span-4 text-sm sm:text-base text-gray-200 font-medium truncate capitalize w-full md:w-auto group-hover:text-white transition-colors">
              {t.tag}
            </span>
            
            {/* Mobile Data Row (Hidden on desktop) */}
            <div className="flex md:hidden items-center justify-between w-full mt-1">
              <div className="flex gap-4 text-xs">
                <span className="text-gray-400">Solved: <span className="text-white font-medium">{t.solved}</span></span>
                <span className="text-gray-400">Att: <span className="text-white font-medium">{t.attempted}</span></span>
                <span className="text-gray-400">Diff: <span className="text-white font-medium">{t.avgDifficulty ?? "—"}</span></span>
              </div>
              <div className="w-16">
                 <SuccessBar rate={t.successRate} />
              </div>
            </div>

            {/* Desktop Data Columns (Hidden on mobile) */}
            <span className="hidden md:block col-span-2 text-sm text-gray-300 tabular-nums text-right font-medium">
              {t.solved}
            </span>
            <span className="hidden md:block col-span-2 text-sm text-gray-500 tabular-nums text-right">
              {t.attempted}
            </span>
            <span className="hidden md:block col-span-2 text-sm text-gray-500 tabular-nums text-right">
              {t.avgDifficulty ?? "—"}
            </span>
            <div className="hidden md:block col-span-2">
              <SuccessBar rate={t.successRate} />
            </div>
            
          </motion.div>
        ))}
      </div>

      {/* ── Load More Button ── */}
      {show < sortedTags.length && (
        <div className="px-5 py-4 flex justify-center border-t border-white/5 bg-white/[0.01]">
          <button
            onClick={() => setShow((s) => s + 12)}
            className="text-xs text-gray-400 hover:text-[#D85D3F] hover:bg-[#D85D3F]/10 px-6 py-2 rounded-full transition-all duration-300 font-medium border border-transparent hover:border-[#D85D3F]/30"
          >
            Show more ({sortedTags.length - show} remaining)
          </button>
        </div>
      )}
    </motion.div>
  );
}