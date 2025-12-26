"use client";

import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import StatCard from "./components/StatCard";
import RatingChart from "./components/RatingChart";
import useSummary from "./hooks/useSummary";
import FocusAreas from "./components/FocusAreas";

export default function DashboardPage() {
  // 🔥 Central refresh signal
  const [syncKey, setSyncKey] = useState(0);

  const { data: summary, loading } = useSummary(syncKey);

  return (
    <div className="flex bg-[#0b0b0c] text-white min-h-screen">
      <Sidebar />

      <main className="flex-1 px-8 py-6">
        <Header
          username={!loading ? summary?.handle : null}
          onSyncComplete={() => setSyncKey((k) => k + 1)}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard
            label="CURRENT RATING"
            value={loading ? "—" : summary?.currentRating ?? "—"}
          />

          <StatCard
            label="MAX RATING"
            value={loading ? "—" : summary?.maxRating ?? "—"}
          />

          <StatCard
            label="PROBLEMS SOLVED"
            value={loading ? "—" : summary?.problemsSolved ?? "—"}
          />

          <StatCard
            label="GLOBAL RANK"
            value={loading ? "—" : summary?.rank ?? "—"}
          />
        </div>

        {/* Middle Section */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="col-span-2 bg-[#141416] border border-white/5 rounded-xl p-4">
            <RatingChart refreshKey={syncKey} />
          </div>

          <div className="bg-[#141416] border border-white/5 rounded-xl p-4">
            <FocusAreas refreshKey={syncKey} />
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-[#141416] border border-white/5 rounded-xl h-48 flex items-center justify-center text-white/40">
            Activity
          </div>
          <div className="bg-[#141416] border border-white/5 rounded-xl h-48 flex items-center justify-center text-white/40">
            Recent Contests
          </div>
        </div>
      </main>
    </div>
  );
}
