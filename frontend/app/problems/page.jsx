"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ChevronLeft, ChevronRight, ChevronDown,
  ArrowUpDown, ExternalLink, X,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import { apiFetch, getRankColor } from "../lib/cf";

const RATING_STEPS = [];
for (let r = 800; r <= 3500; r += 100) RATING_STEPS.push(r);

const STATUS_OPTIONS = [
  { value: "all",       label: "All" },
  { value: "solved",    label: "Solved" },
  { value: "attempted", label: "Attempted" },
  { value: "untouched", label: "Untouched" },
];

const STATUS_BADGE = {
  solved:    { label: "Solved",    cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25" },
  attempted: { label: "Attempted", cls: "text-amber-400 bg-amber-400/10 border-amber-400/25" },
  untouched: { label: "—",         cls: "text-gray-600 bg-transparent border-transparent" },
};

export default function ProblemsPage() {
  const [filters, setFilters] = useState({
    search: "", minRating: "", maxRating: "", tags: [], status: "all", order: "asc",
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allTags, setAllTags] = useState([]);

  // Debounced fetch: search keystrokes shouldn't fire a request each.
  const timer = useRef();
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ page, pageSize: 25, sort: "rating", order: filters.order });
      if (filters.search) params.set("search", filters.search);
      if (filters.minRating) params.set("minRating", filters.minRating);
      if (filters.maxRating) params.set("maxRating", filters.maxRating);
      if (filters.tags.length) params.set("tags", filters.tags.join(","));
      if (filters.status !== "all") params.set("status", filters.status);

      apiFetch(`/problems?${params}`)
        .then((d) => { setData(d); setError(null); })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(timer.current);
  }, [filters, page]);

  useEffect(() => {
    apiFetch("/problems/tags").then((d) => setAllTags(d.tags)).catch(() => {});
  }, []);

  const update = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#111111] text-gray-300 font-sans overflow-hidden selection:bg-[#D85D3F]/30 relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#D85D3F]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#D85D3F]/5 blur-[120px] rounded-full pointer-events-none" />

      <Sidebar className="z-20 relative" />

      <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 sm:py-8 overflow-y-auto relative z-10 custom-scrollbar">
        <div className="max-w-6xl mx-auto pb-24 md:pb-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
              Problems
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Browse every problem in the system and pick your next battle.
            </p>
          </motion.div>

          <FilterBar filters={filters} update={update} allTags={allTags} />

          {error ? (
            <p className="text-sm text-red-400 mt-6">{error}</p>
          ) : (
            <ProblemTable data={data} loading={loading} page={page} setPage={setPage} />
          )}
        </div>
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

