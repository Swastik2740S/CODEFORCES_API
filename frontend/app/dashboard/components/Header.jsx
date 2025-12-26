"use client";

import { useState } from "react";
import { RefreshCcw, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Header({ username }) {
  const API_BASE = process.env.NEXT_PUBLIC_URL;
  const router = useRouter();

  const [syncing, setSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("Updated just now");
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleSync() {
    if (syncing) return;

    try {
      setSyncing(true);

      const res = await fetch(`${API_BASE}/codeforces/sync`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to start sync");

      setLastUpdated("Sync started…");
    } catch (err) {
      console.error(err);
      setLastUpdated("Sync failed");
    } finally {
      setTimeout(() => {
        setSyncing(false);
        setLastUpdated("Updated just now");
      }, 2000);
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
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          {username ? `Welcome back, ${username}` : "Overview"}
        </h1>
        <p className="text-sm text-white/40">{lastUpdated}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg
            bg-white/5 text-white text-sm
            hover:bg-white/10 transition
            disabled:opacity-60"
        >
          <RefreshCcw size={14} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing…" : "Sync"}
        </button>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 px-4 py-2 rounded-lg
            bg-red-500/10 text-red-400 text-sm
            hover:bg-red-500/20 transition"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </div>
  );
}
