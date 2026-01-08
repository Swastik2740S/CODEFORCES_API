import { LayoutGrid, Trophy, BarChart3, Users, Settings } from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-[#09090b] border-r border-zinc-900 h-screen flex flex-col justify-between py-8 px-6">
      <div>
        {/* Logo Section */}
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            <span className="text-[#09090b] font-bold font-mono text-sm">‹/›</span>
          </div>
          <span className="text-xl font-serif font-bold text-white tracking-tight">
            Tracker.
          </span>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          <NavItem icon={LayoutGrid} label="Dashboard" active />
          <NavItem icon={BarChart3} label="Problems" />
          <NavItem icon={Trophy} label="Contests" />
          <NavItem icon={Users} label="Peers" />
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="space-y-6">
        <nav>
           <NavItem icon={Settings} label="Settings" />
        </nav>

        {/* User Profile "Card" */}
        <div className="flex items-center gap-3 pt-6 border-t border-zinc-900">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-zinc-700 flex items-center justify-center text-xs text-white font-serif italic">
             tf
          </div>
          <div className="flex flex-col">
            <p className="text-sm font-medium text-zinc-200">tourist_fan</p>
            <p className="text-[11px] font-medium text-emerald-500 uppercase tracking-wider">
              Specialist
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ icon: Icon, label, active }) {
  return (
    <div
      className={`group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-300
        ${
          active
            ? "bg-[#18181b] text-white"
            : "text-zinc-500 hover:text-zinc-200 hover:bg-[#18181b]/50"
        }`}
    >
      <Icon 
        size={18} 
        className={`transition-colors duration-300 ${active ? "text-white" : "text-zinc-600 group-hover:text-zinc-300"}`} 
      />
      <span className="text-sm font-medium">{label}</span>
      
      {/* Active Indicator Dot (Optional detail) */}
      {active && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
      )}
    </div>
  );
}