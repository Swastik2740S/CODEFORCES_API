"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import { motion } from "framer-motion";
import { useDifficultyStats } from "../hooks/useInsights";

// Vibrant CF-inspired color ramp matching your Glass UI
function getDiffColor(rating) {
  if (rating === "Unrated") return "#71717a"; // Gray
  const r = parseInt(rating);
  if (r <= 1199) return "#a1a1aa"; // Newbie (Gray)
  if (r <= 1399) return "#4ade80"; // Pupil (Green)
  if (r <= 1599) return "#22d3ee"; // Specialist (Cyan)
  if (r <= 1899) return "#60a5fa"; // Expert (Blue)
  if (r <= 2099) return "#c084fc"; // CM (Purple)
  if (r <= 2299) return "#fbbf24"; // Master (Yellow)
  if (r <= 2399) return "#D85D3F"; // IM (Brand Orange)
  return "#f87171"; // GM+ (Red)
}

function DiffTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl px-4 py-3 text-xs shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
      <p className="text-gray-300 font-semibold mb-1">
        Rating <span style={{ color: getDiffColor(d.rating) }}>{d.rating}</span>
      </p>
      <p className="text-white font-medium">
        {d.count} problem{d.count !== 1 ? "s" : ""} solved
      </p>
    </div>
  );
}

export default function DifficultyStats() {
  const { data, loading, error } = useDifficultyStats();

  const chartData = useMemo(() => {
    if (!data?.distribution) return [];
    return data.distribution;
  }, [data]);

  if (loading) return (
    <div className="w-full h-[250px] sm:h-[280px] rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl animate-pulse shadow-lg" />
  );

  if (error || !chartData.length) return (
    <div className="w-full h-[250px] sm:h-[280px] rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl flex items-center justify-center shadow-lg">
      <p className="text-gray-500 text-sm italic">No difficulty data available.</p>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <div className="flex items-center justify-between mb-6">
        <span className="text-[10px] sm:text-xs uppercase tracking-widest text-gray-400 font-semibold">
          Problems by Difficulty
        </span>
        <span className="text-[10px] sm:text-xs font-medium text-gray-500 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
          {data.totalSolved} solved
        </span>
      </div>
      
      {/* THE FIX: Strict height wrapper required for Recharts 
        ResponsiveContainer to calculate its drawing bounds. 
      */}
      <div className="w-full h-[250px] sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            margin={{ top: 10, right: 10, left: -20, bottom: 5 }} 
            maxBarSize={24}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            
            <XAxis
              dataKey="rating"
              tick={{ fontSize: 10, fill: "#71717a" }}
              axisLine={false} 
              tickLine={false}
              interval="preserveStartEnd"
              angle={-45}
              textAnchor="end"
              height={40}
              dy={10}
            />
            
            <YAxis
              tick={{ fontSize: 10, fill: "#71717a" }}
              axisLine={false} 
              tickLine={false}
              allowDecimals={false}
              dx={-10}
            />
            
            <Tooltip 
              content={<DiffTooltip />} 
              cursor={{ fill: "rgba(255,255,255,0.03)" }} 
            />
            
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell 
                  key={`cell-${i}`} 
                  fill={getDiffColor(entry.rating)} 
                  className="transition-all duration-300 hover:brightness-125"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}