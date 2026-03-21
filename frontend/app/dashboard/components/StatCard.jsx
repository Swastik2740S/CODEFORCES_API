"use client";

export default function StatCard({ label, value, subValue, subLabel, isPrimary = false }) {
  // Determine if the change is positive or negative for styling
  const isPositive = subValue?.toString().startsWith("+");
  const subColor = isPositive ? "text-emerald-400" : "text-red-400";

  return (
    <div className="relative p-5 sm:p-6 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-lg hover:bg-white/[0.06] hover:border-white/20 transition-all duration-300 group flex flex-col h-full justify-between">
      
      <div>
        {/* 1. Label: Small, uppercase, wide tracking */}
        <div className="flex justify-between items-start mb-3">
          <h4 className="text-[10px] sm:text-xs font-sans font-bold uppercase tracking-[0.2em] text-gray-500 truncate pr-2">
            {label}
          </h4>
          
          {/* Subtle glowing dot indicator for primary cards instead of a floating line */}
          {isPrimary && (
            <div className="w-2 h-2 rounded-full bg-[#D85D3F] shadow-[0_0_10px_rgba(216,93,63,0.8)] animate-pulse shrink-0 mt-0.5" />
          )}
        </div>

        {/* 2. Value Row: Scales from 4xl on mobile to 5xl on desktop */}
        <div className="flex items-baseline gap-2 sm:gap-3 mb-1 flex-wrap">
          <span className={`text-4xl sm:text-5xl font-serif tracking-tight leading-none ${isPrimary ? "text-[#D85D3F] drop-shadow-md" : "text-white"}`}>
            {value}
          </span>
          
          {subValue && (
            <span className={`text-xs sm:text-sm font-sans font-semibold px-2 py-0.5 rounded-md bg-white/5 border border-white/5 ${subColor}`}>
              {subValue}
            </span>
          )}
        </div>
      </div>

      {/* 3. Sub-Label: "Specialist rank achieved", etc. */}
      {subLabel && (
        <span className="text-[10px] sm:text-xs text-gray-500 font-sans font-medium mt-3 truncate block group-hover:text-gray-400 transition-colors">
          {subLabel}
        </span>
      )}

      {/* 4. Primary Indicator: The Orange glass glow line at the bottom edge */}
      {isPrimary && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D85D3F] to-transparent opacity-70 shadow-[0_0_15px_rgba(216,93,63,0.8)]" />
      )}
    </div>
  );
}