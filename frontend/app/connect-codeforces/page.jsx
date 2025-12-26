"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

export default function ConnectCodeforcesPage() {
  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_URL;

  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");

  /* -------------------- Poll job status -------------------- */
  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/codeforces/sync/${jobId}`, {
          credentials: "include",
        });

        const data = await res.json();
        setStatus(data.status);

        if (data.status === "completed") {
          clearInterval(interval);
          router.push("/dashboard");
        }

        if (data.status === "failed") {
          clearInterval(interval);
          setError(data.errorMessage || "Sync failed");
          setLoading(false);
        }
      } catch {
        clearInterval(interval);
        setError("Failed to check sync status");
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId]);

  /* -------------------- Submit -------------------- */
  async function startSync() {
    if (!handle) return;

    setLoading(true);
    setError("");

    try {
      // 1️⃣ Link handle
      const linkRes = await fetch(`${API_BASE}/codeforces/link-handle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ handle }),
      });

      if (!linkRes.ok) {
        const data = await linkRes.json();
        throw new Error(data.error || "Invalid handle");
      }

      // 2️⃣ Create sync job
      const syncRes = await fetch(`${API_BASE}/codeforces/sync`, {
        method: "POST",
        credentials: "include",
      });

      const syncData = await syncRes.json();
      setJobId(syncData.jobId);
      setStatus("pending");
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center justify-center px-4">
      {/* Title */}
      <h1 className="text-3xl font-medium mb-2 animate-fadeIn">
        Connect Codeforces
      </h1>
      <p className="text-sm text-gray-400 mb-10 text-center max-w-md">
        Enter your handle to synchronize your submission history and unlock
        analytics.
      </p>

      {/* Card */}
      <div className="w-full max-w-md bg-[#1a1a1a] border border-[#262626] rounded-2xl p-6 shadow-xl animate-scaleIn">
        {/* Input */}
        <label className="text-xs text-gray-400">Codeforces Handle</label>
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="tourist"
          className="mt-1 w-full bg-[#262626] border border-[#333] rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-orange-500"
        />

        {/* Button */}
        <button
          onClick={startSync}
          disabled={loading}
          className="mt-6 w-full bg-white text-black font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 transition disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Syncing…
            </>
          ) : (
            <>
              Initiate Sync <ArrowRight size={16} />
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <p className="mt-4 text-sm text-red-400 text-center">{error}</p>
        )}
      </div>

      {/* Progress */}
      {status && (
        <div className="mt-10 w-full max-w-md animate-fadeIn">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>Ingesting data…</span>
            <span>
              {status === "pending" && "0%"}
              {status === "running" && "45%"}
              {status === "completed" && "100%"}
            </span>
          </div>

          <div className="h-1 bg-[#262626] rounded">
            <div
              className={`h-full rounded bg-orange-500 transition-all ${
                status === "pending"
                  ? "w-[10%]"
                  : status === "running"
                  ? "w-[45%]"
                  : "w-full"
              }`}
            />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 text-xs text-gray-400">
            <div className="bg-[#1a1a1a] border border-[#262626] rounded-lg p-3 text-center">
              <div className="text-gray-500">STATUS</div>
              <div className="text-white capitalize">{status}</div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#262626] rounded-lg p-3 text-center">
              <div className="text-gray-500">SUBMISSIONS</div>
              <div className="text-white">28k+</div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#262626] rounded-lg p-3 text-center">
              <div className="text-gray-500">TIME</div>
              <div className="text-white">~30s</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
