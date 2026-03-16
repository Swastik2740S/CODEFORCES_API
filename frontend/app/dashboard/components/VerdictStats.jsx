"use client";
import { useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { useVerdictStats } from "../hooks/useInsights";

const VERDICT_COLORS = {
  OK:                    "#34d399",
  WRONG_ANSWER:          "#f87171",
  TIME_LIMIT_EXCEEDED:   "#fb923c",
  MEMORY_LIMIT_EXCEEDED: "#c084fc",
  RUNTIME_ERROR:         "#f472b6",
  COMPILATION_ERROR:     "#94a3b8",
  PRESENTATION_ERROR:    "#fbbf24",
  IDLENESS_LIMIT_EXCEEDED: "#60a5fa",
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
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/95 px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-300 font-medium">{d.verdict}</p>
      <p className="text-zinc-400">{d.count.toLocaleString()} ({d.percentage}%)</p>
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

  if (loading) return (
    <div className="w-full h-full rounded-2xl border border-zinc-800 bg-zinc-900/50 animate-pulse min-h-[260px]" />
  );
  if (error || !chartData.length) return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center min-h-[260px] flex items-center justify-center">
      <p className="text-zinc-500 text-sm italic">No submission data.</p>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5"
    >
      {/* Acceptance rate badge */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
          Verdict Breakdown
        </span>
        <span className="text-xs bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 px-2.5 py-0.5 rounded-full font-medium">
          {data.acceptanceRate}% AC
        </span>
      </div>

      {/* Donut chart */}
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%" cy="50%"
              innerRadius={45} outerRadius={72}
              paddingAngle={2}
              dataKey="count"
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<VerdictTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-col gap-1.5">
        {chartData.slice(0, 6).map((v) => (
          <div key={v.verdict} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: v.color }} />
              <span className="text-xs text-zinc-400 truncate">{v.short}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-zinc-500 tabular-nums">{v.count.toLocaleString()}</span>
              <span className="text-[10px] text-zinc-600 tabular-nums w-8 text-right">{v.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
