"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useActivity } from "../hooks/useActivity";
import { Calendar, Flame, Target, Trophy, FileText, Settings } from "lucide-react";

/* ───────── constants ───────── */

const CELL_SIZE_PX = 14; // Fixed pixel size for cells
const CELL_GAP_PX = 5; // Fixed pixel size for gaps between weeks
const WEEK_WIDTH_PX = CELL_SIZE_PX + CELL_GAP_PX; // Width a single week column occupies
const DOW_COLUMN_WIDTH_PX = 36; // Width of DOW labels column
const DOW_WEEK_GAP_PX = 8; // Gaps between DOW column and weeks grid

const DOW_LABELS = [
    { full: "Monday", abbrev: "Mon" },
    { full: "Tuesday", abbrev: "Tue" },
    { full: "Wednesday", abbrev: "Wed" },
    { full: "Thursday", abbrev: "Thu" },
    { full: "Friday", abbrev: "Fri" },
    { full: "Saturday", abbrev: "Sat" },
    { full: "Sunday", abbrev: "Sun" },
];

const MONTH_LABELS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"
];

const CELL_LEVELS = [
    { count: 0, level: 0, bg: "bg-[#111111]", border: "border-zinc-800/60" },
    { count: 2, level: 1, bg: "bg-[#0c4055]", border: "border-[#0c4055]" },
    { count: 5, level: 2, bg: "bg-[#126c8e]", border: "border-[#126c8e]" },
    { count: 10, level: 3, bg: "bg-[#179ec0]", border: "border-[#179ec0]" },
    { count: Infinity, level: 4, bg: "bg-[#1dd5fa]", border: "border-[#1dd5fa]" },
];

/* ───────── helpers ───────── */

function toDateKey(date) {
    return date.toISOString().slice(0, 10);
}

function buildGrid() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // We want to generate a full year's grid (365 days), and align it to week boundaries.
    // The start date will be the beginning of the week (Sunday) 364 days ago.
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);

    const startDay = startDate.getDay();
    // Adjust to start on Sunday
    startDate.setDate(startDate.getDate() - startDay);

    const weeks = [];
    let cursor = new Date(startDate);

    while (cursor <= today) {
        const week = [];

        // Grid columns start on Sunday (d=0), and go to Saturday (d=6)
        for (let d = 0; d < 7; d++) {
            const c = new Date(cursor);

            week.push({
                dateKey: toDateKey(c),
                dayOfWeek: d,
                isFuture: c > today,
            });

            cursor.setDate(cursor.getDate() + 1);
        }

        weeks.push(week);
    }

    return weeks;
}

