import { LayoutGrid, Trophy, BarChart3, Users, Settings } from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-[#0f0f10] border-r border-white/5 h-screen px-4 py-6 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center">
          <span className="text-black font-bold">‹›</span>
        </div>
        <span className="text-white font-semibold">Tracker.</span>
      </div>

      {/* Nav */}
      <nav className="space-y-1 text-sm">
        <NavItem icon={LayoutGrid} label="Dashboard" active />
        <NavItem icon={BarChart3} label="Problems" />
        <NavItem icon={Trophy} label="Contests" />
        <NavItem icon={Users} label="Peers" />
      </nav>

      {/* Bottom */}
      <div className="mt-auto">
        <NavItem icon={Settings} label="Settings" />
        <div className="mt-6 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-white/10" />
          <div>
            <p className="text-sm text-white">tourist_fan</p>
            <p className="text-xs text-orange-400">Specialist</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ icon: Icon, label, active }) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition
        ${
          active
            ? "bg-white/5 text-white"
            : "text-white/60 hover:text-white hover:bg-white/5"
        }`}
    >
      <Icon size={16} />
      {label}
    </div>
  );
}
