"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Swords, Crown } from "lucide-react";
import { apiFetch, getRankColor } from "../../lib/cf";
import Avatar from "./Avatar";

// You + your friends ranked by rating; recent form and 30-day activity show
// who's actually grinding.
export default function Leaderboard({ onCompare }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/peers/leaderboard")
      .then((d) => setRows(d.leaderboard))
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-red-400">{error}</p>;

  if (rows === null) {
    return <div className="h-64 rounded-3xl border border-white/10 bg-white/[0.02] animate-pulse" />;
  }

  if (rows.length <= 1) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
        <Crown size={32} className="mx-auto text-gray-600 mb-3" />
        <p className="text-gray-400 font-medium">A leaderboard of one is just a mirror</p>
        <p className="text-xs text-gray-600 mt-1">Add some friends to see who's really on top.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-xl overflow-hidden"
    >
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-gray-600 border-b border-white/10">
              <th className="text-left font-medium px-6 py-3.5 w-12">#</th>
              <th className="text-left font-medium px-3 py-3.5">Handle</th>
              <th className="text-right font-medium px-3 py-3.5">Rating</th>
              <th className="text-right font-medium px-3 py-3.5">Max</th>
              <th className="text-right font-medium px-3 py-3.5">Solved</th>
              <th className="text-right font-medium px-3 py-3.5">Contests</th>
              <th className="text-right font-medium px-3 py-3.5">Last 5</th>
              <th className="text-right font-medium px-3 py-3.5">30d solved</th>
              <th className="px-6 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r, i) => (
              <tr
                key={r.handle}
                className={`transition-colors ${
                  r.isMe ? "bg-[#D85D3F]/[0.06]" : "hover:bg-white/[0.02]"
                }`}
              >
                <td className="px-6 py-3">
                  {i === 0 ? (
                    <Crown size={16} className="text-amber-400" />
                  ) : (
                    <span className="text-gray-600 tabular-nums">{i + 1}</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar handle={r.handle} avatar={r.avatar} rating={r.rating} size="h-8 w-8" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate" style={{ color: getRankColor(r.rating) }}>
                        {r.handle}
                        {r.isMe && (
                          <span className="ml-2 text-[9px] uppercase tracking-wider text-[#D85D3F] font-bold">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-gray-600 capitalize truncate">{r.rank || "unrated"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-right font-bold text-white tabular-nums">{r.rating ?? "—"}</td>
                <td className="px-3 py-3 text-right text-gray-500 tabular-nums">{r.maxRating ?? "—"}</td>
                <td className="px-3 py-3 text-right text-gray-300 tabular-nums">{r.problemsSolved}</td>
                <td className="px-3 py-3 text-right text-gray-300 tabular-nums">{r.totalContests}</td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {r.recentContests > 0 ? (
                    <span className={r.recentDelta >= 0 ? "text-emerald-400" : "text-red-400"}>
                      {r.recentDelta >= 0 ? "+" : ""}{r.recentDelta}
                    </span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
                <td className="px-3 py-3 text-right text-gray-300 tabular-nums">{r.solvedLast30Days}</td>
                <td className="px-6 py-3 text-right">
                  {!r.isMe && (
                    <button
                      onClick={() => onCompare(r.handle)}
                      title={`Compare with ${r.handle}`}
                      className="p-2 rounded-lg text-gray-500 hover:text-[#D85D3F] hover:bg-[#D85D3F]/10 transition-colors"
                    >
                      <Swords size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
