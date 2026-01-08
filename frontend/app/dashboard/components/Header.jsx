"use client";

import { useState } from "react";
import { RefreshCcw, LogOut, Bell } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Header({ username, onSyncComplete }) {
  const API_BASE = process.env.NEXT_PUBLIC_URL;
  const router = useRouter();

  const [syncing, setSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("Updated just now");
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleSync() {
    if (syncing) return;

    try {
      setSyncing(true);
      setLastUpdated("Syncing…");

      const res = await fetch(`${API_BASE}/codeforces/sync`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error();

      onSyncComplete?.();
      setLastUpdated("Synced just now");
    } catch {
      setLastUpdated("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleLogout() {
    if (loggingOut) return;

    try {
      setLoggingOut(true);

      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      router.replace("/auth");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="flex items-start justify-between w-full">
      {/* Left: Title and Subtitle */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl md:text-4xl font-serif text-white tracking-tight">
          Overview
        </h1>
        <p className="text-sm text-zinc-500 font-sans flex items-center gap-2">
          {username && (
             <span className="hidden md:inline">
               Welcome back, <span className="text-zinc-300">{username}</span> •
             </span>
          )}
          {lastUpdated}
        </p>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Sync Button: Pill shape with subtle border (Matches image) */}
        <button
          onClick={handleSync}
          disabled={syncing}
          className="group flex items-center gap-2 px-4 py-2 rounded-full
            bg-[#18181b] border border-zinc-800 text-zinc-300 text-xs md:text-sm font-medium
            hover:border-zinc-600 hover:text-white transition-all duration-300
            disabled:opacity-50"
        >
          <RefreshCcw 
            size={14} 
            className={`transition-transform duration-700 ${syncing ? "animate-spin" : "group-hover:rotate-180"}`} 
          />
          {syncing ? "Syncing" : "Sync"}
        </button>

        {/* Notification Bell (Visual match for screenshot) */}
        <button className="hidden md:flex p-2 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors">
            <Bell size={20} />
        </button>

        {/* Logout Button: Minimalist red accent */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 px-4 py-2 rounded-full
            bg-red-500/5 border border-red-500/10 text-red-400 text-xs md:text-sm font-medium
            hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-300
            disabled:opacity-50"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </div>
  );
}