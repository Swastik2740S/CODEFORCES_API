"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Trophy, Swords, UserPlus, Trash2, Search, Loader2,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import { apiFetch, getRankColor, timeAgo } from "../lib/cf";
import Avatar from "./components/Avatar";
import CompareFlow from "./components/CompareFlow";
import Leaderboard from "./components/Leaderboard";

// ── Page shell ────────────────────────────────────────────────────────────────
export default function PeersPage() {
  const [compareHandle, setCompareHandle] = useState(null);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#111111] text-gray-300 font-sans overflow-hidden selection:bg-[#D85D3F]/30 relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#D85D3F]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#D85D3F]/5 blur-[120px] rounded-full pointer-events-none" />

      <Sidebar className="z-20 relative" />

      <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 sm:py-8 overflow-y-auto relative z-10 custom-scrollbar">
        {compareHandle ? (
          <CompareFlow
            handle={compareHandle}
            onBack={() => setCompareHandle(null)}
          />
        ) : (
          <PeersHome onCompare={setCompareHandle} />
        )}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}

// ── Landing view: add box + friends / leaderboard tabs ────────────────────────
function PeersHome({ onCompare }) {
  const [tab, setTab] = useState("friends");
  const [friends, setFriends] = useState(null);
  const [error, setError] = useState(null);

  const loadFriends = useCallback(() => {
    apiFetch("/peers")
      .then((d) => setFriends(d.friends))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  return (
    <div className="max-w-6xl mx-auto pb-24 md:pb-10">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
          Peers
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Follow rivals, compare head-to-head, and steal their practice list.
        </p>
      </motion.div>

      <AddPeer onCompare={onCompare} onAdded={loadFriends} />

      {/* Tabs */}
      <div className="flex gap-2 mt-10 mb-6">
        <TabButton icon={Users} label="Friends" active={tab === "friends"} onClick={() => setTab("friends")} />
        <TabButton icon={Trophy} label="Leaderboard" active={tab === "leaderboard"} onClick={() => setTab("leaderboard")} />
      </div>

      {tab === "friends" ? (
        <FriendsGrid
          friends={friends}
          error={error}
          onCompare={onCompare}
          onChanged={loadFriends}
        />
      ) : (
        <Leaderboard onCompare={onCompare} />
      )}
    </div>
  );
}

function TabButton({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
        active
          ? "bg-[#D85D3F]/10 border-[#D85D3F]/30 text-white"
          : "bg-white/[0.03] border-white/10 text-gray-500 hover:text-gray-200"
      }`}
    >
      <Icon size={16} className={active ? "text-[#D85D3F]" : ""} />
      {label}
    </button>
  );
}

// ── Add / compare input ───────────────────────────────────────────────────────
function AddPeer({ onCompare, onAdded }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(null); // "add" | null
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const handle = value.trim();

  const compare = (e) => {
    e?.preventDefault();
    if (handle) onCompare(handle);
  };

  const follow = async () => {
    if (!handle || busy) return;
    setBusy("add");
    setError(null);
    setNotice(null);
    try {
      const r = await apiFetch(`/peers/${encodeURIComponent(handle)}/follow`, { method: "POST" });
      setNotice(`${r.handle} added to your friends`);
      setValue("");
      onAdded();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.5 }}
      className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4 sm:p-6 shadow-xl"
    >
      <form onSubmit={compare} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(null); setNotice(null); }}
            placeholder="Any Codeforces handle — e.g. tourist"
            className="w-full bg-black/30 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-[#D85D3F]/50 transition-colors"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!handle}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#D85D3F] hover:bg-[#c04f35] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
          >
            <Swords size={16} /> Compare
          </button>
          <button
            type="button"
            onClick={follow}
            disabled={!handle || !!busy}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-gray-200 text-sm font-semibold transition-colors"
          >
            {busy === "add" ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            Add friend
          </button>
        </div>
      </form>
      <AnimatePresence>
        {(error || notice) && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`text-xs mt-3 ${error ? "text-red-400" : "text-emerald-400"}`}
          >
            {error || notice}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Friends grid ──────────────────────────────────────────────────────────────
function FriendsGrid({ friends, error, onCompare, onChanged }) {
  const [removing, setRemoving] = useState(null);

  const remove = async (handle) => {
    setRemoving(handle);
    try {
      await apiFetch(`/peers/${encodeURIComponent(handle)}`, { method: "DELETE" });
      onChanged();
    } catch {
      /* list reload will reconcile */
      onChanged();
    } finally {
      setRemoving(null);
    }
  };

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (friends === null) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 rounded-3xl border border-white/10 bg-white/[0.02] animate-pulse" />
        ))}
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
        <Users size={32} className="mx-auto text-gray-600 mb-3" />
        <p className="text-gray-400 font-medium">No friends yet</p>
        <p className="text-xs text-gray-600 mt-1">
          Add any Codeforces handle above to start tracking rivals.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {friends.map((f, i) => (
        <motion.div
          key={f.handle}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.4 }}
          className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 shadow-xl flex flex-col gap-4 group"
        >
          <div className="flex items-center gap-3">
            <Avatar handle={f.handle} avatar={f.avatar} rating={f.rating} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate" style={{ color: getRankColor(f.rating) }}>
                {f.handle}
              </p>
              <p className="text-[11px] text-gray-500 capitalize truncate">
                {f.rank || "unrated"} · synced {timeAgo(f.lastSyncedAt)}
              </p>
            </div>
            <button
              onClick={() => remove(f.handle)}
              disabled={removing === f.handle}
              title="Remove friend"
              className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <Trash2 size={15} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <MiniStat label="Rating" value={f.rating ?? "—"} color={getRankColor(f.rating)} />
            <MiniStat label="Solved" value={f.problemsSolved} />
            <MiniStat
              label="Last 5"
              value={f.recentContests > 0 ? (f.recentDelta >= 0 ? `+${f.recentDelta}` : f.recentDelta) : "—"}
              color={f.recentContests > 0 ? (f.recentDelta >= 0 ? "#34d399" : "#f87171") : undefined}
            />
          </div>

          <button
            onClick={() => onCompare(f.handle)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#D85D3F]/10 border border-[#D85D3F]/25 text-[#D85D3F] hover:bg-[#D85D3F]/20 text-sm font-semibold transition-colors"
          >
            <Swords size={15} /> Compare
          </button>
        </motion.div>
      ))}
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div className="rounded-xl bg-black/20 border border-white/5 py-2">
      <p className="text-sm font-bold tabular-nums" style={color ? { color } : { color: "#fff" }}>
        {value}
      </p>
      <p className="text-[9px] uppercase tracking-wider text-gray-600 mt-0.5">{label}</p>
    </div>
  );
}
