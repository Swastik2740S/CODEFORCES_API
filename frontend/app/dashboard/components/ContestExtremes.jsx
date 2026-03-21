"use client";

import { motion } from "framer-motion";
import { useContestExtremes } from "../hooks/useInsights";

function ExtremeCard({ label, contestName, detail, accent, delay }) {
  // Define glass themes based on the semantic accent
  const themes = {
    success: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      text: "text-emerald-400",
    },
    danger: {
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      text: "text-red-400",
    },
    brand: {
      bg: "bg-[#D85D3F]/10",
      border: "border-[#D85D3F]/20",
      text: "text-[#D85D3F]",
    },
    default: {
      bg: "bg-white/[0.03]",
      border: "border-white/10",
      text: "text-white",
    },
  };

  const activeTheme = themes[accent] || themes.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`rounded-2xl border p-4 sm:p-5 flex flex-col gap-1.5 backdrop-blur-md shadow-lg transition-transform hover:scale-[1.02] ${activeTheme.bg} ${activeTheme.border}`}
    >
      <span className="text-[10px] sm:text-xs uppercase tracking-widest text-gray-500 font-medium truncate">
        {label}
      </span>
      <span className={`text-lg sm:text-xl font-bold tabular-nums tracking-tight truncate ${activeTheme.text}`}>
        {detail}
      </span>
      <span className="text-[10px] sm:text-xs text-gray-400 truncate" title={contestName}>
        {contestName}
      </span>
    </motion.div>
  );
}

function StreakCard({ label, value, accent, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`rounded-2xl border p-4 sm:p-5 flex flex-col gap-1 backdrop-blur-md shadow-lg transition-transform hover:scale-[1.02] ${
        accent
          ? "bg-[#D85D3F]/10 border-[#D85D3F]/20"
          : "bg-white/[0.03] border-white/10"
      }`}
    >
      <span className="text-[10px] sm:text-xs uppercase tracking-widest text-gray-500 font-medium truncate">
        {label}
      </span>
      <span className={`text-2xl sm:text-3xl font-bold tabular-nums tracking-tight ${accent ? "text-[#D85D3F]" : "text-white"}`}>
        {value}
        <span className="text-xs sm:text-sm font-normal text-gray-500 ml-1.5">contests</span>
      </span>
    </motion.div>
  );
}

export default function ContestExtremes() {
  const { data, loading, error } = useContestExtremes();

  if (loading) return <SectionSkeleton cols={6} />;
  if (error || !data?.extremes) return <Empty message="No contest data yet." />;

  const { extremes, totalContests, currentStreak, bestStreak } = data;

  return (
    <div className="space-y-4">
      {/* Grid Strategy: 
        Mobile: 2 columns
        Tablet: 3 columns
        Desktop: 6 columns
      */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 w-full">
        
        <StreakCard 
          label="Current Streak"  
          value={currentStreak} 
          accent  
          delay={0.05} 
        />
        <StreakCard 
          label="Best Streak"     
          value={bestStreak}           
          delay={0.08} 
        />
        
        <ExtremeCard
          label="Best Rank"
          contestName={extremes.bestRank.contestName}
          detail={`Rank #${extremes.bestRank.rank.toLocaleString()}`}
          accent="brand" 
          delay={0.11}
        />
        <ExtremeCard
          label="Worst Rank"
          contestName={extremes.worstRank.contestName}
          detail={`Rank #${extremes.worstRank.rank.toLocaleString()}`}
          accent="default"
          delay={0.14}
        />
        
        <ExtremeCard
          label="Biggest Gain"
          contestName={extremes.biggestGain.contestName}
          detail={`+${extremes.biggestGain.ratingChange}`}
          accent="success" 
          delay={0.17}
        />
        <ExtremeCard
          label="Biggest Drop"
          contestName={extremes.biggestDrop.contestName}
          detail={`${extremes.biggestDrop.ratingChange}`} // Assuming this number is already negative
          accent="danger" 
          delay={0.20}
        />
        
      </div>
    </div>
  );
}

function SectionSkeleton({ cols = 6 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 animate-pulse w-full">
      {[...Array(cols)].map((_, i) => (
        <div key={i} className="h-24 sm:h-28 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-sm" />
      ))}
    </div>
  );
}

function Empty({ message }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 text-center shadow-lg">
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}