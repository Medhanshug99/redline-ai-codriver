import {
  ResponsiveContainer,
  AreaChart,
  Area,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface Props {
  data: { lap_time: number; sector1: number } | null;
}

export function LapTimeChart({ data }: Props) {
  if (!data) {
    return (
      <div className="h-40 w-full bg-void/50 rounded-lg border border-white/5 flex items-center justify-center text-xs text-text-muted font-mono">
        [ Waiting for telemetry ]
      </div>
    );
  }

  const chartData = [
    { lap: "L-4", time: data.lap_time + 1.2 },
    { lap: "L-3", time: data.lap_time + 0.5 },
    { lap: "L-2", time: data.lap_time + 0.2 },
    { lap: "L-1", time: data.lap_time - 0.1 },
    { lap: "NOW", time: data.lap_time },
  ];

  return (
    <div className="h-44 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ left: 4, right: 4 }}>
          <defs>
            <linearGradient id="lapGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
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
          />
          <Area
            type="monotone"
            dataKey="time"
            stroke="var(--accent-cyan)"
            strokeWidth={2.5}
            fill="url(#lapGradient)"
            dot={{ r: 4, fill: "var(--accent-cyan)", strokeWidth: 0 }}
            activeDot={{ r: 6, fill: "var(--text-primary)" }}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
