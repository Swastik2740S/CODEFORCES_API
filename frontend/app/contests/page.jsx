"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarClock, ExternalLink, Timer, Trophy } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { apiFetch, getRankColor, formatDate } from "../lib/cf";

export default function ContestsPage() {
  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#111111] text-gray-300 font-sans overflow-hidden selection:bg-[#D85D3F]/30 relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#D85D3F]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#D85D3F]/5 blur-[120px] rounded-full pointer-events-none" />

      <Sidebar className="z-20 relative" />

      <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 sm:py-8 overflow-y-auto relative z-10 custom-scrollbar">
        <div className="max-w-6xl mx-auto pb-24 md:pb-10 space-y-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
              Contests
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              What's coming up on Codeforces, and how your past battles went.
            </p>
          </motion.div>

          <Upcoming />
          <History />
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-1.5 h-6 rounded-full bg-[#D85D3F] shadow-[0_0_10px_rgba(216,93,63,0.6)]" />
      <h3 className="text-xl sm:text-2xl font-serif text-white tracking-wide flex items-center gap-2.5">
        {children}
      </h3>
    </div>
  );
}

// ── Upcoming ──────────────────────────────────────────────────────────────────
function countdown(startTime, now) {
  const ms = new Date(startTime) - now;
  if (ms <= 0) return "starting…";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `in ${d}d ${h}h`;
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

const fmtDuration = (sec) => {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return m ? `${h}h ${m}m` : `${h}h`;
};

function Upcoming() {
  const [contests, setContests] = useState(null);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    apiFetch("/contests/upcoming")
      .then((d) => setContests(d.contests))
      .catch((e) => setError(e.message));
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(tick);
  }, []);

  return (
    <section>
      <SectionTitle>Upcoming</SectionTitle>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {!error && contests === null && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 rounded-3xl border border-white/10 bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      )}

      {contests?.length === 0 && (
        <p className="text-sm text-gray-500 italic">No contests scheduled right now.</p>
      )}

      {contests?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {contests.slice(0, 9).map((c, i) => (
            <motion.a
              key={c.contestId}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 shadow-xl hover:border-white/20 hover:bg-white/[0.05] transition-colors group flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-gray-100 leading-snug group-hover:text-white transition-colors">
                  {c.name}
                </p>
                <ExternalLink size={13} className="text-gray-700 group-hover:text-gray-500 shrink-0 mt-0.5" />
              </div>

              <div className="flex items-center gap-2 flex-wrap mt-auto">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D85D3F]/15 border border-[#D85D3F]/30 text-[#D85D3F] flex items-center gap-1.5">
                  <CalendarClock size={11} /> {countdown(c.startTime, now)}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] text-gray-500 bg-white/[0.04] border border-white/5 flex items-center gap-1.5">
                  <Timer size={11} /> {fmtDuration(c.durationSeconds)}
                </span>
                {c.type && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] text-gray-500 bg-white/[0.04] border border-white/5">
                    {c.type}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-gray-600">
                {new Date(c.startTime).toLocaleString("default", {
                  weekday: "short", month: "short", day: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </motion.a>
          ))}
        </div>
      )}
    </section>
  );
}

// ── History ───────────────────────────────────────────────────────────────────
function History() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    apiFetch("/contests/history")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const summary = useMemo(() => {
    if (!data?.contests?.length) return null;
    const c = data.contests;
    return {
      total: c.length,
      bestRank: Math.min(...c.map((x) => x.rank)),
      bestGain: Math.max(...c.map((x) => x.ratingChange)),
      positive: c.filter((x) => x.ratingChange >= 0).length,
    };
  }, [data]);

  return (
    <section className="border-t border-white/10 pt-8">
      <SectionTitle>Your history</SectionTitle>

      {error && (
        <p className="text-sm text-gray-500 italic">
          {error.includes("handle") ? "Link a Codeforces handle to see your contest history." : error}
        </p>
      )}

      {!error && data === null && (
        <div className="h-64 rounded-3xl border border-white/10 bg-white/[0.02] animate-pulse" />
      )}

      {data?.contests?.length === 0 && (
        <p className="text-sm text-gray-500 italic">No rated contests yet — your first delta awaits.</p>
      )}

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <SummaryTile label="Rated contests" value={summary.total} />
          <SummaryTile label="Best rank" value={`#${summary.bestRank.toLocaleString()}`} />
          <SummaryTile label="Biggest gain" value={`+${summary.bestGain}`} accent="text-emerald-400" />
          <SummaryTile label="Positive rounds" value={`${summary.positive}/${summary.total}`} />
        </div>
      )}

      {data?.contests?.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-600 border-b border-white/10">
                  <th className="text-left font-medium px-6 py-3.5">Contest</th>
                  <th className="text-right font-medium px-3 py-3.5">Rank</th>
                  <th className="text-right font-medium px-3 py-3.5">Δ Rating</th>
                  <th className="text-right font-medium px-3 py-3.5">New rating</th>
                  <th className="text-right font-medium px-6 py-3.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(showAll ? data.contests : data.contests.slice(0, 15)).map((c) => (
                  <tr key={c.contestId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3 max-w-[300px]">
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-300 hover:text-white truncate block transition-colors"
                        title={c.contestName}
                      >
                        {c.contestName}
                      </a>
                    </td>
                    <td className="px-3 py-3 text-right text-white tabular-nums">
                      #{c.rank.toLocaleString()}
                    </td>
                    <td className={`px-3 py-3 text-right font-semibold tabular-nums ${
                      c.ratingChange >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {c.ratingChange >= 0 ? "+" : ""}{c.ratingChange}
                    </td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums" style={{ color: getRankColor(c.newRating) }}>
                      {c.newRating}
                    </td>
                    <td className="px-6 py-3 text-right text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(c.date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.contests.length > 15 && (
            <button
              onClick={() => setShowAll((s) => !s)}
              className="w-full py-3 text-xs text-gray-500 hover:text-white border-t border-white/5 transition-colors"
            >
              {showAll ? "Show less" : `Show all ${data.contests.length} contests`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function SummaryTile({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4 shadow-lg">
      <p className={`text-xl font-bold tabular-nums ${accent ?? "text-white"}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-gray-600 mt-1">{label}</p>
    </div>
  );
}
