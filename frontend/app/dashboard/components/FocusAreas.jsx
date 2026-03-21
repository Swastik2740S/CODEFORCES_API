"use client";

import { motion } from "framer-motion";
import useFocusAreas from "../hooks/useFocusAreas";

export default function FocusAreas({ refreshKey }) {
  const { data, loading } = useFocusAreas(refreshKey);

  // ── Loading State (Glass Skeleton) ──
  if (loading) {
    return (
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 h-full min-h-[300px] flex flex-col shadow-lg animate-pulse">
        {/* Fake Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1.5 h-6 rounded-full bg-white/10" />
          <div className="w-32 h-6 bg-white/5 rounded-md" />
        </div>
        
        {/* Fake Progress Bars */}
        <div className="space-y-6 flex-1 flex flex-col justify-center">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2.5">
              <div className="flex justify-between">
                <div className="w-24 h-3 bg-white/5 rounded-md" />
                <div className="w-8 h-3 bg-white/5 rounded-md" />
              </div>
              <div className="w-full h-[3px] bg-white/5 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Empty State ──
  if (!data || data.length === 0) {
    return (
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 h-full min-h-[300px] flex items-center justify-center shadow-lg">
        <div className="text-gray-500 font-serif italic text-sm text-center">
          No focus areas identified.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl h-full w-full flex flex-col">
      
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <div className="w-1.5 h-5 sm:h-6 rounded-full bg-[#D85D3F] shadow-[0_0_10px_rgba(216,93,63,0.6)]" />
        <h3 className="text-xl sm:text-2xl font-serif text-white tracking-wide">
          Focus Areas
        </h3>
      </div>

      {/* ── Progress Bars ── */}
      <div className="space-y-5 sm:space-y-6 flex-1 flex flex-col justify-center">
        {data.map((area, index) => (
          <motion.div
            key={area.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="group"
          >
            {/* Label & Value Row */}
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs sm:text-sm font-sans font-medium text-gray-400 capitalize group-hover:text-gray-200 transition-colors">
                {area.label}
              </span>
              <span className="text-xs sm:text-sm font-sans font-bold text-white tabular-nums">
                {area.value}%
              </span>
            </div>

            {/* Progress Bar Track: Darker glass track */}
            <div className="w-full h-[3px] bg-white/5 rounded-full overflow-hidden relative">
              {/* Progress Bar Fill: Neon Orange with heavy ease-out */}
              <motion.div
                className="absolute top-0 left-0 h-full bg-[#D85D3F] rounded-full shadow-[0_0_10px_rgba(216,93,63,0.8)]"
                initial={{ width: 0 }}
                animate={{ width: `${area.value}%` }}
                transition={{ 
                  duration: 1.2, 
                  ease: [0.22, 1, 0.36, 1], // "EaseOutQuint" for a heavy, premium feel
                  delay: 0.2 + (index * 0.1) 
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}