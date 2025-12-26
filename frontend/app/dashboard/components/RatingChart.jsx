"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const ranges = [
  { key: "6m", label: "6 Months", months: 6 },
  { key: "1y", label: "1 Year", months: 12 },
  { key: "all", label: "All Time", months: null },
];

export default function RatingChart() {
  const API_BASE = process.env.NEXT_PUBLIC_URL;

  const [data, setData] = useState([]);
  const [range, setRange] = useState("6m");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
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
  }, []);

  const filtered = useMemo(() => {
    if (range === "all") return data;
    const months = ranges.find((r) => r.key === range).months;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return data.filter((d) => d.time >= cutoff);
  }, [data, range]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-white/40">
        Loading chart…
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white">
          Performance History
        </h3>

        <div className="flex gap-3 text-xs text-white/40">
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`transition ${
                range === r.key
                  ? "text-white"
                  : "hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filtered}>
            <XAxis
              dataKey="time"
              tickFormatter={(v) =>
                new Date(v).toLocaleDateString("en-US", {
                  month: "short",
                })
              }
              tick={{ fill: "#888", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#888", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: "#111",
                border: "1px solid #222",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(v) =>
                new Date(v).toLocaleDateString()
              }
            />
            <Line
              type="monotone"
              dataKey="rating"
              stroke="#ffffff"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
