"use client";
import { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import { motion } from "framer-motion";
import { useDifficultyStats } from "../hooks/useInsights";

// Color ramp: easy (green) → hard (red)
function getDiffColor(rating) {
  if (rating === "Unrated") return "#71717a";
  const r = parseInt(rating);
  if (r <= 1000) return "#34d399";
  if (r <= 1200) return "#4ade80";
  if (r <= 1400) return "#a3e635";
  if (r <= 1600) return "#facc15";
  if (r <= 1800) return "#fb923c";
  if (r <= 2000) return "#f87171";
  if (r <= 2400) return "#e879f9";
  return "#ff0000";
}

function DiffTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/95 px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-300 font-medium">Rating {d.rating}</p>
      <p className="text-zinc-400">{d.count} problem{d.count !== 1 ? "s" : ""} solved</p>
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
    <div className="w-full h-[220px] rounded-2xl border border-zinc-800 bg-zinc-900/50 animate-pulse" />
  );

  if (error || !chartData.length) return (
    <div className="w-full h-[220px] rounded-2xl border border-zinc-800 bg-zinc-900/50 flex items-center justify-center">
      <p className="text-zinc-500 text-sm italic">No difficulty data.</p>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
          Problems by Difficulty
        </span>
        <span className="text-xs text-zinc-600">{data.totalSolved} solved</span>
      </div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barSize={14}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="rating"
              tick={{ fontSize: 9, fill: "#52525b" }}
              axisLine={false} tickLine={false}
              interval={1}
              angle={-35}
              textAnchor="end"
              height={36}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#52525b" }}
              axisLine={false} tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<DiffTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={getDiffColor(entry.rating)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