// ── Filters ───────────────────────────────────────────────────────────────────
function FilterBar({ filters, update, allTags }) {
  const [tagsOpen, setTagsOpen] = useState(false);

  const toggleTag = (t) =>
    update({
      tags: filters.tags.includes(t)
        ? filters.tags.filter((x) => x !== t)
        : [...filters.tags, t],
    });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.5 }}
      className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4 sm:p-5 shadow-xl space-y-4"
    >
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder="Search problems by name…"
            className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[#D85D3F]/50 transition-colors"
          />
        </div>

        {/* Rating range */}
        <div className="flex items-center gap-2">
          <RatingSelect
            value={filters.minRating}
            onChange={(v) => update({ minRating: v })}
            placeholder="Min"
          />
          <span className="text-gray-600 text-xs">–</span>
          <RatingSelect
            value={filters.maxRating}
            onChange={(v) => update({ maxRating: v })}
            placeholder="Max"
          />
          <button
            onClick={() => update({ order: filters.order === "asc" ? "desc" : "asc" })}
            title={`Rating ${filters.order === "asc" ? "ascending" : "descending"}`}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-xs text-gray-400 hover:text-white transition-colors whitespace-nowrap"
          >
            <ArrowUpDown size={13} />
            {filters.order === "asc" ? "Low → High" : "High → Low"}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        {/* Status segmented */}
        <div className="flex rounded-xl bg-black/30 border border-white/10 p-1 w-fit">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => update({ status: s.value })}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filters.status === s.value
                  ? "bg-[#D85D3F]/20 text-[#D85D3F]"
                  : "text-gray-500 hover:text-gray-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Tags toggle */}
        <button
          onClick={() => setTagsOpen((o) => !o)}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors w-fit"
        >
          <ChevronDown size={14} className={`transition-transform ${tagsOpen ? "rotate-180" : ""}`} />
          Tags{filters.tags.length > 0 && (
            <span className="text-[#D85D3F] font-semibold">({filters.tags.length})</span>
          )}
        </button>
      </div>

      {/* Selected tags always visible */}
      {filters.tags.length > 0 && !tagsOpen && (
        <div className="flex flex-wrap gap-1.5">
          {filters.tags.map((t) => (
            <button
              key={t}
              onClick={() => toggleTag(t)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-[#D85D3F]/15 border border-[#D85D3F]/30 text-[#D85D3F]"
            >
              {t} <X size={10} />
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {tagsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 pt-1">
              {allTags.map((t) => {
                const on = filters.tags.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTag(t)}
                    className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                      on
                        ? "bg-[#D85D3F]/15 border-[#D85D3F]/30 text-[#D85D3F]"
                        : "bg-white/[0.03] border-white/10 text-gray-500 hover:text-gray-200"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RatingSelect({ value, onChange, placeholder }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-gray-300 outline-none focus:border-[#D85D3F]/50 transition-colors appearance-none cursor-pointer"
    >
      <option value="">{placeholder}</option>
      {RATING_STEPS.map((r) => (
        <option key={r} value={r}>{r}</option>
      ))}
    </select>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────
function ProblemTable({ data, loading, page, setPage }) {
  if (!data && loading) {
    return (
      <div className="mt-6 space-y-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-12 rounded-2xl border border-white/5 bg-white/[0.02] animate-pulse" />
        ))}
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className={`mt-6 transition-opacity ${loading ? "opacity-50" : ""}`}>
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-gray-600 border-b border-white/10">
                <th className="text-left font-medium px-6 py-3.5 w-20">ID</th>
                <th className="text-left font-medium px-3 py-3.5">Problem</th>
                <th className="text-right font-medium px-3 py-3.5 w-20">Rating</th>
                <th className="text-left font-medium px-3 py-3.5">Tags</th>
                <th className="text-right font-medium px-6 py-3.5 w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.problems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-gray-500 italic text-sm">
                    No problems match these filters.
                  </td>
                </tr>
              )}
              {data.problems.map((p) => {
                const badge = STATUS_BADGE[p.status];
                const color = getRankColor(p.rating);
                return (
                  <tr key={`${p.contestId}-${p.index}-${p.name}`} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3 text-xs text-gray-600 tabular-nums whitespace-nowrap">
                      {p.contestId != null ? `${p.contestId}${p.index}` : "—"}
                    </td>
                    <td className="px-3 py-3 max-w-[320px]">
                      {p.url ? (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-200 hover:text-white flex items-center gap-1.5 group transition-colors"
                        >
                          <span className="truncate">{p.name}</span>
                          <ExternalLink size={11} className="text-gray-700 group-hover:text-gray-500 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-gray-200 truncate block">{p.name}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {p.rating != null ? (
                        <span className="font-bold tabular-nums" style={{ color }}>{p.rating}</span>
                      ) : (
                        <span className="text-gray-700">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(p.tags ?? []).slice(0, 4).map((t) => (
                          <span key={t} className="px-2 py-0.5 rounded-full text-[10px] text-gray-500 bg-white/[0.04] border border-white/5">
                            {t}
                          </span>
                        ))}
                        {(p.tags?.length ?? 0) > 4 && (
                          <span className="text-[10px] text-gray-700">+{p.tags.length - 4}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 px-2">
        <p className="text-xs text-gray-600 tabular-nums">
          {data.total.toLocaleString()} problems · page {data.page} of {data.totalPages}
        </p>
        <div className="flex gap-2">
          <PageButton disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft size={15} />
          </PageButton>
          <PageButton disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight size={15} />
          </PageButton>
        </div>
      </div>
    </div>
  );
}

function PageButton({ disabled, onClick, children }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}
