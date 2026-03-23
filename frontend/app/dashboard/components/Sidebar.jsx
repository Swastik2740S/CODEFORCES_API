"use client";

import { LayoutGrid, Trophy, BarChart3, Users, Settings } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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

  // ✅ Fetch user + active handle
  useEffect(() => {
    Promise.all([
      apiFetch("/auth/me"),
      apiFetch("/codeforces/handles"),
    ]).then(([userData, handleData]) => {
      setUser(userData);
      setHandle(handleData?.active || null);
    });
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
      {/* ── DESKTOP ── */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-[#111111]/80 backdrop-blur-2xl border-r border-white/10 py-8 px-6">
        
        <div className="flex-1">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12 px-2 cursor-pointer" onClick={() => go("/dashboard")}>
            <div className="h-8 w-8 rounded-full bg-[#D85D3F]/20 border border-[#D85D3F]/30 flex items-center justify-center">
              <span className="text-[#D85D3F] font-bold font-mono text-sm">‹/›</span>
            </div>
            <span className="text-xl font-serif font-bold text-white">
              Tracker.
            </span>
          </div>

          {/* Nav */}
          <nav className="space-y-2">
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

        {/* Bottom */}
        <div className="space-y-6">
          <NavItem
            icon={Settings}
            label="Settings"
            path="/settings"
            active={pathname.startsWith("/settings")}
            onClick={() => go("/settings")}
          />

          {/* User */}
          <div className="flex items-center gap-3 pt-6 border-t border-white/10">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-xs text-white font-bold">
              {initials}
            </div>

            <div className="flex flex-col truncate">
              <p className="text-sm text-white truncate">
                {handle?.handle || user?.email || "Loading..."}
              </p>
              <p className="text-[11px] text-emerald-400 uppercase">
                {handle?.rank || "Unrated"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MOBILE ── */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#111111]/90 backdrop-blur border-t border-white/10 flex justify-around py-2">
        {[...navLinks, { icon: Settings, label: "Settings", path: "/settings" }]
          .map((item) => (
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

// ── Desktop Item ─────────────────────────────────────────
function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition
        ${active
          ? "bg-[#D85D3F]/10 text-[#D85D3F]"
          : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
        }`}
    >
      <Icon size={18} />
      <span className="text-sm">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 bg-[#D85D3F] rounded-full" />}
    </div>
  );
}

// ── Mobile Item ──────────────────────────────────────────
function MobileNavItem({ icon: Icon, label, active, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex flex-col items-center p-2 cursor-pointer
        ${active ? "text-[#D85D3F]" : "text-gray-500"}`}
    >
      <Icon size={20} />
      <span className="text-[10px]">{label}</span>
    </div>
  );
}