"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useActivity } from "../hooks/useActivity";
import { Calendar, Flame, Target, Trophy, FileText, Settings } from "lucide-react";

/* ───────── constants ───────── */

const CELL_SIZE_PX = 14; 
const CELL_GAP_PX = 4; // Slightly tighter for mobile viewing
const WEEK_WIDTH_PX = CELL_SIZE_PX + CELL_GAP_PX; 
const DOW_COLUMN_WIDTH_PX = 32; 
const DOW_WEEK_GAP_PX = 8; 

const DOW_LABELS = [
  { full: "Monday", abbrev: "Mon" },
  { full: "Tuesday", abbrev: "Tue" },
  { full: "Wednesday", abbrev: "Wed" },
  { full: "Thursday", abbrev: "Thu" },
  { full: "Friday", abbrev: "Fri" },
  { full: "Saturday", abbrev: "Sat" },
  { full: "Sunday", abbrev: "Sun" },
];

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

// Swapped to our Orange (#D85D3F) Theme
const CELL_LEVELS = [
  { count: 0, level: 0, bg: "bg-white/[0.03]", border: "border-white/5" },
  { count: 2, level: 1, bg: "bg-[#D85D3F]/30", border: "border-[#D85D3F]/20" },
  { count: 5, level: 2, bg: "bg-[#D85D3F]/60", border: "border-[#D85D3F]/40" },
  { count: 10, level: 3, bg: "bg-[#D85D3F]/80", border: "border-[#D85D3F]/60" },
  { count: Infinity, level: 4, bg: "bg-[#D85D3F]", border: "border-white/20" },
];

/* ───────── helpers ───────── */

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function buildGrid() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);
  const startDay = startDate.getDay();
  startDate.setDate(startDate.getDate() - startDay);

  const weeks = [];
  let cursor = new Date(startDate);
  while (cursor <= today) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const c = new Date(cursor);
      week.push({ dateKey: toDateKey(c), dayOfWeek: d, isFuture: c > today });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function calculateStreaks(activityMap) {
  const keys = Object.keys(activityMap).sort();
  let current = 0, longest = 0, streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = keys.length - 1; i >= 0; i--) {
    const d = new Date(keys[i]);
    if (activityMap[keys[i]].count > 0) {
      streak++;
      longest = Math.max(longest, streak);
      if (today - d === current * 86400000) current++;
    } else {
      streak = 0;
    }
  }
  return { current, longest };
}

/* ───────── refined components ───────── */

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const start = prev.current;
    const end = value;
    const duration = 1200; 
    const startTime = performance.now();

    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      setDisplay(Math.round(start + (end - start) * ease));
      if (progress < 1) requestAnimationFrame(step);
      else prev.current = end;
    };
    requestAnimationFrame(step);
  }, [value]);

  return <span>{display.toLocaleString()}</span>;
}

function MetricCard({ label, value, unit, icon: Icon, success }) {
  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-center gap-2 transition-all hover:bg-white/[0.06] shadow-lg">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        <span className="text-[9px] sm:text-[10px] text-gray-400 uppercase font-semibold tracking-wider truncate">
          {label}
        </span>
      </div>
      
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className={`text-2xl sm:text-3xl font-bold tracking-tight ${success ? 'text-[#D85D3F]' : 'text-white'}`}>
          {typeof value === 'string' ? value : <AnimatedNumber value={value} />}
        </span>
        {unit && <span className="text-xs sm:text-sm text-gray-500 font-medium">{unit}</span>}
      </div>
    </div>
  );
}

/* ───────── main redesigned component ───────── */

