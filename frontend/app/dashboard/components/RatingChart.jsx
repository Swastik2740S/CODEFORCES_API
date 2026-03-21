"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";

const ranges = [
  { key: "6m", label: "6 Months", months: 6 },
  { key: "1y", label: "1 Year", months: 12 },
  { key: "all", label: "All Time", months: null },
];

export default function RatingChart({ refreshKey }) {
  const API_BASE = process.env.NEXT_PUBLIC_URL || "/api";

  const [data, setData] = useState([]);
  const [range, setRange] = useState("6m");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/codeforces/rating-graph`, {
          credentials: "include",
        });
        
        if (!res.ok) throw new Error("Network response was not ok");
        const json = await res.json();

        const points = json.points.map((p) => ({
          ...p,
          time: new Date(p.time),
        }));

        setData(points);
      } catch (e) {
        console.error("Failed to load rating graph");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [refreshKey]);

  const filtered = useMemo(() => {
    if (range === "all") return data;
    if (!data.length) return [];
    
    const r = ranges.find((r) => r.key === range) || ranges[0];
    const months = r.months;
    
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return data.filter((d) => d.time >= cutoff);
  }, [data, range]);

  // ── Glass Skeleton Loader ──
  if (loading) {
    return (
      <div className="w-full h-full min-h-[250px] rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl animate-pulse flex items-center justify-center shadow-lg">
        <span className="text-gray-500 font-serif italic text-sm">Retrieving history...</span>
      </div>
    );
  }

  // ── Empty State ──
  if (!data.length) {
    return (
      <div className="w-full h-full min-h-[250px] rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl flex items-center justify-center shadow-lg">
        <span className="text-gray-500 font-serif italic text-sm">No rating data available.</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col relative min-h-[250px]">
      
      {/* ── Range Selectors ── */}
      <div className="flex justify-end mb-4 z-10">
        <div className="flex gap-3 sm:gap-4 text-[10px] sm:text-xs font-sans font-medium bg-white/5 p-1 rounded-lg border border-white/10 backdrop-blur-md">
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded-md transition-all duration-300 ${
                range === r.key
                  ? "bg-[#D85D3F]/20 text-[#D85D3F] shadow-[0_0_10px_rgba(216,93,63,0.2)]"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chart Area ── */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="flex-1 w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filtered} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            
            {/* Gradient Definition for the Area Fill */}
            <defs>
              <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#D85D3F" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#D85D3F" stopOpacity={0}/>
              </linearGradient>
            </defs>

            {/* Soft Glass Grid Lines */}
            <CartesianGrid 
              vertical={false} 
              stroke="rgba(255,255,255,0.05)" 
              strokeDasharray="3 3" 
            />
            
            <XAxis
              dataKey="time"
              tickFormatter={(v) =>
                new Date(v).toLocaleDateString("en-US", { month: "short" })
              }
              tick={{ fill: "#71717a", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              dy={10}
              minTickGap={20} // Prevents mobile overlap
            />
            
            <YAxis
              tick={{ fill: "#71717a", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
              dx={-5} // Pulls numbers slightly away from the edge
            />
            
            {/* Custom Glass Tooltip */}
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                backdropFilter: "blur(12px)",
                borderColor: "rgba(255, 255, 255, 0.1)",
                color: "#fff",
                borderRadius: "12px",
                fontSize: "12px",
                padding: "10px 14px",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)"
              }}
              itemStyle={{ color: "#D85D3F", fontWeight: 600 }}
              labelStyle={{ color: "#a1a1aa", marginBottom: "4px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}
              labelFormatter={(v) => new Date(v).toLocaleDateString(undefined, { dateStyle: "medium" })}
              cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            
            {/* Upgraded from <Line> to <Area> */}
            <Area
              type="monotone"
              dataKey="rating"
              stroke="#D85D3F"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorRating)"
              activeDot={{ r: 6, fill: "#D85D3F", stroke: "#111", strokeWidth: 2, shadow: "0 0 10px #D85D3F" }}
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}