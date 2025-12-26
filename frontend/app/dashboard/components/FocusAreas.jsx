import useFocusAreas from "../hooks/useFocusAreas";

export default function FocusAreas() {
  const { data, loading } = useFocusAreas();

  if (loading) {
    return (
      <div className="text-white/40 text-sm">
        Analyzing solved problems…
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-white/40 text-sm">
        No data yet
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-white mb-4">
        Focus Areas
      </h3>

      <div className="space-y-4">
        {data.map((area) => (
          <div key={area.label}>
            <div className="flex justify-between text-xs text-white/70 mb-1">
              <span className="capitalize">{area.label}</span>
              <span>{area.value}%</span>
            </div>

            <div className="w-full h-1.5 bg-white/10 rounded-full">
              <div
                className="h-full bg-white rounded-full"
                style={{ width: `${area.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
