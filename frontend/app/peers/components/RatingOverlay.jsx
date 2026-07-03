"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { ME_COLOR, PEER_COLOR } from "./CompareView";

const fmtTick = (t) =>
  new Date(t).toLocaleDateString("default", { month: "short", year: "2-digit" });

function OverlayTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl px-4 py-3 text-xs shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
      <p className="text-gray-400 mb-2">
        {new Date(label).toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" })}
      </p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-6">
          <span style={{ color: p.stroke }}>{p.name}</span>
          <span className="font-bold tabular-nums text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// Both rating histories on one time axis. Series have different contest dates,
// so each point carries only its own side's value and lines connectNulls.
export default function RatingOverlay({ me, peer }) {
  const data = useMemo(() => {
    const points = [
      ...me.ratingHistory.map((r) => ({ t: +new Date(r.date), me: r.rating })),
      ...peer.ratingHistory.map((r) => ({ t: +new Date(r.date), peer: r.rating })),
    ];
    return points.sort((a, b) => a.t - b.t);
  }, [me, peer]);

  if (data.length === 0) {
    return (
      <p className="text-gray-500 text-sm italic text-center py-16">
        Neither of you has rated contests yet.
      </p>
    );
  }

  return (
    <div className="w-full h-[300px] sm:h-[380px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={fmtTick}
            tick={{ fontSize: 10, fill: "#71717a" }}
            axisLine={false}
            tickLine={false}
            minTickGap={40}
            dy={10}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fontSize: 10, fill: "#71717a" }}
            axisLine={false}
            tickLine={false}
            width={45}
            dx={-10}
          />
          <Tooltip content={<OverlayTooltip />} />
          <Legend
            verticalAlign="top"
            height={30}
            iconType="plainline"
            formatter={(value) => <span className="text-xs text-gray-400">{value}</span>}
          />
          <Line
            dataKey="me"
            name={me.handle}
            stroke={ME_COLOR}
            strokeWidth={2.5}
            dot={false}
            connectNulls
            type="monotone"
          />
          <Line
            dataKey="peer"
            name={peer.handle}
            stroke={PEER_COLOR}
            strokeWidth={2.5}
            dot={false}
            connectNulls
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
