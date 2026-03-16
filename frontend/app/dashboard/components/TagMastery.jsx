"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useTagMastery } from "../hooks/useInsights";

function SuccessBar({ rate }) {
  const color =
    rate >= 80 ? "#34d399" :
    rate >= 60 ? "#a3e635" :
    rate >= 40 ? "#facc15" :
    rate >= 20 ? "#fb923c" : "#f87171";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${rate}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="text-xs tabular-nums w-9 text-right" style={{ color }}>
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

  if (loading) return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 animate-pulse">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-10 rounded bg-zinc-800 mb-2" />
      ))}
    </div>
  );

  if (error || !data?.tagMastery?.length) return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
      <p className="text-zinc-500 text-sm italic">No tag data yet.</p>
    </div>
  );

  const sorted = [...data.tagMastery].sort((a, b) => {
    if (sort === "avgDifficulty") return (b.avgDifficulty ?? 0) - (a.avgDifficulty ?? 0);
    return b[sort] - a[sort];
  });

  const visible = sorted.slice(0, show);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-zinc-800/40 border-b border-zinc-800">
        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
          Tag Mastery · {data.totalTags} tags
        </span>
        <div className="flex gap-1">
          {SORT_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`text-[10px] px-2.5 py-1 rounded-full transition-colors duration-150 font-medium ${
                sort === s
                  ? "bg-cyan-900/60 text-cyan-400 border border-cyan-800/50"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {SORT_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-12 gap-2 px-5 py-2 border-b border-zinc-800/40">
        {["Tag", "Solved", "Attempted", "Avg Diff", "Success Rate"].map((h, i) => (
          <span
            key={h}
            className={`text-[10px] uppercase tracking-widest text-zinc-600 font-medium ${
              i === 0 ? "col-span-3" :
              i === 4 ? "col-span-3" : "col-span-2"
            } ${i > 0 ? "text-right" : ""}`}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {visible.map((t, i) => (
        <motion.div
          key={t.tag}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.025, duration: 0.25 }}
          className="grid grid-cols-12 gap-2 px-5 py-2.5 border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors duration-100 items-center"
        >
          <span className="col-span-3 text-sm text-zinc-300 font-medium truncate capitalize">
            {t.tag}
          </span>
          <span className="col-span-2 text-sm text-zinc-200 tabular-nums text-right font-semibold">
            {t.solved}
          </span>
          <span className="col-span-2 text-sm text-zinc-500 tabular-nums text-right">
            {t.attempted}
          </span>
          <span className="col-span-2 text-sm text-zinc-500 tabular-nums text-right">
            {t.avgDifficulty ?? "—"}
          </span>
          <div className="col-span-3">
            <SuccessBar rate={t.successRate} />
          </div>
        </motion.div>
      ))}

      {/* Show more */}
      {show < sorted.length && (
        <div className="px-5 py-3 flex justify-center border-t border-zinc-800">
          <button
            onClick={() => setShow((s) => s + 12)}
            className="text-xs text-zinc-500 hover:text-cyan-400 transition-colors font-medium"
          >
            Show more ({sorted.length - show} remaining)
          </button>
        </div>
      )}
    </motion.div>
  );
}
