"use client";

import { LayoutGrid, Trophy, BarChart3, Users, Settings } from "lucide-react";

export default function Sidebar() {
  const navLinks = [
    { icon: LayoutGrid, label: "Dashboard", active: true },
    { icon: BarChart3, label: "Problems" },
    { icon: Trophy, label: "Contests" },
    { icon: Users, label: "Peers" },
  ];

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-[#111111]/80 backdrop-blur-2xl border-r border-white/10 py-8 px-6 z-40 transition-all duration-300">
        <div className="flex-1">
          {/* Logo Section */}
          <div className="flex items-center gap-3 mb-12 px-2">
            <div className="h-8 w-8 rounded-full bg-[#D85D3F]/20 border border-[#D85D3F]/30 flex items-center justify-center shadow-[0_0_15px_rgba(216,93,63,0.2)]">
              <span className="text-[#D85D3F] font-bold font-mono text-sm">‹/›</span>
            </div>
            <span className="text-xl font-serif font-bold text-white tracking-tight">
              Tracker.
            </span>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {navLinks.map((item) => (
              <NavItem key={item.label} {...item} />
            ))}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="space-y-6">
          <nav>
             <NavItem icon={Settings} label="Settings" />
          </nav>

          {/* User Profile Glass Card */}
          <div className="flex items-center gap-3 pt-6 border-t border-white/10">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-xs text-white font-serif italic shadow-inner">
               tf
            </div>
            <div className="flex flex-col truncate">
              <p className="text-sm font-medium text-white truncate">tourist_fan</p>
              <p className="text-[11px] font-medium text-emerald-500 uppercase tracking-wider truncate">
                Specialist
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#111111]/90 backdrop-blur-2xl border-t border-white/10 z-50 px-2 py-2 flex justify-around items-center pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
        {/* We map the main links plus Settings for mobile */}
        {[...navLinks, { icon: Settings, label: "Settings" }].map((item) => (
          <MobileNavItem key={item.label} {...item} />
        ))}
      </nav>
    </>
  );
}

// ── Desktop Navigation Item ──────────────────────────────────────────────
function NavItem({ icon: Icon, label, active }) {
  return (
    <div
      className={`group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-300
        ${
          active
            ? "bg-[#D85D3F]/10 text-[#D85D3F] border border-[#D85D3F]/20 shadow-[0_0_15px_rgba(216,93,63,0.05)]"
            : "text-gray-500 border border-transparent hover:text-gray-200 hover:bg-white/5 hover:border-white/10"
        }`}
    >
      <Icon 
        size={18} 
        className={`transition-colors duration-300 ${active ? "text-[#D85D3F]" : "text-gray-500 group-hover:text-gray-300"}`} 
      />
      <span className="text-sm font-medium">{label}</span>
      
      {/* Active Glowing Dot */}
      {active && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#D85D3F] shadow-[0_0_8px_rgba(216,93,63,0.8)]" />
      )}
    </div>
  );
}

// ── Mobile Navigation Item ───────────────────────────────────────────────
function MobileNavItem({ icon: Icon, label, active }) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 w-16 cursor-pointer
        ${active ? "text-[#D85D3F]" : "text-gray-500 hover:text-gray-300"}`}
    >
      <div className={`p-1.5 rounded-lg transition-all duration-300 ${
        active ? "bg-[#D85D3F]/10 border border-[#D85D3F]/20 shadow-[0_0_10px_rgba(216,93,63,0.1)]" : "border border-transparent"
      }`}>
        <Icon size={20} className={active ? "text-[#D85D3F]" : "text-gray-500"} />
      </div>
      <span className="text-[10px] mt-1 font-medium tracking-wide">{label}</span>
    </div>
  );
}