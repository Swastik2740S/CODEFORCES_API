"use client";
import { motion } from "framer-motion";
import { useContestExtremes } from "../hooks/useInsights";

function ExtremeCard({ label, contestName, detail, accent, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`rounded-xl border p-4 flex flex-col gap-1.5 ${
        accent === "green"
          ? "bg-emerald-950/30 border-emerald-800/40"
          : accent === "red"
          ? "bg-red-950/30 border-red-800/40"
          : accent === "cyan"
          ? "bg-cyan-950/30 border-cyan-800/40"
          : "bg-zinc-800/40 border-zinc-700/40"
      }`}
    >
      <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
        {label}
      </span>
      <span
        className={`text-lg font-bold tabular-nums ${
          accent === "green"
            ? "text-emerald-400"
            : accent === "red"
            ? "text-red-400"
            : accent === "cyan"
            ? "text-cyan-400"
            : "text-zinc-100"
        }`}
      >
        {detail}
      </span>
      <span className="text-xs text-zinc-500 truncate">{contestName}</span>
    </motion.div>
  );
}

function StreakCard({ label, value, accent, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`rounded-xl border p-4 flex flex-col gap-1 ${
        accent
          ? "bg-violet-950/30 border-violet-800/40"
          : "bg-zinc-800/40 border-zinc-700/40"
      }`}
    >
      <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
        {label}
      </span>
      <span className={`text-2xl font-bold tabular-nums ${accent ? "text-violet-400" : "text-zinc-100"}`}>
        {value}
        <span className="text-sm font-normal text-zinc-500 ml-1">contests</span>
      </span>
    </motion.div>
  );
}

export default function ContestExtremes() {
  const { data, loading, error } = useContestExtremes();

  if (loading) return <SectionSkeleton rows={1} cols={6} />;
  if (error || !data?.extremes) return <Empty message="No contest data yet." />;

  const { extremes, totalContests, currentStreak, bestStreak } = data;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StreakCard label="Current Streak"  value={currentStreak} accent  delay={0.05} />
        <StreakCard label="Best Streak"     value={bestStreak}           delay={0.08} />
        <ExtremeCard
          label="Best Rank"
          contestName={extremes.bestRank.contestName}
          detail={`Rank #${extremes.bestRank.rank.toLocaleString()}`}
          accent="cyan" delay={0.11}
        />
        <ExtremeCard
          label="Worst Rank"
          contestName={extremes.worstRank.contestName}
          detail={`Rank #${extremes.worstRank.rank.toLocaleString()}`}
          delay={0.14}
        />
        <ExtremeCard
          label="Biggest Gain"
          contestName={extremes.biggestGain.contestName}
          detail={`+${extremes.biggestGain.ratingChange}`}
          accent="green" delay={0.17}
        />
        <ExtremeCard
          label="Biggest Drop"
          contestName={extremes.biggestDrop.contestName}
          detail={`${extremes.biggestDrop.ratingChange}`}
          accent="red" delay={0.20}
        />
      </div>
    </div>
  );
}

function SectionSkeleton({ cols = 4 }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-${cols} gap-3 animate-pulse`}>
      {[...Array(cols)].map((_, i) => (
        <div key={i} className="h-20 rounded-xl bg-zinc-800" />
      ))}
    </div>
  );
}

function Empty({ message }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
      <p className="text-zinc-500 text-sm italic">{message}</p>
    </div>
  );
}
