"use client";

import { motion } from "framer-motion";
import useFocusAreas from "../hooks/useFocusAreas";

export default function FocusAreas({ refreshKey }) {
  // Accepted refreshKey to trigger re-fetches when the dashboard syncs
  const { data, loading } = useFocusAreas(refreshKey);

  // Loading State: Minimalist, Serif, Italic
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-600 font-serif italic text-sm">
        Analyzing performance...
      </div>
    );
  }

  // Empty State
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-600 font-serif italic text-sm">
        No focus areas identified.
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header: Serif font matches the Dashboard Title */}
      <h3 className="text-xl font-serif text-white mb-6">
        Focus Areas
      </h3>

      <div className="space-y-6">
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
              <span className="text-sm font-sans font-medium text-zinc-400 capitalize group-hover:text-zinc-200 transition-colors">
                {area.label}
              </span>
              <span className="text-sm font-sans font-bold text-white">
                {area.value}%
              </span>
            </div>

            {/* Progress Bar Track: Very thin (h-[2px]) and dark */}
            <div className="w-full h-[2px] bg-zinc-800 rounded-full overflow-hidden">
              {/* Progress Bar Fill: White with a subtle glow */}
              <motion.div
                className="h-full bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]"
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