function calculateStreaks(activityMap) {
    const keys = Object.keys(activityMap).sort();
    let current = 0;
    let longest = 0;
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = keys.length - 1; i >= 0; i--) {
        const d = new Date(keys[i]);
        const entry = activityMap[keys[i]];

        if (entry.count > 0) {
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
        const duration = 1200; // Slower, more deliberate animation
        const startTime = performance.now();

        const step = (now) => {
            const progress = Math.min((now - startTime) / duration, 1);
            // Ease out quartic for a premium, non-linear feel
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
    <div className="bg-[#111111] border border-zinc-800 rounded-xl p-5 flex flex-col justify-center gap-2 transition-colors hover:border-zinc-700/80">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-zinc-500" />}
        <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">
          {label}
        </span>
      </div>
      
      <div className="flex items-baseline gap-1.5">
        <span className={`text-3xl font-bold tracking-tight ${success ? 'text-cyan-400' : 'text-white'}`}>
          {/* If the value is a string (like "Avg #42"), render it directly, otherwise use AnimatedNumber */}
          {typeof value === 'string' ? value : <AnimatedNumber value={value} />}
        </span>
        {unit && <span className="text-sm text-zinc-600 font-medium">{unit}</span>}
      </div>
    </div>
  );
}

function AchievementItem({ title, description, icon: Icon, unlocked }) {
    return (
        <div className={`flex items-start gap-4 p-4 rounded-xl ${unlocked ? 'bg-zinc-800/40' : 'bg-zinc-900/40 opacity-70 border border-dashed border-zinc-800/60'}`}>
            <div className={`p-2.5 rounded-lg ${unlocked ? 'bg-cyan-950/40 text-cyan-300' : 'bg-zinc-800 text-zinc-500'}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <h4 className="font-semibold text-white mb-0.5">{title}</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>
            </div>
        </div>
    );
}

/* ───────── main redesigned component ───────── */

export default function AnalyticsDashboard() {
    const { data, loading, error } = useActivity(365);
    const [hoveredDay, setHoveredDay] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);
    const scrollContainerRef = useRef(null); // Ref for potential future auto-scroll

    const weeks = useMemo(() => buildGrid(), []);

    // Calculate Month Labels with accurate alignment by iterating over weeks
    const monthLabels = useMemo(() => {
        const labels = [];
        let lastMonth = -1;
        weeks.forEach((week, i) => {
            // Create a Date object from the first day of the week to check its month
            const weekStartDate = new Date(week[0].dateKey + 'T00:00:00Z'); // Ensure Zulu for date comparison
            const m = weekStartDate.getMonth();
            // If the month of the first day of the week changes, place a new label here
            if (m !== lastMonth) {
                labels.push({
                    index: i, // Week index where the label should start
                    label: MONTH_LABELS[m],
                });
                lastMonth = m;
            }
        });
        return labels;
    }, [weeks]);

    const activityMap = useMemo(() => {
        if (!data?.activity) return {};
        return Object.fromEntries(data.activity.map((a) => [a.date, a]));
    }, [data]);

    const stats = data?.stats ?? {
        totalSubmissions: 0,
        totalSolved: 0,
        totalContests: 0,
        activeDays: 0,
    };

    const { current } = calculateStreaks(activityMap);

    // Redesigned productivity score: focus on streaks and problem solving
    const performanceScore =
        stats.totalSolved * 10 +
        current * 25 +
        stats.totalContests * 50;

    // Simulate total submissions over a year for legend display
    const totalSubmissionsYear = 342; // This would come from real data
    const dateRangeDisplay = "Jan 2024 - Dec 2024"; // This would be dynamic

    const getCellLevel = (count) => {
        if (!count || count === 0) return CELL_LEVELS[0];
        for (let i = 1; i < CELL_LEVELS.length; i++) {
            if (count <= CELL_LEVELS[i].count) return CELL_LEVELS[i];
        }
        return CELL_LEVELS[CELL_LEVELS.length - 1]; // Return max if above all levels
    };

    const selectedActivity = selectedDay ? activityMap[selectedDay] : null;

    if (loading)
        return <div className="p-12 text-zinc-500 text-center text-sm uppercase font-mono tracking-widest">Loading comprehensive performance metrics...</div>;

    if (error)
        return <div className="p-12 text-amber-500 text-center text-sm font-mono border border-dashed border-amber-800 rounded-2xl bg-amber-950/20">Critical: Failed to synthesize engineering data. Please re-authenticate.</div>;

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-[1400px] mx-auto p-12 min-h-screen bg-transparent"
        >
            {/* HEADER SECTION - Left Align */}
            <div className="flex justify-between items-start mb-16">
                <div>
                    <h1 className="text-6xl font-extrabold tracking-tighter text-white mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                        Analytics
                    </h1>
                    <p className="text-lg text-zinc-500 max-w-lg leading-relaxed">
                        Comprehensive overview of your engineering performance, contribution consistency, and growth trajectory.
                    </p>
                </div>
            </div>
            

            {/* DASHBOARD GRID - Inspired by image_0.png */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr,320px] gap-10">

                {/* Column 1: Performance & Activity (Heatmap is central here) */}
                <div className="space-y-10">

                    {/* KEY METRICS & PERFORMANCE ROW */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* KEY METRICS ROW */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                            <MetricCard label="Total Submissions" value={stats.totalSubmissions} icon={FileText} success />
                            <MetricCard label="Problems Solved" value={stats.totalSolved} unit="Solved" />
                            <MetricCard label="Contest Rank" value={stats.totalContests > 0 ? `Avg #42` : 0} />
                            <MetricCard label="Success Rate" value={Math.round(performanceScore / 100)} unit="Score" />
                        </div>


                    </div>

                    {/* HEATMAP SECTION (Submission Activity) - The main focus */}
                    <div className="bg-[#111111] border border-zinc-800 rounded-2xl p-10 pt-8 pb-10 space-y-6">
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                            <div className="flex flex-col">
                                <h2 className="text-sm text-zinc-500 uppercase font-semibold tracking-widest mb-1">
                                    Submission Activity
                                </h2>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-zinc-700" />
                                    <span className="text-xs text-zinc-600 font-medium tracking-tight">Real-time compilation tracking</span>
                                </div>
                            </div>
                            <span className="text-xs font-mono tabular-nums text-zinc-600 px-3 py-1.5 bg-zinc-900 rounded-full border border-zinc-800/60">
                                {dateRangeDisplay}
                            </span>
                        </div>

                        {/* HEATMAP GRID - Centrally managed with fixed px, ensuring perfect alignment & full year view without scroll */}
                        <div className="relative pt-4 overflow-hidden">
                            <div ref={scrollContainerRef} className="pb-3 w-full"> {/* Parent wrapper for width constraints */}

                                {/* Fixed-width month label row, aligned by week */}
                                <div className="flex mb-3" style={{ paddingLeft: `${DOW_COLUMN_WIDTH_PX + DOW_WEEK_GAP_PX}px` }}>
                                    {weeks.map((_, i) => {
                                        const label = monthLabels.find((m) => m.index === i);
                                        return (
                                            <div
                                                key={i}
                                                style={{ width: `${WEEK_WIDTH_PX}px` }} // Use the fixed week width
                                                className={`text-[10px] font-mono text-zinc-700 text-center leading-none ${label ? 'font-medium' : ''}`}
                                            >
                                                {label?.label}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex" style={{ gap: `${DOW_WEEK_GAP_PX}px` }}>
                                    {/* Fixed-width DOW labels column, inspired by image_0.png */}
                                    <div className="flex flex-col gap-1.5" style={{ width: `${DOW_COLUMN_WIDTH_PX}px` }}>
                                        {[0, 2, 4].map((i) => (
                                            <div
                                                key={DOW_LABELS[i].abbrev}
                                                style={{ height: `${CELL_SIZE_PX}px` }}
                                                className="text-[10px] text-zinc-700 text-right leading-[14px] font-mono"
                                            >
                                                {DOW_LABELS[i].abbrev}
                                            </div>
                                        ))}
                                        {/* Placeholder to adjust spacing for missing DOW labels */}
                                        <div style={{ height: `${(CELL_SIZE_PX * 4) + (1.5 * 3)}px` }} />
                                    </div>

                                    {/* Fixed-width weeks grid */}
                                    <div className="flex gap-[5px]" style={{ width: `${WEEK_WIDTH_PX * weeks.length}px` }}>
                                        {weeks.map((week, wi) => (
                                            <div key={wi} className="flex flex-col gap-1.5" style={{ width: `${CELL_SIZE_PX}px` }}>
                                                {week.map((day) => {
                                                    const entry = activityMap[day.dateKey];
                                                    const cellLevel = day.isFuture ? null : getCellLevel(entry?.count);
                                                    const isHovered = hoveredDay === day.dateKey;
                                                    const isSelected = selectedDay === day.dateKey;

                                                    return (
                                                        <motion.div
                                                            key={day.dateKey}
                                                            layoutId={`cell-${day.dateKey}`}
                                                            whileHover={{ scale: 1.25, zIndex: 10 }}
                                                            onMouseEnter={() => !day.isFuture && setHoveredDay(day.dateKey)}
                                                            onMouseLeave={() => setHoveredDay(null)}
                                                            onClick={() => !day.isFuture && setSelectedDay(day.dateKey)}
                                                            style={{ width: `${CELL_SIZE_PX}px`, height: `${CELL_SIZE_PX}px` }}
                                                            className={`rounded cursor-pointer border transition-all duration-300
                              ${day.isFuture ? "bg-black border-zinc-900 opacity-20" : cellLevel?.bg + " " + cellLevel?.border}
                              ${isHovered ? "brightness-125 z-1 relative ring-1 ring-cyan-500/50" : ""}
                              ${isSelected ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-black z-2 relative scale-110 shadow-lg shadow-cyan-900/40" : ""}
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
                        <div className="flex justify-between items-end gap-12 pt-4 border-t border-zinc-900 mt-2">
                            <div className="flex-1 text-xs leading-relaxed text-zinc-600">
                                <AnimatePresence mode="wait">
                                    {selectedDay ? (
                                        <motion.div
                                            key={`details-${selectedDay}`}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-4 space-y-2.5"
                                        >
                                            <h4 className="font-semibold text-white mb-2 pb-2 border-b border-zinc-800/60">
                                                Contribution Details for <span className="font-bold tabular-nums text-cyan-400">{new Date(selectedDay).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                                            </h4>
                                            <p className="text-zinc-400 flex justify-between gap-4">
                                                <span>Submissions Tracked:</span>
                                                <span className="font-medium text-white tabular-nums">{selectedActivity?.count || 0}</span>
                                            </p>
                                            <p className="text-zinc-400 flex justify-between gap-4">
                                                <span>Critical Bugs Fixed:</span>
                                                <span className="font-medium text-white tabular-nums">{selectedActivity?.contests || 0}</span>
                                            </p>
                                            <p className="text-zinc-400 flex justify-between gap-4">
                                                <span>Efficiency Ratio:</span>
                                                <span className="font-medium text-white tabular-nums">+{Math.round((selectedActivity?.solved || 0) * 1.5 + (selectedActivity?.contests || 0) * 3)}%</span>
                                            </p>
                                            <button onClick={() => setSelectedDay(null)} className="text-[10px] font-mono text-cyan-600 hover:text-cyan-400 transition-colors pt-1">
                                                Close details
                                            </button>
                                        </motion.div>
                                    ) : (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-1.5 h-full pt-2">
                                            <span className="text-sm font-semibold text-white tabular-nums">{totalSubmissionsYear} Total Contributions</span>
                                            <span>in the last year</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Redesigned Legend to match image_0.png */}
                            <div className="flex items-center gap-4 text-xs font-mono text-zinc-700 bg-zinc-950 p-3 rounded-full border border-zinc-800">
                                <span>Less</span>
                                <div className="flex gap-[3px]">
                                    {CELL_LEVELS.map((level) => (
                                        <div
                                            key={level.level}
                                            style={{ width: `10px`, height: `10px` }}
                                            className={`rounded ${level.bg} ${level.border} border`}
                                        />
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

