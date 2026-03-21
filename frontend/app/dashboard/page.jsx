"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import StatCard from "./components/StatCard";
import RatingChart from "./components/RatingChart";
import useSummary from "./hooks/useSummary";
import FocusAreas from "./components/FocusAreas";
import ActivityHeatmap from "./components/ActivityHeatmap";

// Insight components
import ContestExtremes    from "./components/ContestExtremes";
import ContestHistory     from "./components/ContestHistory";
import RatingHistoryChart from "./components/RatingHistoryChart";
import VerdictStats       from "./components/VerdictStats";
import LanguageStats      from "./components/LanguageStats";
import DifficultyStats    from "./components/DifficultyStats";
import AttemptsStats      from "./components/AttemptsStats";
import TagMastery         from "./components/TagMastery";

// ── Reusable Glass Section Wrapper ────────────────────────────────────────────
function Section({ title, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      className="border-t border-white/10 pt-8 sm:pt-10 space-y-4 sm:space-y-6"
    >
      <div className="flex items-center gap-3">
        {/* Glowing Orange Accent Line */}
        <div className="w-1.5 h-6 rounded-full bg-[#D85D3F] shadow-[0_0_10px_rgba(216,93,63,0.6)]" />
        <h3 className="text-xl sm:text-2xl font-serif text-white tracking-wide">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [syncKey, setSyncKey] = useState(0);
  const { data: summary, loading } = useSummary(syncKey);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#111111] text-gray-300 font-sans overflow-hidden selection:bg-[#D85D3F]/30 relative">

      {/* Subtle Ambient Glass Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#D85D3F]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#D85D3F]/5 blur-[120px] rounded-full pointer-events-none" />

      <Sidebar className="z-20 relative" />

      <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 sm:py-8 overflow-y-auto relative z-10 custom-scrollbar">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 sm:mb-10"
        >
          <Header
            username={!loading ? summary?.handle : null}
            onSyncComplete={() => setSyncKey((k) => k + 1)}
          />
        </motion.div>

        {/* Stat Cards - Wrappers removed because StatCard.jsx handles its own Glass UI */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-10"
        >
          <StatCard
            label="CURRENT RATING"
            value={loading ? "—" : summary?.currentRating ?? "—"}
            subValue={!loading && summary?.ratingChange ? `+${summary.ratingChange}` : null}
            isPrimary={true}
          />
          <StatCard
            label="MAX RATING"
            value={loading ? "—" : summary?.maxRating ?? "—"}
            subLabel={!loading && summary?.maxRank ? `${summary.maxRank} rank` : null}
          />
          <StatCard
            label="PROBLEMS SOLVED"
            value={loading ? "—" : summary?.problemsSolved ?? "—"}
            subValue={!loading ? "+2 today" : null}
          />
          <StatCard
            label="GLOBAL RANK"
            value={loading ? "—" : summary?.rank ?? "—"}
            subLabel="Top 15%"
          />
        </motion.div>

        {!loading && summary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-12 pb-20"
          >

            {/* ── Performance History + Focus Areas ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
              <div className="xl:col-span-2 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                   <div className="w-1.5 h-6 rounded-full bg-[#D85D3F] shadow-[0_0_10px_rgba(216,93,63,0.6)]" />
                   <h3 className="text-xl sm:text-2xl font-serif text-white tracking-wide">Performance History</h3>
                </div>
                {/* Kept wrapper: RatingChart doesn't have an outer glass box yet */}
                <div className="h-[300px] sm:h-[360px] w-full bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#D85D3F]/5 pointer-events-none" />
                  <RatingChart refreshKey={syncKey} />
                </div>
              </div>
              
              <div className="xl:col-span-1 flex flex-col pt-0 xl:pt-10">
                {/* FocusAreas has its own wrapper now */}
                <FocusAreas refreshKey={syncKey} />
              </div>
            </div>

            {/* ── Activity Heatmap ── */}
            <Section title="Activity" delay={0.1}>
              <div className="w-full min-w-0 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-4 sm:p-6 shadow-xl overflow-x-auto custom-scrollbar">
                <ActivityHeatmap />
              </div>
            </Section>

            {/* ── Contest Overview: streaks + extremes ── */}
            <Section title="Contest Overview" delay={0.15}>
               {/* Wrapper removed: ContestExtremes renders a grid of individual Glass cards */}
               <ContestExtremes />
            </Section>

            {/* ── Rating Progression ── */}
            <Section title="Rating Progression" delay={0.2}>
              {/* Kept wrapper */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4 sm:p-6 shadow-xl h-[300px] sm:h-[400px]">
                <RatingHistoryChart />
              </div>
            </Section>

            {/* ── Recent Contests table ── */}
            <Section title="Recent Contests" delay={0.25}>
               {/* Wrapper removed: ContestHistory renders its own full Glass table */}
               <ContestHistory />
            </Section>

            {/* ── Submission Insights ── */}
            <Section title="Submission Insights" delay={0.3}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Kept wrappers: VerdictStats and LanguageStats need them */}
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-4 sm:p-6 shadow-xl">
                  <VerdictStats />
                </div>
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-4 sm:p-6 shadow-xl">
                  <LanguageStats />
                </div>
              </div>
            </Section>

            {/* ── Problem Analysis ── */}
            <Section title="Problem Analysis" delay={0.35}>
              <div className="space-y-6">
                {/* Wrapper removed: AttemptsStats renders a grid of individual Glass cards */}
                <AttemptsStats />
                
                {/* Kept wrapper for DifficultyStats */}
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4 sm:p-6 shadow-xl">
                  <DifficultyStats />
                </div>
              </div>
            </Section>

            {/* ── Tag Mastery ── */}
            <Section title="Tag Mastery" delay={0.4}>
               {/* Wrapper removed: TagMastery has its own full Glass table */}
               <TagMastery />
            </Section>

          </motion.div>
        )}
      </main>

      {/* Global Scrollbar Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}