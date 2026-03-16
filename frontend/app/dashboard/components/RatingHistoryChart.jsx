"use client";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import { useRatingHistory } from "../hooks/useInsights";

function getRankColor(rating) {
  if (rating >= 2400) return "#FF0000";
  if (rating >= 2100) return "#FF8C00";
  if (rating >= 1900) return "#AA00AA";
  if (rating >= 1600) return "#0000FF";
  if (rating >= 1400) return "#03A89E";
  if (rating >= 1200) return "#008000";
  return "#808080";
}

const RANK_LINES = [
  { y: 1200, label: "Pupil",        color: "#008000" },
  { y: 1400, label: "Specialist",   color: "#03A89E" },
  { y: 1600, label: "Expert",       color: "#0000FF" },
  { y: 1900, label: "CM",           color: "#AA00AA" },
  { y: 2100, label: "Master",       color: "#FF8C00" },
  { y: 2400, label: "Grandmaster",  color: "#FF0000" },
];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/95 backdrop-blur-sm px-4 py-3 text-xs shadow-2xl min-w-[180px]">
      <p className="text-zinc-400 mb-2 font-medium truncate max-w-[200px]">{d.contestName}</p>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">Rating</span>
          <span className="text-zinc-100 font-bold tabular-nums" style={{ color: getRankColor(d.rating) }}>
            {d.rating}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">Change</span>
          <span className={`font-semibold tabular-nums ${d.ratingChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {d.ratingChange >= 0 ? "+" : ""}{d.ratingChange}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">Rank</span>
          <span className="text-zinc-300 tabular-nums">#{d.rank.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">Date</span>
          <span className="text-zinc-400">
            {new Date(d.date).toLocaleDateString("default", { month: "short", year: "numeric" })}
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

  if (loading) return (
    <div className="w-full h-[320px] rounded-2xl border border-zinc-800 bg-zinc-900/50 animate-pulse" />
  );

  if (error || !chartData.length) return (
    <div className="w-full h-[320px] rounded-2xl border border-zinc-800 bg-zinc-900/50 flex items-center justify-center">
      <p className="text-zinc-500 text-sm italic">No rating history yet.</p>
    </div>
  );

  const minRating = Math.min(...chartData.map((d) => d.rating)) - 100;
  const maxRating = Math.max(...chartData.map((d) => d.rating)) + 100;
  const currentRating = chartData[chartData.length - 1]?.rating;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full h-[320px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />

          {/* Rank threshold lines */}
          {RANK_LINES.filter((r) => r.y >= minRating && r.y <= maxRating).map((r) => (
            <ReferenceLine
              key={r.y} y={r.y}
              stroke={r.color} strokeOpacity={0.25} strokeDasharray="4 4"
              label={{ value: r.label, position: "insideTopRight", fontSize: 9, fill: r.color, fillOpacity: 0.6 }}
            />
          ))}

          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 10, fill: "#52525b" }}
            axisLine={false} tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minRating, maxRating]}
            tick={{ fontSize: 10, fill: "#52525b" }}
            axisLine={false} tickLine={false}
            width={45}
          />

          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey="rating"
            stroke="#06b6d4"
            strokeWidth={2}
            fill="url(#ratingGrad)"
            dot={(props) => {
              const { cx, cy, payload } = props;
              return (
                <circle
                  key={payload.contestId}
                  cx={cx} cy={cy} r={3}
                  fill={getRankColor(payload.rating)}
                  stroke="#09090b" strokeWidth={1.5}
                />
              );
            }}
            activeDot={{ r: 5, fill: "#06b6d4", stroke: "#09090b", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
