"use client";

import { motion } from "framer-motion";
import { useAttemptsStats } from "../hooks/useInsights";

function StatCard({ label, value, sub, accent, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`rounded-2xl border p-4 sm:p-5 flex flex-col gap-1 sm:gap-1.5 shadow-lg ${
        accent
          ? "bg-[#D85D3F]/10 border-[#D85D3F]/20 backdrop-blur-md"
          : "bg-white/[0.03] border-white/10 backdrop-blur-md"
      }`}
    >
      <span className="text-[10px] sm:text-xs uppercase tracking-widest text-gray-500 font-medium truncate">
        {label}
      </span>
      <span className={`text-2xl sm:text-3xl font-bold tabular-nums tracking-tight ${accent ? "text-[#D85D3F]" : "text-white"}`}>
        {value}
      </span>
      {sub && <span className="text-[10px] sm:text-xs text-gray-400 truncate">{sub}</span>}
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
      // Spans 2 columns on tablet/desktop to give long problem names room to breathe
      className={`col-span-1 sm:col-span-2 rounded-2xl border p-4 sm:p-5 flex flex-col gap-2 shadow-lg ${
        accent === "success"
          ? "bg-emerald-500/10 border-emerald-500/20 backdrop-blur-md"
          : "bg-[#D85D3F]/10 border-[#D85D3F]/20 backdrop-blur-md"
      }`}
    >
      <span className="text-[10px] sm:text-xs uppercase tracking-widest text-gray-500 font-medium">
        {label}
      </span>
      <span className={`text-sm sm:text-base font-semibold truncate ${accent === "success" ? "text-emerald-400" : "text-[#D85D3F]"}`}>
        {problem.name}
      </span>
      <div className="flex items-center gap-2 mt-auto pt-1">
        {problem.rating && (
          <span className="bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium">
            Rating {problem.rating}
          </span>
        )}
        <span className="text-[10px] sm:text-xs text-gray-400 font-medium">
          {problem.attempts} attempt{problem.attempts !== 1 ? "s" : ""}
        </span>
      </div>
    </motion.div>
  );
}

export default function AttemptsStats() {
  const { data, loading, error } = useAttemptsStats();

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div 
            key={i} 
            className={`h-24 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md ${
              i > 3 ? "sm:col-span-2" : "col-span-1"
            }`} 
          />
        ))}
      </div>
    );
  }

  if (error || !data) return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 text-center shadow-lg">
      <p className="text-gray-500 text-sm">No attempt data available.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 4 Standard Stat Cards */}
      <StatCard 
        label="Acceptance Rate" 
        value={`${data.overallAccRate}%`} 
        accent 
        delay={0.05} 
      />
      <StatCard 
        label="Avg Attempts to Solve" 
        value={data.avgAttemptsToSolve} 
        delay={0.08} 
      />
      <StatCard 
        label="First Try Solves" 
        value={data.firstTrySolves}
        sub={`${data.firstTryRate}% of solved`} 
        delay={0.11} 
      />
      <StatCard 
        label="Total Attempted" 
        value={data.totalProblems}
        sub={`${data.totalSolved} solved · ${data.totalUnsolved} unsolved`} 
        delay={0.14} 
      />
      
      {/* 2 Wide Problem Cards */}
      <ProblemCard 
        label="Hardest Solved" 
        problem={data.hardestSolved} 
        accent="success" 
        delay={0.17} 
      />
      <ProblemCard 
        label="Needs Most Work" 
        problem={data.hardestUnsolved} 
        accent="warning" 
        delay={0.20} 
      />
    </div>
  );
}