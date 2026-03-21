"use client";

import { useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { useVerdictStats } from "../hooks/useInsights";

// Vibrant premium palette
const VERDICT_COLORS = {
  OK:                    "#10B981", // Emerald Green
  WRONG_ANSWER:          "#EF4444", // Bright Red
  TIME_LIMIT_EXCEEDED:   "#F59E0B", // Amber
  MEMORY_LIMIT_EXCEEDED: "#8B5CF6", // Purple
  RUNTIME_ERROR:         "#EC4899", // Pink
  COMPILATION_ERROR:     "#9CA3AF", // Gray
  PRESENTATION_ERROR:    "#FCD34D", // Pale Yellow
  IDLENESS_LIMIT_EXCEEDED: "#3B82F6", // Blue
};

const VERDICT_SHORT = {
  OK:                      "AC",
  WRONG_ANSWER:            "WA",
  TIME_LIMIT_EXCEEDED:     "TLE",
  MEMORY_LIMIT_EXCEEDED:   "MLE",
  RUNTIME_ERROR:           "RE",
  COMPILATION_ERROR:       "CE",
  PRESENTATION_ERROR:      "PE",
  IDLENESS_LIMIT_EXCEEDED: "ILE",
};

function VerdictTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl px-4 py-3 text-xs shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
      <p className="text-gray-300 font-semibold mb-1 pb-1 border-b border-white/10">{d.verdict}</p>
      <div className="flex gap-4 justify-between mt-2 text-white font-medium">
        <span>{d.count.toLocaleString()} submissions</span>
        <span style={{ color: d.color }}>{d.percentage}%</span>
      </div>
    </div>
  );
}

export default function VerdictStats() {
  const { data, loading, error } = useVerdictStats();

  const chartData = useMemo(() => {
    if (!data?.verdicts) return [];
    return data.verdicts.map((v) => ({
      ...v,
      short: VERDICT_SHORT[v.verdict] ?? v.verdict,
      color: VERDICT_COLORS[v.verdict] ?? "#71717a",
    }));
  }, [data]);

  // ── Glass Skeleton Loader ──
  if (loading) return (
    <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center gap-4 animate-pulse">
      <div className="w-32 h-32 rounded-full border-[10px] border-white/10 border-t-white/20 animate-spin" />
      <div className="h-4 w-24 bg-white/10 rounded-full mt-4" />
    </div>
  );

  // ── Empty State ──
  if (error || !chartData.length) return (
    <div className="w-full h-full min-h-[300px] flex items-center justify-center">
      <p className="text-gray-500 text-sm italic">No submission data available.</p>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex flex-col"
    >
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
        <span className="text-[10px] sm:text-xs uppercase tracking-widest text-gray-400 font-semibold">
          Verdict Breakdown
        </span>
        <span className="text-[10px] sm:text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full font-medium shadow-[0_0_10px_rgba(16,185,129,0.1)]">
          {data.acceptanceRate}% Acceptance
        </span>
      </div>

      {/* ── Responsive Layout: Stack on Mobile, Side-by-Side on Desktop ── */}
      <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 flex-1">
        
        {/* Donut Chart Container */}
        <div className="h-[180px] sm:h-[200px] w-full sm:w-1/2 flex justify-center relative">
          
          {/* Subtle background glow for the chart */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-emerald-500/10 blur-2xl rounded-full pointer-events-none" />
          
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={80} // Slightly thicker donut for modern look
                paddingAngle={3} // Wider gap between slices
                dataKey="count"
                stroke="none"
              >
                {chartData.map((entry, i) => (
                  <Cell 
                    key={i} 
                    fill={entry.color} 
                    className="transition-all duration-300 hover:opacity-80 cursor-pointer outline-none" 
                  />
                ))}
              </Pie>
              <Tooltip content={<VerdictTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* ── Legend ── */}
        <div className="w-full sm:w-1/2 flex flex-col gap-2.5 sm:gap-3">
          {chartData.slice(0, 6).map((v) => (
            <div 
              key={v.verdict} 
              className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-white/[0.03] transition-colors duration-200 group cursor-default"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Glowing Dot */}
                <div 
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" 
                  style={{ 
                    background: v.color,
                    boxShadow: `0 0 8px ${v.color}80` // Dynamic neon glow
                  }} 
                />
                <span className="text-xs sm:text-sm text-gray-300 truncate font-medium group-hover:text-white transition-colors">
                  {v.short}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs sm:text-sm text-gray-400 tabular-nums">
                  {v.count.toLocaleString()}
                </span>
                <span className="text-[10px] sm:text-xs text-gray-500 tabular-nums w-8 text-right font-medium">
                  {v.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </motion.div>
  );
}