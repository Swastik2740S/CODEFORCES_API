"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import { useRatingHistory } from "../hooks/useInsights";

// Vibrant CF-inspired color ramp matching your Glass UI
function getRankColor(rating) {
  if (rating >= 2400) return "#f87171"; // Grandmaster (Red)
  if (rating >= 2100) return "#fbbf24"; // Master (Yellow)
  if (rating >= 1900) return "#c084fc"; // CM (Purple)
  if (rating >= 1600) return "#60a5fa"; // Expert (Blue)
  if (rating >= 1400) return "#22d3ee"; // Specialist (Cyan)
  if (rating >= 1200) return "#4ade80"; // Pupil (Green)
  return "#a1a1aa";                     // Newbie/Unrated (Gray)
}

const RANK_LINES = [
  { y: 1200, label: "Pupil",       color: "#4ade80" },
  { y: 1400, label: "Specialist",  color: "#22d3ee" },
  { y: 1600, label: "Expert",      color: "#60a5fa" },
  { y: 1900, label: "Candidate Master", color: "#c084fc" },
  { y: 2100, label: "Master",      color: "#fbbf24" },
  { y: 2400, label: "Grandmaster", color: "#f87171" },
];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  
  return (
    <div className="rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl px-4 py-3 text-xs shadow-[0_4px_20px_rgba(0,0,0,0.5)] min-w-[180px]">
      <p className="text-gray-300 mb-3 font-semibold truncate max-w-[200px] border-b border-white/10 pb-2">
        {d.contestName}
      </p>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Rating</span>
          <span className="font-bold tabular-nums drop-shadow-md" style={{ color: getRankColor(d.rating) }}>
            {d.rating}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Change</span>
          <span className={`font-bold tabular-nums ${d.ratingChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {d.ratingChange >= 0 ? "+" : ""}{d.ratingChange}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Rank</span>
          <span className="text-white tabular-nums font-medium">#{d.rank.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Date</span>
          <span className="text-gray-300 font-medium">
            {new Date(d.date).toLocaleDateString("default", { month: "short", year: "numeric", day: "numeric" })}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function RatingHistoryChart() {
  const { data, loading, error } = useRatingHistory();

  const chartData = useMemo(() => {
    if (!data?.ratingHistory) return [];
    return data.ratingHistory.map((r) => ({
      ...r,
      dateLabel: new Date(r.date).toLocaleDateString("default", { month: "short", year: "2-digit" }),
    }));
  }, [data]);

  // ── Glass Skeleton Loader ──
  if (loading) return (
    <div className="w-full h-[320px] sm:h-[400px] rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl animate-pulse shadow-lg" />
  );

  // ── Empty State ──
  if (error || !chartData.length) return (
    <div className="w-full h-[320px] sm:h-[400px] rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl flex items-center justify-center shadow-lg">
      <p className="text-gray-500 text-sm italic">No rating history available yet.</p>
    </div>
  );

  const minRating = Math.min(...chartData.map((d) => d.rating)) - 100;
  const maxRating = Math.max(...chartData.map((d) => d.rating)) + 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      // THE FIX: Strict height wrapper required for Recharts 
      className="w-full h-[320px] sm:h-[400px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 16, left: -15, bottom: 5 }}>
          
          <defs>
            {/* Brand Orange Gradient Fill */}
            <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#D85D3F" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#D85D3F" stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Soft Glass Grid Lines */}
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

          {/* Rank threshold lines */}
          {RANK_LINES.filter((r) => r.y >= minRating && r.y <= maxRating).map((r) => (
            <ReferenceLine
              key={r.y} 
              y={r.y}
              stroke={r.color} 
              strokeOpacity={0.3} 
              strokeDasharray="4 4"
              label={{ 
                value: r.label, 
                position: "insideTopRight", 
                fontSize: 10, 
                fill: r.color, 
                fillOpacity: 0.8 
              }}
            />
          ))}

          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 10, fill: "#71717a" }}
            axisLine={false} 
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={20} // Prevents overlap on mobile
            dy={10}         // Pushes labels down slightly
          />
          <YAxis
            domain={[minRating, maxRating]}
            tick={{ fontSize: 10, fill: "#71717a" }}
            axisLine={false} 
            tickLine={false}
            width={45}
            dx={-10}        // Pushes labels away from chart edge
          />

          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1, strokeDasharray: "4 4" }} />

          <Area
            type="monotone"
            dataKey="rating"
            stroke="#D85D3F"
            strokeWidth={3}
            fill="url(#ratingGrad)"
            activeDot={{ r: 6, fill: "#D85D3F", stroke: "#111", strokeWidth: 2, shadow: "0 0 10px #D85D3F" }}
            dot={(props) => {
              const { cx, cy, payload } = props;
              return (
                <circle
                  key={payload.contestId}
                  cx={cx} cy={cy} r={3.5}
                  fill={getRankColor(payload.rating)}
                  stroke="#111" strokeWidth={1.5}
                  className="transition-transform duration-300 hover:scale-150 cursor-pointer"
                />
              );
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}