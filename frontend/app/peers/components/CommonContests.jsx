"use client";

import { useState } from "react";
import { formatDate } from "../../lib/cf";
import { ME_COLOR, PEER_COLOR } from "./CompareView";

const INITIAL_ROWS = 10;

const Delta = ({ value }) => (
  <span className={`tabular-nums text-xs ${value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
    {value >= 0 ? "+" : ""}{value}
  </span>
);

export default function CommonContests({ me, peer, data }) {
  const [showAll, setShowAll] = useState(false);
  const { contests } = data;

  if (contests.length === 0) {
    return (
      <p className="text-gray-500 text-sm italic text-center py-10">
        You two haven't competed in the same contest yet.
      </p>
    );
  }

  const rows = showAll ? contests : contests.slice(0, INITIAL_ROWS);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-xl overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-gray-600 border-b border-white/10">
              <th className="text-left font-medium px-6 py-3.5">Contest</th>
              <th className="text-right font-medium px-3 py-3.5" style={{ color: ME_COLOR }}>You</th>
              <th className="text-right font-medium px-3 py-3.5" style={{ color: PEER_COLOR }}>{peer.handle}</th>
              <th className="text-center font-medium px-3 py-3.5">Winner</th>
              <th className="text-right font-medium px-6 py-3.5">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((c) => (
              <tr key={c.contestId} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-3 max-w-[280px]">
                  <a
                    href={`https://codeforces.com/contest/${c.contestId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-white truncate block transition-colors"
                    title={c.contestName}
                  >
                    {c.contestName}
                  </a>
                </td>
                <td className="px-3 py-3 text-right">
                  <span className="text-white tabular-nums">#{c.myRank.toLocaleString()}</span>{" "}
                  <Delta value={c.myDelta} />
                </td>
                <td className="px-3 py-3 text-right">
                  <span className="text-white tabular-nums">#{c.peerRank.toLocaleString()}</span>{" "}
                  <Delta value={c.peerDelta} />
                </td>
                <td className="px-3 py-3 text-center">
                  {c.winner === "tie" ? (
                    <span className="text-gray-600 text-xs">tie</span>
                  ) : (
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                      style={{
                        color: c.winner === "me" ? ME_COLOR : PEER_COLOR,
                        borderColor: `${c.winner === "me" ? ME_COLOR : PEER_COLOR}40`,
                        backgroundColor: `${c.winner === "me" ? ME_COLOR : PEER_COLOR}15`,
                      }}
                    >
                      {c.winner === "me" ? "You" : peer.handle}
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 text-right text-xs text-gray-500 whitespace-nowrap">
                  {formatDate(c.date)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {contests.length > INITIAL_ROWS && (
        <button
          onClick={() => setShowAll((s) => !s)}
          className="w-full py-3 text-xs text-gray-500 hover:text-white border-t border-white/5 transition-colors"
        >
          {showAll ? "Show less" : `Show all ${contests.length} contests`}
        </button>
      )}
    </div>
  );
}
