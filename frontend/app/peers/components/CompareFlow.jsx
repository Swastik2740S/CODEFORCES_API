"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, RefreshCw, UserPlus, UserCheck } from "lucide-react";
import { apiFetch, timeAgo } from "../../lib/cf";
import CompareView from "./CompareView";

const POLL_MS = 2500;
const COMPARE_409_RETRIES = 5; // stats job may land moments after the session completes

const STAGE_LABEL = {
  queued: "Waiting in queue",
  profile: "Fetching profile",
  ratings: "Fetching contest history",
  submissions: "Crawling submissions",
  submissions_full: "Crawling submissions",
  activity: "Building activity",
  stats: "Computing statistics",
};

// Orchestrates: POST sync → (poll session) → GET compare → <CompareView/>.
export default function CompareFlow({ handle, onBack }) {
  const [progress, setProgress] = useState({ pct: 5, stage: "queued" });
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0); // bump to re-run the whole flow

  useEffect(() => {
    let cancelled = false;
    let timer;

    const fail = (msg) => { if (!cancelled) setError(msg); };

    async function loadCompare(h, retries = COMPARE_409_RETRIES) {
      try {
        const json = await apiFetch(`/peers/compare/${encodeURIComponent(h)}`);
        if (!cancelled) setData(json);
      } catch (err) {
        if (cancelled) return;
        if (err.status === 409 && retries > 0) {
          timer = setTimeout(() => loadCompare(h, retries - 1), 2000);
        } else {
          fail(err.message);
        }
      }
    }

    async function poll(sessionId, h) {
      if (cancelled) return;
      try {
        const s = await apiFetch(`/codeforces/sync/session/${sessionId}`);
        if (cancelled) return;
        if (s.status === "completed") return loadCompare(h);
        if (s.status === "failed") return fail(s.errorMessage || "Sync failed — try again");
        setProgress({ pct: s.progress ?? 5, stage: s.currentStage ?? "queued" });
        timer = setTimeout(() => poll(sessionId, h), POLL_MS);
      } catch (err) {
        fail(err.message);
      }
    }

    setData(null);
    setError(null);
    setProgress({ pct: 5, stage: "queued" });

    apiFetch(`/peers/${encodeURIComponent(handle)}/sync`, { method: "POST" })
      .then((r) => {
        if (cancelled) return;
        if (r.ready) return loadCompare(r.handle);
        poll(r.sessionId, r.handle);
      })
      .catch((err) => fail(err.message));

    return () => { cancelled = true; clearTimeout(timer); };
  }, [handle, attempt]);

  return (
    <div className="max-w-6xl mx-auto pb-24 md:pb-10">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Peers
        </button>

        {data && (
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-[11px] text-gray-600">
              synced {timeAgo(data.peer.lastSyncedAt)}
            </span>
            <FollowButton handle={data.peer.handle} initial={data.isFriend} />
            <button
              onClick={() => setAttempt((a) => a + 1)}
              title="Re-sync peer data"
              className="p-2 rounded-xl bg-white/[0.05] border border-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        )}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => setAttempt((a) => a + 1)} />
      ) : !data ? (
        <SyncProgress handle={handle} progress={progress} />
      ) : (
        <CompareView data={data} />
      )}
    </div>
  );
}

function FollowButton({ handle, initial }) {
  const [isFriend, setIsFriend] = useState(initial);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (isFriend) {
        await apiFetch(`/peers/${encodeURIComponent(handle)}`, { method: "DELETE" });
        setIsFriend(false);
      } else {
        await apiFetch(`/peers/${encodeURIComponent(handle)}/follow`, { method: "POST" });
        setIsFriend(true);
      }
    } catch {
      /* leave state as-is; next page load reconciles */
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
        isFriend
          ? "bg-emerald-400/10 border-emerald-400/25 text-emerald-400 hover:bg-emerald-400/20"
          : "bg-[#D85D3F]/10 border-[#D85D3F]/25 text-[#D85D3F] hover:bg-[#D85D3F]/20"
      }`}
    >
      {busy ? (
        <Loader2 size={14} className="animate-spin" />
      ) : isFriend ? (
        <UserCheck size={14} />
      ) : (
        <UserPlus size={14} />
      )}
      {isFriend ? "Friend" : "Add friend"}
    </button>
  );
}

function SyncProgress({ handle, progress }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-10 shadow-xl max-w-xl mx-auto mt-16 text-center"
    >
      <Loader2 size={28} className="animate-spin text-[#D85D3F] mx-auto mb-4" />
      <p className="text-white font-medium">
        Syncing <span className="text-[#D85D3F] font-semibold">{handle}</span> from Codeforces
      </p>
      <p className="text-xs text-gray-500 mt-1">
        {STAGE_LABEL[progress.stage] ?? "Working"}… first sync of a new peer can take a minute.
      </p>
      <div className="mt-6 h-2 rounded-full bg-black/40 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#D85D3F] to-[#f0885f]"
          animate={{ width: `${Math.max(progress.pct, 5)}%` }}
          transition={{ ease: "easeOut", duration: 0.6 }}
        />
      </div>
      <p className="text-[11px] text-gray-600 mt-2 tabular-nums">{progress.pct}%</p>
    </motion.div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-3xl border border-red-400/20 bg-red-400/[0.04] p-10 max-w-xl mx-auto mt-16 text-center">
      <p className="text-red-400 font-medium">{message}</p>
      <button
        onClick={onRetry}
        className="mt-5 px-5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-sm text-gray-200 hover:bg-white/[0.1] transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
