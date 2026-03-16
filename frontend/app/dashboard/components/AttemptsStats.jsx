"use client";
import { motion } from "framer-motion";
import { useAttemptsStats } from "../hooks/useInsights";

function StatCard({ label, value, sub, accent, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`rounded-xl border p-4 flex flex-col gap-1 ${
        accent
          ? "bg-cyan-950/30 border-cyan-800/40"
          : "bg-zinc-800/40 border-zinc-700/40"
      }`}
    >
      <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
        {label}
      </span>
      <span className={`text-2xl font-bold tabular-nums ${accent ? "text-cyan-400" : "text-zinc-100"}`}>
        {value}
      </span>
      {sub && <span className="text-xs text-zinc-500">{sub}</span>}
    </motion.div>
  );
}

function ProblemCard({ label, problem, accent, delay }) {
  if (!problem) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`rounded-xl border p-4 flex flex-col gap-1.5 ${
        accent === "green"
          ? "bg-emerald-950/30 border-emerald-800/40"
          : "bg-amber-950/30 border-amber-800/40"
      }`}
    >
      <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
        {label}
      </span>
      <span className={`text-sm font-semibold truncate ${accent === "green" ? "text-emerald-400" : "text-amber-400"}`}>
        {problem.name}
      </span>
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        {problem.rating && (
          <span className="bg-zinc-800 px-2 py-0.5 rounded-full">
            Rating {problem.rating}
          </span>
        )}
        <span>{problem.attempts} attempt{problem.attempts !== 1 ? "s" : ""}</span>
      </div>
    </motion.div>
  );
}

export default function AttemptsStats() {
  const { data, loading, error } = useAttemptsStats();

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-pulse">
        {[...Array(6)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-zinc-800" />)}
      </div>
    );
  }
  if (error || !data) return (
    <div className="rounded-xl border border-zinc-800 p-6 text-center">
      <p className="text-zinc-500 text-sm italic">No data available.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard label="Acceptance Rate"      value={`${data.overallAccRate}%`}      accent delay={0.05} />
      <StatCard label="Avg Attempts to Solve" value={data.avgAttemptsToSolve}        delay={0.08} />
      <StatCard label="First Try Solves"     value={data.firstTrySolves}
        sub={`${data.firstTryRate}% of solved`} delay={0.11} />
      <StatCard label="Total Attempted"      value={data.totalProblems}
        sub={`${data.totalSolved} solved · ${data.totalUnsolved} unsolved`} delay={0.14} />
      <ProblemCard label="Hardest Solved"   problem={data.hardestSolved}   accent="green" delay={0.17} />
      <ProblemCard label="Needs Most Work"  problem={data.hardestUnsolved} accent="amber" delay={0.20} />
    </div>
  );
}
