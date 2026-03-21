"use client";

import { motion } from "framer-motion";
import { useLanguageStats } from "../hooks/useInsights";

// Vibrant premium palette starting with your Brand Orange
const BAR_COLORS = [
  "#D85D3F", // 1. Brand Orange
  "#F59E0B", // 2. Amber
  "#10B981", // 3. Emerald
  "#06B6D4", // 4. Cyan
  "#8B5CF6", // 5. Purple
  "#EC4899", // 6. Pink
  "#6366F1", // 7. Indigo
  "#14B8A6", // 8. Teal
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

  // ── Glass Skeleton Loader ──
  if (loading) return (
    <div className="w-full min-h-[260px] animate-pulse flex flex-col justify-center gap-5">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="flex justify-between">
            <div className="h-3 sm:h-4 bg-white/10 rounded w-20" />
            <div className="h-3 sm:h-4 bg-white/5 rounded w-12" />
          </div>
          <div 
            className="h-1.5 sm:h-2 rounded-full bg-white/10" 
            style={{ width: `${80 - i * 12}%` }} 
          />
        </div>
      ))}
    </div>
  );

  // ── Empty State ──
  if (error || !data?.languages?.length) return (
    <div className="w-full min-h-[260px] flex items-center justify-center">
      <p className="text-gray-500 text-sm italic">No language data available.</p>
    </div>
  );

  const top = data.languages.slice(0, 8);
  const max = top[0]?.count ?? 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-[10px] sm:text-xs uppercase tracking-widest text-gray-400 font-semibold">
          Languages Used
        </span>
        <span className="text-[10px] sm:text-xs font-medium text-gray-500 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
          {data.total.toLocaleString()} total
        </span>
      </div>

      {/* Language Bars */}
      <div className="flex flex-col gap-4 sm:gap-5 flex-1 justify-center">
        {top.map((lang, i) => {
          const color = BAR_COLORS[i % BAR_COLORS.length];
          
          return (
            <motion.div
              key={lang.language}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
              className="flex flex-col gap-1.5 sm:gap-2 group"
            >
              <div className="flex items-end justify-between">
                <span className="text-xs sm:text-sm text-gray-300 font-medium truncate pr-4 group-hover:text-white transition-colors">
                  {shortenLang(lang.language)}
                </span>
                <span className="text-[10px] sm:text-xs text-gray-500 tabular-nums whitespace-nowrap">
                  <span className="text-white font-medium mr-1.5">{lang.count.toLocaleString()}</span>
                  ({lang.percentage}%)
                </span>
              </div>
              
              {/* Glass Track */}
              <div className="h-1.5 sm:h-2 w-full rounded-full bg-white/5 overflow-hidden relative">
                {/* Glowing Fill */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(lang.count / max) * 100}%` }}
                  transition={{ delay: 0.2 + i * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute top-0 left-0 h-full rounded-full"
                  style={{ 
                    backgroundColor: color,
                    boxShadow: `0 0 10px ${color}80` // Adds a soft neon glow matching the bar color
                  }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}