"use client";
import { motion } from "framer-motion";
import { useLanguageStats } from "../hooks/useInsights";

const BAR_COLORS = [
  "#06b6d4", "#8b5cf6", "#f97316", "#34d399",
  "#f472b6", "#60a5fa", "#fbbf24", "#a3e635",
];

// Shorten long language names like "GNU C++17 (64)" → "C++17"
function shortenLang(lang) {
  if (!lang) return "Unknown";
  return lang
    .replace(/GNU /i, "")
    .replace(/\(64\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function LanguageStats() {
  const { data, loading, error } = useLanguageStats();

  if (loading) return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 animate-pulse min-h-[260px]">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-7 rounded bg-zinc-800 mb-3" style={{ width: `${80 - i * 12}%` }} />
      ))}
    </div>
  );

  if (error || !data?.languages?.length) return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center min-h-[260px] flex items-center justify-center">
      <p className="text-zinc-500 text-sm italic">No language data.</p>
    </div>
  );

  const top = data.languages.slice(0, 8);
  const max = top[0]?.count ?? 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
          Languages Used
        </span>
        <span className="text-xs text-zinc-600">{data.total.toLocaleString()} total</span>
      </div>

      <div className="flex flex-col gap-3">
        {top.map((lang, i) => (
          <motion.div
            key={lang.language}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.35 }}
            className="flex flex-col gap-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300 font-medium">
                {shortenLang(lang.language)}
              </span>
              <span className="text-xs text-zinc-500 tabular-nums">
                {lang.count.toLocaleString()}
                <span className="text-zinc-600 ml-1">({lang.percentage}%)</span>
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(lang.count / max) * 100}%` }}
                transition={{ delay: 0.2 + i * 0.05, duration: 0.5, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: BAR_COLORS[i % BAR_COLORS.length] }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
