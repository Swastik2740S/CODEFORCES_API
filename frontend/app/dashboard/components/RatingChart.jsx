"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
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
  const API_BASE = process.env.NEXT_PUBLIC_URL;

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
  }, [refreshKey]); // Refetch when sync happens

  const filtered = useMemo(() => {
    if (range === "all") return data;
    if (!data.length) return [];
    
    // Safely find the months, defaulting to 6 if not found
    const r = ranges.find((r) => r.key === range) || ranges[0];
    const months = r.months;
    
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return data.filter((d) => d.time >= cutoff);
  }, [data, range]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-600 font-serif italic text-sm">
        Retrieving history...
      </div>
    );
  }

  if (!data.length) {
    return (
        <div className="h-full flex items-center justify-center text-zinc-600 font-serif italic text-sm">
          No rating data available
        </div>
    )
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Range Selectors - Positioned Absolute Top-Right to overlap with Parent Header if needed, 
          or just standard flex. Here we use flex to keep it clean. */}
      <div className="flex justify-end mb-2">
        <div className="flex gap-4 text-xs font-sans font-medium">
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`pb-1 transition-colors duration-300 ${
                range === r.key
                  ? "text-white border-b border-white"
                  : "text-zinc-500 hover:text-zinc-300 border-b border-transparent"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Area */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="flex-1 -ml-4" // Negative margin to pull chart flush with left edge
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filtered}>
            {/* Subtle Horizontal Grid Lines only */}
            <CartesianGrid 
                vertical={false} 
                stroke="#27272a" 
                strokeDasharray="0" 
            />
            
            <XAxis
              dataKey="time"
              tickFormatter={(v) =>
                new Date(v).toLocaleDateString("en-US", {
                  month: "short",
                })
              }
              tick={{ fill: "#52525b", fontSize: 10, fontFamily: "var(--font-sans)" }} // zinc-600
              axisLine={false}
              tickLine={false}
              dy={10} // Push labels down slightly
              minTickGap={30}
            />
            
            <YAxis
              tick={{ fill: "#52525b", fontSize: 10, fontFamily: "var(--font-sans)" }}
              axisLine={false}
              tickLine={false}
              width={40}
              domain={['auto', 'auto']} // Adjust scale to fit data nicely
            />
            
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b", // Dark Zinc
                borderColor: "#27272a",     // Border Zinc-800
                color: "#fff",
                borderRadius: "8px",
                fontSize: "12px",
                padding: "8px 12px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)"
              }}
              itemStyle={{ color: "#e4e4e7" }}
              labelStyle={{ color: "#a1a1aa", marginBottom: "0.25rem" }}
              labelFormatter={(v) => new Date(v).toLocaleDateString(undefined, { dateStyle: "medium" })}
              cursor={{ stroke: "#52525b", strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            
            <Line
              type="monotone" // Smooth curves
              dataKey="rating"
              stroke="#fff"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: "#fff", stroke: "#000", strokeWidth: 2 }}
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}