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

// ── Reusable section wrapper ──────────────────────────────────────────────────
function Section({ title, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: "easeOut" }}
      className="border-t border-zinc-900 pt-10 space-y-5"
    >
      <div className="flex items-center gap-3">
        <div className="w-1 h-5 rounded-full bg-cyan-500/60" />
        <h3 className="text-xl font-serif text-white">{title}</h3>
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
    <div className="flex h-screen bg-[#09090b] text-[#E4E4E7] font-sans overflow-hidden selection:bg-white/20">

      <Sidebar />

      <main className="flex-1 px-10 py-8 overflow-y-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <Header
            username={!loading ? summary?.handle : null}
            onSyncComplete={() => setSyncKey((k) => k + 1)}
          />
        </motion.div>

        {/* Stat Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10"
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
            className="space-y-10 pb-16"
          >

            {/* ── Performance History + Focus Areas ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xl font-serif text-white">Performance History</h3>
                <div className="h-[320px] w-full">
                  <RatingChart refreshKey={syncKey} />
                </div>
              </div>
              <div className="lg:col-span-1 pt-2">
                <FocusAreas refreshKey={syncKey} />
              </div>
            </div>

            {/* ── Activity Heatmap ── */}
            <Section title="Activity" delay={0.05}>
              <div className="w-full min-w-0">
                <ActivityHeatmap />
              </div>
            </Section>

            {/* ── Contest Overview: streaks + extremes ── */}
            <Section title="Contest Overview" delay={0.08}>
              <ContestExtremes />
            </Section>

            {/* ── Rating Progression ── */}
            <Section title="Rating Progression" delay={0.1}>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                <RatingHistoryChart />
              </div>
            </Section>

            {/* ── Recent Contests table ── */}
            <Section title="Recent Contests" delay={0.12}>
              <ContestHistory />
            </Section>

            {/* ── Submission Insights ── */}
            <Section title="Submission Insights" delay={0.14}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <VerdictStats />
                <LanguageStats />
              </div>
            </Section>

            {/* ── Problem Analysis ── */}
            <Section title="Problem Analysis" delay={0.16}>
              <AttemptsStats />
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                <DifficultyStats />
              </div>
            </Section>

            {/* ── Tag Mastery ── */}
            <Section title="Tag Mastery" delay={0.18}>
              <TagMastery />
            </Section>

          </motion.div>
        )}
      </main>
    </div>
  );
}