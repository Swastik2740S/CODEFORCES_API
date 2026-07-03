"use client";

import { LayoutGrid, Trophy, BarChart3, Users, Settings } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const API = "/api";

async function apiFetch(path) {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
  });
  if (!res.ok) return null;
  return res.json();
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState(null);
  const [handle, setHandle] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch user + active handle
  useEffect(() => {
    Promise.all([
      apiFetch("/auth/me"),
      apiFetch("/codeforces/handles"),
    ])
      .then(([userData, handleData]) => {
        setUser(userData);
        setHandle(handleData?.active || null);
      })
      .finally(() => setLoading(false));
  }, []);

  const navLinks = [
    { icon: LayoutGrid, label: "Dashboard", path: "/dashboard" },
    { icon: BarChart3, label: "Problems", path: "/problems" },
    { icon: Trophy, label: "Contests", path: "/contests" },
    { icon: Users, label: "Peers", path: "/peers" },
  ];

  const go = (path) => router.push(path);

  const initials = user?.email?.[0]?.toUpperCase() || "U";

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-[#111111]/80 backdrop-blur-2xl border-r border-white/10 py-8 px-5 z-40 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        
        <div className="flex-1">
          {/* Logo */}
          <div 
            className="flex items-center gap-3 mb-12 px-3 cursor-pointer group" 
            onClick={() => go("/dashboard")}
          >
            <div className="h-9 w-9 rounded-xl bg-[#D85D3F]/10 border border-[#D85D3F]/30 flex items-center justify-center shadow-inner group-hover:bg-[#D85D3F]/20 transition-colors">
              <span className="text-[#D85D3F] font-bold font-mono text-sm">‹/›</span>
            </div>
            <span className="text-2xl font-serif font-bold text-white tracking-tight group-hover:text-gray-200 transition-colors">
              Tracker.
            </span>
          </div>

          {/* Nav */}
          <nav className="space-y-1.5 px-1">
            {navLinks.map((item) => (
              <NavItem
                key={item.label}
                {...item}
                active={pathname.startsWith(item.path)}
                onClick={() => go(item.path)}
              />
            ))}
          </nav>
        </div>

        {/* Bottom Area */}
        <div className="space-y-4 px-1">
          <NavItem
            icon={Settings}
            label="Settings"
            path="/settings"
            active={pathname.startsWith("/settings")}
            onClick={() => go("/settings")}
          />

          {/* User Profile Glass Card */}
          <div className="mt-4 p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3 hover:bg-white/[0.05] transition-colors cursor-default shadow-sm">
            {loading ? (
              <div className="h-10 w-10 rounded-full bg-white/10 animate-pulse shrink-0" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#D85D3F]/40 to-transparent border border-[#D85D3F]/20 flex items-center justify-center text-sm text-white font-bold shrink-0 shadow-inner">
                {initials}
              </div>
            )}

            <div className="flex flex-col truncate min-w-0">
              {loading ? (
                <>
                  <div className="h-3 w-20 bg-white/10 rounded animate-pulse mb-1.5" />
                  <div className="h-2 w-12 bg-white/5 rounded animate-pulse" />
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-white truncate">
                    {handle?.handle || user?.email || "No handle"}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase truncate">
                    {handle?.rank || "Unrated"}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* ── MOBILE FLOATING DOCK ── */}
      {/* Replaced rigid bottom-0 with a floating pill design + extreme z-index to fix click issues */}
      <nav className="md:hidden fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-[#1A1A1A]/90 backdrop-blur-2xl border border-white/10 flex justify-between p-1.5 rounded-2xl z-[100] shadow-[0_8px_32px_rgba(0,0,0,0.8)] pb-safe">
        {[...navLinks, { icon: Settings, label: "Settings", path: "/settings" }].map((item) => (
          <MobileNavItem
            key={item.label}
            {...item}
            active={pathname.startsWith(item.path)}
            onClick={() => go(item.path)}
          />
        ))}
      </nav>
    </>
  );
}

// ── Desktop Nav Item with Framer Motion ──────────────────────────────────
function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors duration-300 group ${
        active ? "text-white" : "text-gray-500 hover:text-gray-200"
      }`}
    >
      {/* Gliding Active Background */}
      {active && (
        <motion.div
          layoutId="desktop-active-nav"
          className="absolute inset-0 bg-[#D85D3F]/10 border border-[#D85D3F]/20 rounded-xl"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      
      <Icon 
        size={20} 
        className={`relative z-10 transition-colors duration-300 ${active ? "text-[#D85D3F]" : "group-hover:text-gray-300"}`} 
      />
      <span className="relative z-10 text-sm font-medium">{label}</span>
      
      {/* Glowing active dot */}
      {active && (
        <div className="relative z-10 ml-auto w-1.5 h-1.5 bg-[#D85D3F] rounded-full shadow-[0_0_8px_rgba(216,93,63,0.8)]" />
      )}
    </div>
  );
}

// ── Mobile Nav Item with Framer Motion ───────────────────────────────────
function MobileNavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center justify-center w-14 h-14 rounded-xl z-10 touch-manipulation focus:outline-none"
    >
      {/* Gliding Active Background */}
      {active && (
        <motion.div
          layoutId="mobile-active-nav"
          className="absolute inset-0 bg-[#D85D3F]/15 border border-[#D85D3F]/30 rounded-xl shadow-[0_0_15px_rgba(216,93,63,0.1)]"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      
      <Icon 
        size={20} 
        className={`relative z-10 transition-colors duration-300 ${active ? "text-[#D85D3F]" : "text-gray-500"}`} 
      />
      <span 
        className={`relative z-10 text-[9px] mt-1 font-medium tracking-wide transition-colors duration-300 ${
          active ? "text-white" : "text-gray-500"
        }`}
      >
        {label}
      </span>
    </button>
  );
}