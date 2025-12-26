export default function StatCard({ label, value, sub }) {
  return (
    <div className="bg-[#141416] border border-white/5 rounded-xl p-4">
      <p className="text-xs text-white/40">{label}</p>
      <p className="text-2xl font-semibold text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-green-400 mt-1">{sub}</p>}
    </div>
  );
}
