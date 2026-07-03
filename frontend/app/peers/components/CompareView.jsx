"use client";

import { motion } from "framer-motion";
import { getRankColor } from "../../lib/cf";
import Avatar from "./Avatar";
import RatingOverlay from "./RatingOverlay";
import TagCompare from "./TagCompare";
import CommonContests from "./CommonContests";
import PracticeList from "./PracticeList";

export const ME_COLOR = "#D85D3F";
export const PEER_COLOR = "#60a5fa";

function Section({ title, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      className="border-t border-white/10 pt-8 space-y-4"
    >
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-6 rounded-full bg-[#D85D3F] shadow-[0_0_10px_rgba(216,93,63,0.6)]" />
        <h3 className="text-xl sm:text-2xl font-serif text-white tracking-wide">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

export default function CompareView({ data }) {
  const { me, peer, commonContests, practiceSuggestions } = data;

  return (
    <div className="space-y-10">
      <HeadToHead me={me} peer={peer} record={commonContests.record} />

      <Section title="Stat Battle">
        <StatCompareGrid me={me} peer={peer} />
      </Section>

      <Section title="Rating Journey" delay={0.05}>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4 sm:p-6 shadow-xl">
          <RatingOverlay me={me} peer={peer} />
        </div>
      </Section>

      <Section title="Tag Mastery" delay={0.1}>
        <TagCompare me={me} peer={peer} />
      </Section>

      <Section title="Common Contests" delay={0.15}>
        <CommonContests me={me} peer={peer} data={commonContests} />
      </Section>

      <Section title={`Steal ${peer.handle}'s homework`} delay={0.2}>
        <p className="text-xs text-gray-500 -mt-2">
          Problems {peer.handle} solved that you haven't — closest to your rating first.
        </p>
        <PracticeList problems={practiceSuggestions} />
      </Section>
    </div>
  );
}

// ── Hero: avatars + record ────────────────────────────────────────────────────
function HeadToHead({ me, peer, record }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8 shadow-xl relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#D85D3F]/5 via-transparent to-[#60a5fa]/5 pointer-events-none" />

      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
        <Fighter side={me} color={ME_COLOR} align="left" label="You" />

        <div className="text-center px-2">
          <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-1">Head to head</p>
          <p className="text-2xl sm:text-4xl font-bold text-white tabular-nums whitespace-nowrap">
            <span style={{ color: ME_COLOR }}>{record.meWins}</span>
            <span className="text-gray-600 mx-1.5">–</span>
            <span style={{ color: PEER_COLOR }}>{record.peerWins}</span>
          </p>
          {record.ties > 0 && (
            <p className="text-[10px] text-gray-600 mt-1">{record.ties} tie{record.ties > 1 ? "s" : ""}</p>
          )}
        </div>

        <Fighter side={peer} color={PEER_COLOR} align="right" />
      </div>
    </motion.div>
  );
}

function Fighter({ side, color, align, label }) {
  const right = align === "right";
  return (
    <div className={`flex items-center gap-3 sm:gap-4 min-w-0 ${right ? "flex-row-reverse text-right" : ""}`}>
      <Avatar handle={side.handle} avatar={side.avatar} rating={side.rating} size="h-14 w-14 sm:h-20 sm:w-20" />
      <div className="min-w-0">
        {label && (
          <p className="text-[9px] uppercase tracking-widest font-semibold mb-0.5" style={{ color }}>
            {label}
          </p>
        )}
        <p className="text-base sm:text-2xl font-bold truncate" style={{ color: getRankColor(side.rating) }}>
          {side.handle}
        </p>
        <p className="text-[11px] sm:text-xs text-gray-500 capitalize truncate">
          {side.rank || "unrated"}
        </p>
        <p className="text-sm sm:text-lg font-semibold text-white tabular-nums mt-0.5">
          {side.rating ?? "—"}
          <span className="text-[10px] sm:text-xs text-gray-600 font-normal"> / {side.maxRating ?? "—"} max</span>
        </p>
      </div>
    </div>
  );
}

// ── Stat battle grid ──────────────────────────────────────────────────────────
const STAT_ROWS = [
  { key: "problemsSolved",    label: "Problems solved" },
  { key: "totalContests",     label: "Contests" },
  { key: "acceptanceRate",    label: "Acceptance rate", suffix: "%" },
  { key: "firstTryRate",      label: "First-try solves", suffix: "%" },
  { key: "avgAttemptsToSolve", label: "Avg attempts to solve", lowerWins: true },
  { key: "bestRank",          label: "Best contest rank", lowerWins: true, prefix: "#" },
  { key: "bestStreak",        label: "Best positive streak" },
  { key: "hardest",           label: "Hardest solved" },
];

function StatCompareGrid({ me, peer }) {
  const val = (side, row) =>
    row.key === "hardest" ? side.stats.hardestSolved?.rating ?? null : side.stats[row.key];

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-xl divide-y divide-white/5 overflow-hidden">
      {STAT_ROWS.map((row) => {
        const a = val(me, row);
        const b = val(peer, row);
        const cmp =
          a == null || b == null || a === b ? 0 : (a > b ? 1 : -1) * (row.lowerWins ? -1 : 1);
        return (
          <div key={row.key} className="grid grid-cols-3 items-center px-4 sm:px-8 py-3.5">
            <StatValue value={a} row={row} winner={cmp > 0} color={ME_COLOR} align="left" />
            <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider text-center px-1">
              {row.label}
            </p>
            <StatValue value={b} row={row} winner={cmp < 0} color={PEER_COLOR} align="right" />
          </div>
        );
      })}
    </div>
  );
}

function StatValue({ value, row, winner, color, align }) {
  const text =
    value == null ? "—" : `${row.prefix ?? ""}${Number(value).toLocaleString()}${row.suffix ?? ""}`;
  return (
    <p
      className={`tabular-nums font-semibold text-sm sm:text-lg ${align === "right" ? "text-right" : ""} ${
        winner ? "" : "text-gray-500"
      }`}
      style={winner ? { color, textShadow: `0 0 12px ${color}55` } : undefined}
    >
      {text}
      {winner && <span className="ml-1.5 text-[9px] align-middle">●</span>}
    </p>
  );
}
