"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import StatCard from "./components/StatCard";
import RatingChart from "./components/RatingChart";
import useSummary from "./hooks/useSummary";
import FocusAreas from "./components/FocusAreas";

export default function DashboardPage() {
  const [syncKey, setSyncKey] = useState(0);
  const { data: summary, loading } = useSummary(syncKey);

  return (
    // CHANGE 1: 'h-screen' locks the height, 'overflow-hidden' prevents window scrolling
    <div className="flex h-screen bg-[#09090b] text-[#E4E4E7] font-sans overflow-hidden selection:bg-white/20">
      
      {/* Sidebar is now locked in place because the parent doesn't scroll */}
      <Sidebar />

      {/* CHANGE 2: 'overflow-y-auto' makes ONLY this section scrollable */}
      <main className="flex-1 px-10 py-8 overflow-y-auto">
        
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

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12"
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
            className="space-y-10 pb-10" 
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 border-t border-zinc-900 pt-10">
              <div className="lg:col-span-1 space-y-4">
                <h3 className="text-xl font-serif text-white">Activity</h3>
                <div className="bg-[#18181b] border border-zinc-800 rounded-xl h-56 flex items-center justify-center">
                  <span className="text-zinc-600 font-serif italic text-sm">
                    Activity Heatmap
                  </span>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xl font-serif text-white">Recent Contests</h3>
                <div className="bg-[#18181b] border border-zinc-800 rounded-xl h-56 flex items-center justify-center">
                   <span className="text-zinc-600 font-serif italic text-sm">
                    Contest Table
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}