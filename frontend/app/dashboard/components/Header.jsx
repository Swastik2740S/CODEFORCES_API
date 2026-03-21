"use client";

import { useState } from "react";
import { RefreshCcw, LogOut, Bell } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Header({ username, onSyncComplete }) {
  const API_BASE = process.env.NEXT_PUBLIC_URL || "/api";
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
    <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between w-full gap-4 sm:gap-0">
      
      {/* Left: Title and Subtitle */}
      <div className="flex flex-col gap-1 w-full sm:w-auto">
        <h1 className="text-3xl md:text-4xl font-serif text-white tracking-tight">
          Overview
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 font-sans flex items-center gap-1.5 sm:gap-2">
          {username && (
            <span className="truncate max-w-[140px] sm:max-w-none">
              Welcome back, <span className="text-white font-medium">{username}</span> <span className="hidden sm:inline">•</span>
            </span>
          )}
          <span className="text-gray-500 hidden sm:inline">{lastUpdated}</span>
        </p>
        {/* Mobile-only Last Updated */}
        <p className="text-[10px] text-gray-500 sm:hidden">
          {lastUpdated}
        </p>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 w-full sm:w-auto justify-end">
        
        {/* Sync Button: Glass Pill with Orange Accent */}
        <button
          onClick={handleSync}
          disabled={syncing}
          className="group flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full
            bg-white/[0.03] border border-white/10 text-gray-300 text-xs sm:text-sm font-medium backdrop-blur-md
            hover:border-[#D85D3F]/40 hover:bg-[#D85D3F]/10 hover:text-white transition-all duration-300
            disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <RefreshCcw 
            size={14} 
            className={`transition-transform duration-700 ${syncing ? "animate-spin text-[#D85D3F]" : "group-hover:rotate-180"}`} 
          />
          {/* Hide text on very tiny screens to save space */}
          <span className="hidden min-[400px]:inline">{syncing ? "Syncing" : "Sync"}</span>
        </button>

        {/* Notification Bell (Glass) */}
        <button className="hidden sm:flex p-2.5 rounded-full text-gray-400 bg-white/[0.03] border border-white/10 backdrop-blur-md hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-sm">
          <Bell size={16} />
        </button>

        {/* Logout Button: Glassy Red Accent */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full
            bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm font-medium backdrop-blur-md
            hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300 transition-all duration-300
            disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <LogOut size={14} />
          <span className="hidden min-[400px]:inline">Logout</span>
        </button>
      </div>
    </div>
  );
}