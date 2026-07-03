"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ME_COLOR, PEER_COLOR } from "./CompareView";

// Tornado chart: for each tag, my solved count grows leftward, theirs grows
// rightward — an instant read of who owns which topic.
export default function TagCompare({ me, peer }) {
  const rows = useMemo(() => {
    const map = new Map();
    for (const t of me.tagMastery ?? []) {
      map.set(t.tag, { tag: t.tag, me: t.solved ?? 0, peer: 0 });
    }
    for (const t of peer.tagMastery ?? []) {
      const cur = map.get(t.tag) ?? { tag: t.tag, me: 0, peer: 0 };
      cur.peer = t.solved ?? 0;
      map.set(t.tag, cur);
    }
    return [...map.values()]
      .sort((a, b) => b.me + b.peer - (a.me + a.peer))
      .slice(0, 10);
  }, [me, peer]);

  if (rows.length === 0) {
    return (
      <p className="text-gray-500 text-sm italic text-center py-10">
        No tag data yet — solve a few problems first.
      </p>
    );
  }

  const max = Math.max(...rows.map((r) => Math.max(r.me, r.peer)), 1);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4 sm:p-8 shadow-xl">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 sm:gap-x-4 gap-y-3">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-right" style={{ color: ME_COLOR }}>
          {me.handle}
        </p>
        <span />
        <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: PEER_COLOR }}>
          {peer.handle}
        </p>

        {rows.map((r, i) => (
          <TagRow key={r.tag} row={r} max={max} index={i} />
        ))}
      </div>
      <p className="text-[10px] text-gray-600 mt-5 text-center">
        Problems solved per tag · top {rows.length} tags between you
      </p>
    </div>
  );
}

function TagRow({ row, max, index }) {
  const leftWins = row.me > row.peer;
  const rightWins = row.peer > row.me;
  return (
    <>
      <div className="flex items-center justify-end gap-2 min-w-0">
        <span className={`text-xs tabular-nums ${leftWins ? "text-white font-semibold" : "text-gray-600"}`}>
          {row.me}
        </span>
        <div className="h-3 flex-1 flex justify-end">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${(row.me / max) * 100}%` }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.03, duration: 0.5, ease: "easeOut" }}
            className="h-full rounded-l-full"
            style={{ backgroundColor: ME_COLOR, opacity: leftWins ? 1 : 0.45 }}
          />
        </div>
      </div>

      <p className="text-[10px] sm:text-xs text-gray-400 text-center capitalize whitespace-nowrap px-1">
        {row.tag}
      </p>

      <div className="flex items-center gap-2 min-w-0">
        <div className="h-3 flex-1 flex justify-start">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${(row.peer / max) * 100}%` }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.03, duration: 0.5, ease: "easeOut" }}
            className="h-full rounded-r-full"
            style={{ backgroundColor: PEER_COLOR, opacity: rightWins ? 1 : 0.45 }}
          />
        </div>
        <span className={`text-xs tabular-nums ${rightWins ? "text-white font-semibold" : "text-gray-600"}`}>
          {row.peer}
        </span>
      </div>
    </>
  );
}
