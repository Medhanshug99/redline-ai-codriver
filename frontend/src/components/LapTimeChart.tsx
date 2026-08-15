import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

interface Props {
  data: { lap: number; lap_time: number; sector1: number; sector2?: number; sector3?: number } | null;
}

export function LapTimeChart({ data }: Props) {
  if (!data) {
    return (
      <div className="h-40 w-full bg-void/50 rounded-lg border border-white/5 flex items-center justify-center text-xs text-text-muted font-mono">
        [ Waiting for telemetry ]
      </div>
    );
  }

  /**
   * Sector breakdown chart.
   *
   * Each bar represents one sector split from the lap_data returned by
   * the backend. sector2 and sector3 fall back to an even 1/3 split of
   * the remaining time when not provided (because the mock dataset only
   * guarantees sector1). This is deliberate and disclosed — the telemetry
   * data is sourced from sample_laps.json (mock, not live timing).
   */
  const s1 = data.sector1;
  const remaining = data.lap_time - s1;
  const s2 = data.sector2 ?? remaining / 2;
  const s3 = data.sector3 ?? remaining - s2;

  const chartData = [
    { sector: "S1", time: parseFloat(s1.toFixed(3)) },
    { sector: "S2", time: parseFloat(s2.toFixed(3)) },
    { sector: "S3", time: parseFloat(s3.toFixed(3)) },
  ];

  const sectorColors = [
    "var(--stress-calm)",
    "var(--stress-tired)",
    "var(--accent-red)",
  ];

  return (
    <div className="h-44 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ left: 4, right: 4 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="sector"
            stroke="rgba(255,255,255,0.2)"
            fontSize={10}
            tickLine={false}
          />
          <YAxis
            domain={["auto", "auto"]}
            stroke="rgba(255,255,255,0.2)"
            fontSize={10}
            tickFormatter={(val: number) => `${val.toFixed(1)}s`}
            width={44}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--bg-void)",
              borderColor: "rgba(255,255,255,0.1)",
              borderRadius: "8px",
            }}
            itemStyle={{
              color: "var(--accent-cyan)",
              fontFamily: "JetBrains Mono",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--text-muted)", fontSize: 11 }}
            formatter={(val: unknown) => [`${Number(val).toFixed(3)}s`, "Time"]}
          />
          <Bar
            dataKey="time"
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {chartData.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={sectorColors[index]} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
