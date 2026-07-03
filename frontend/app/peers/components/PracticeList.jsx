"use client";

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { getRankColor } from "../../lib/cf";

export default function PracticeList({ problems }) {
  if (!problems?.length) {
    return (
      <p className="text-gray-500 text-sm italic text-center py-10">
        Nothing to steal — you've solved everything they have. Find a stronger rival!
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {problems.map((p, i) => {
        const url =
          p.contestId != null
            ? `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`
            : null;
        const color = getRankColor(p.rating);
        const card = (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: (i % 6) * 0.04, duration: 0.35 }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4 shadow-lg hover:border-white/20 hover:bg-white/[0.05] transition-colors h-full"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-gray-200 leading-snug">
                {p.contestId != null && (
                  <span className="text-gray-600 mr-1.5 text-xs tabular-nums">
                    {p.contestId}{p.index}
                  </span>
                )}
                {p.name}
              </p>
              {url && <ExternalLink size={13} className="text-gray-600 shrink-0 mt-0.5" />}
            </div>
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums border"
                style={{ color, borderColor: `${color}40`, backgroundColor: `${color}15` }}
              >
                {p.rating}
              </span>
              {(p.tags ?? []).slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-full text-[10px] text-gray-500 bg-white/[0.04] border border-white/5"
                >
                  {t}
                </span>
              ))}
            </div>
          </motion.div>
        );

        return url ? (
          <a key={`${p.contestId}-${p.index}`} href={url} target="_blank" rel="noopener noreferrer">
            {card}
          </a>
        ) : (
          <div key={`${p.contestId}-${p.index}-${p.name}`}>{card}</div>
        );
      })}
    </div>
  );
}