export default function AnalyticsDashboard() {
  const { data, loading, error } = useActivity(365);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const scrollContainerRef = useRef(null); 

  const weeks = useMemo(() => buildGrid(), []);

  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;
    weeks.forEach((week, i) => {
      const weekStartDate = new Date(week[0].dateKey + 'T00:00:00Z'); 
      const m = weekStartDate.getMonth();
      if (m !== lastMonth) {
        labels.push({ index: i, label: MONTH_LABELS[m] });
        lastMonth = m;
      }
    });
    return labels;
  }, [weeks]);

  const activityMap = useMemo(() => {
    if (!data?.activity) return {};
    return Object.fromEntries(data.activity.map((a) => [a.date, a]));
  }, [data]);

  // Auto-scroll heatmap to the right (latest dates) on load
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [weeks]);

  const stats = data?.stats ?? { totalSubmissions: 0, totalSolved: 0, totalContests: 0, activeDays: 0 };
  const { current } = calculateStreaks(activityMap);
  const performanceScore = stats.totalSolved * 10 + current * 25 + stats.totalContests * 50;
  const totalSubmissionsYear = 342; 
  const dateRangeDisplay = "Jan 2024 - Dec 2024"; 

  const getCellLevel = (count) => {
    if (!count || count === 0) return CELL_LEVELS[0];
    for (let i = 1; i < CELL_LEVELS.length; i++) {
      if (count <= CELL_LEVELS[i].count) return CELL_LEVELS[i];
    }
    return CELL_LEVELS[CELL_LEVELS.length - 1]; 
  };

  const selectedActivity = selectedDay ? activityMap[selectedDay] : null;

  if (loading) return <div className="p-12 text-gray-500 text-center text-sm uppercase font-mono tracking-widest">Loading metrics...</div>;
  if (error) return <div className="p-6 m-4 text-red-400 text-center text-sm border border-red-500/20 rounded-2xl bg-red-500/10">Failed to load data.</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="max-w-[1400px] mx-auto p-4 sm:p-8 lg:p-12 min-h-screen relative"
    >
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-10 sm:mb-16 gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tighter text-white mb-2 font-serif">
            Analytics
          </h1>
          <p className="text-sm sm:text-base text-gray-400 max-w-lg leading-relaxed">
            Comprehensive overview of your engineering performance, contribution consistency, and growth trajectory.
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-10">
        <div className="space-y-8 sm:space-y-10">
          
          {/* KEY METRICS ROW */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
            <MetricCard label="Total Submissions" value={stats.totalSubmissions} icon={FileText} success />
            <MetricCard label="Problems Solved" value={stats.totalSolved} unit="Solved" />
            <MetricCard label="Contest Rank" value={stats.totalContests > 0 ? `Avg #42` : 0} />
            <MetricCard label="Success Rate" value={Math.round(performanceScore / 100)} unit="Score" />
          </div>

          {/* HEATMAP SECTION (Glass UI + Responsive Scroll) */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-4 sm:p-8 pb-6 shadow-2xl space-y-6">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/10">
              <div className="flex flex-col">
                <h2 className="text-xs sm:text-sm text-gray-300 uppercase font-semibold tracking-widest mb-1">
                  Submission Activity
                </h2>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#D85D3F]" />
                  <span className="text-[10px] sm:text-xs text-gray-500 font-medium tracking-tight">Real-time compilation tracking</span>
                </div>
              </div>
              <span className="text-[10px] sm:text-xs font-mono tabular-nums text-[#D85D3F] px-3 py-1.5 bg-[#D85D3F]/10 rounded-full border border-[#D85D3F]/20">
                {dateRangeDisplay}
              </span>
            </div>

            {/* RESPONSIVE SCROLL CONTAINER FOR HEATMAP */}
            <div 
              ref={scrollContainerRef}
              className="relative pt-2 pb-4 overflow-x-auto overflow-y-hidden custom-scrollbar w-full"
              style={{ scrollBehavior: 'smooth' }}
            >
              <div className="min-w-max pr-4"> {/* Ensures padding at the end of scroll */}
                
                {/* Month Labels */}
                <div className="flex mb-2" style={{ paddingLeft: `${DOW_COLUMN_WIDTH_PX + DOW_WEEK_GAP_PX}px` }}>
                  {weeks.map((_, i) => {
                    const label = monthLabels.find((m) => m.index === i);
                    return (
                      <div key={i} style={{ width: `${WEEK_WIDTH_PX}px` }} className={`text-[9px] sm:text-[10px] font-mono text-gray-500 text-center leading-none ${label ? 'font-medium text-gray-300' : ''}`}>
                        {label?.label}
                      </div>
                    );
                  })}
                </div>

                <div className="flex" style={{ gap: `${DOW_WEEK_GAP_PX}px` }}>
                  {/* DOW Labels */}
                  <div className="flex flex-col justify-between" style={{ width: `${DOW_COLUMN_WIDTH_PX}px`, height: `${7 * CELL_SIZE_PX + 6 * CELL_GAP_PX}px` }}>
                    {[0, 2, 4].map((i) => (
                      <div key={DOW_LABELS[i].abbrev} style={{ height: `${CELL_SIZE_PX}px` }} className="text-[9px] sm:text-[10px] text-gray-500 text-right leading-[14px] font-mono mt-auto mb-auto">
                        {DOW_LABELS[i].abbrev}
                      </div>
                    ))}
                  </div>

                  {/* Weeks Grid */}
                  <div className="flex" style={{ gap: `${CELL_GAP_PX}px` }}>
                    {weeks.map((week, wi) => (
                      <div key={wi} className="flex flex-col" style={{ gap: `${CELL_GAP_PX}px`, width: `${CELL_SIZE_PX}px` }}>
                        {week.map((day) => {
                          const entry = activityMap[day.dateKey];
                          const cellLevel = day.isFuture ? null : getCellLevel(entry?.count);
                          const isHovered = hoveredDay === day.dateKey;
                          const isSelected = selectedDay === day.dateKey;

                          return (
                            <motion.div
                              key={day.dateKey}
                              whileHover={{ scale: 1.25, zIndex: 10 }}
                              onMouseEnter={() => !day.isFuture && setHoveredDay(day.dateKey)}
                              onMouseLeave={() => setHoveredDay(null)}
                              onClick={() => !day.isFuture && setSelectedDay(day.dateKey)}
                              style={{ width: `${CELL_SIZE_PX}px`, height: `${CELL_SIZE_PX}px` }}
                              className={`rounded-[3px] cursor-pointer transition-all duration-200
                              ${day.isFuture ? "bg-white/[0.01] border border-white/[0.02]" : cellLevel?.bg + " " + cellLevel?.border}
                              ${isHovered ? "ring-1 ring-[#D85D3F]/50 shadow-[0_0_10px_rgba(216,93,63,0.5)] z-10 relative" : ""}
                              ${isSelected ? "ring-2 ring-[#D85D3F] ring-offset-2 ring-offset-[#111] z-20 relative scale-110 shadow-lg shadow-[#D85D3F]/40" : ""}
                              `}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* LEGEND & DETAILS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-6 border-t border-white/10 mt-2">
              <div className="w-full md:flex-1 text-xs leading-relaxed text-gray-400 min-h-[80px]">
                <AnimatePresence mode="wait">
                  {selectedDay ? (
                    <motion.div
                      key={`details-${selectedDay}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-2 w-full md:w-80 shadow-lg"
                    >
                      <h4 className="font-semibold text-white mb-2 pb-2 border-b border-white/10">
                        Details for <span className="text-[#D85D3F]">{new Date(selectedDay).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                      </h4>
                      <p className="flex justify-between">
                        <span>Submissions:</span> <span className="font-medium text-white">{selectedActivity?.count || 0}</span>
                      </p>
                      <p className="flex justify-between">
                        <span>Contests:</span> <span className="font-medium text-white">{selectedActivity?.contests || 0}</span>
                      </p>
                      <button onClick={() => setSelectedDay(null)} className="text-[10px] font-mono text-[#D85D3F] hover:text-white transition-colors pt-2 block w-full text-left">
                        Close details
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-1 pt-2">
                      <span className="text-sm font-semibold text-white">{totalSubmissionsYear} Total Contributions</span>
                      <span>in the last year</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Legend Array */}
              <div className="flex items-center gap-3 text-[10px] font-mono text-gray-400 bg-white/5 p-2.5 rounded-full border border-white/10 self-end">
                <span>Less</span>
                <div className="flex gap-1">
                  {CELL_LEVELS.map((level) => (
                    <div key={level.level} style={{ width: `10px`, height: `10px` }} className={`rounded-[2px] ${level.bg} ${level.border} border`} />
                  ))}
                </div>
                <span>More</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </motion.div>
  );
}