export default function StatCard({ label, value, subValue, subLabel, isPrimary = false }) {
  // Determine if the change is positive or negative for styling
  const isPositive = subValue?.toString().startsWith("+");
  const subColor = isPositive ? "text-emerald-500" : "text-rose-500";

  return (
    <div className="flex flex-col relative pl-2">
      {/* 1. Label: Ultra-small, uppercase, wide tracking */}
      <h4 className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">
        {label}
      </h4>

      {/* 2. Value Row: Big Serif Number + Small Change Indicator */}
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-5xl font-serif text-white tracking-tight leading-none">
          {value}
        </span>
        
        {subValue && (
          <span className={`text-sm font-sans font-semibold ${subColor}`}>
            {subValue}
          </span>
        )}
      </div>

      {/* 3. Sub-Label: "Specialist rank achieved", etc. */}
      {subLabel && (
        <span className="text-xs text-zinc-500 font-sans font-medium">
          {subLabel}
        </span>
      )}

      {/* 4. Primary Indicator: The blue glow line for the main stat */}
      {isPrimary && (
        <div className="absolute -bottom-4 left-2 w-20 h-1 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
      )}
    </div>
  );
}