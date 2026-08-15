import { useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface Props {
  stressScores: number[];
  lapTimes: number[];
}

function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0,
    dx2 = 0,
    dy2 = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my);
    dx2 += (x[i] - mx) ** 2;
    dy2 += (y[i] - my) ** 2;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}

// Animated number counter hook
function useAnimatedValue(target: number, duration = 600) {
  const displayRef = useRef<HTMLSpanElement>(null);
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const end = target;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;

      if (displayRef.current) {
        displayRef.current.textContent = current.toFixed(2);
      }

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        prevRef.current = end;
      }
    };

    requestAnimationFrame(tick);
  }, [target, duration]);

  return displayRef;
}

export function CorrelationCard({ stressScores, lapTimes }: Props) {
  const n = Math.min(stressScores.length, lapTimes.length);
  const REQUIRED_SAMPLES = 5;

  const r = pearson(stressScores, lapTimes);
  const pct = Math.abs(r * 100).toFixed(0);
  const rRef = useAnimatedValue(r, 600);

  const interpretation =
    r > 0.5
      ? "Higher stress → slower lap times. Driver performance impacted."
      : r < -0.5
        ? "Inverse pattern detected. Driver performs under pressure."
        : "Weak correlation. More data needed for insight.";

  const color =
    r > 0.4
      ? "var(--stress-stressed)"
      : r < -0.4
        ? "var(--stress-calm)"
        : "var(--text-muted)";
  const Icon = r > 0.2 ? TrendingUp : r < -0.2 ? TrendingDown : Minus;

  const sparkData = Array.from({ length: n }, (_, i) => ({
    stress: stressScores[i],
    lap: lapTimes[i],
  }));

  const sessionTrendline =
    n >= REQUIRED_SAMPLES
      ? r > 0.4
        ? `Session Trend (${n} clips): Stress rising — correlates with lap time degradation (+${r.toFixed(2)} r)`
        : r < -0.4
          ? `Session Trend (${n} clips): Inverse stress-pace pattern — lap times improving under pressure (${r.toFixed(2)} r)`
          : `Session Trend (${n} clips): Stress stable — weak pace correlation (${r.toFixed(2)} r)`
      : null;

  if (n < REQUIRED_SAMPLES) {
    const needed = REQUIRED_SAMPLES - n;
    return (
      <div className="flex flex-col gap-3 font-mono">
        <div className="p-4 rounded-lg bg-void/40 border border-white/5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="uppercase tracking-wider">Sample Gate</span>
            <span className="text-accent-cyan">{n} / {REQUIRED_SAMPLES} transmissions</span>
          </div>
          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-accent-cyan h-full transition-all duration-300"
              style={{ width: `${(n / REQUIRED_SAMPLES) * 100}%` }}
            />
          </div>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            Insufficient data — <span className="text-text-primary font-bold">{needed} more clip{needed > 1 ? 's' : ''}</span> needed for statistically reliable Pearson r &amp; projected risk analysis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-4">
        <div className="flex items-center gap-2" style={{ color }}>
          <Icon size={28} />
          <span ref={rRef} className="text-4xl font-bold font-mono">
            {r.toFixed(2)}
          </span>
        </div>
        <div className="flex-1">
          <p className="text-xs font-mono text-text-muted uppercase tracking-wider">
            Pearson r
          </p>
          <p className="text-xs font-mono text-text-muted">
            {pct}% correlation strength ({n} samples)
          </p>
          {/* Inline sparkline */}
          <div className="mt-2 h-10 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-void)",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    fontSize: 10,
                  }}
                  itemStyle={{ color: "var(--accent-cyan)", fontFamily: "JetBrains Mono" }}
                  labelStyle={{ display: "none" }}
                  formatter={(val, name) => [
                    typeof val === 'number' ? val.toFixed(2) : String(val),
                    name === 'stress' ? 'Stress' : 'Lap'
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="stress"
                  stroke="var(--stress-stressed)"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={600}
                />
                <Line
                  type="monotone"
                  dataKey="lap"
                  stroke="var(--accent-cyan)"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={600}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <p className="text-xs text-text-muted leading-relaxed border-t border-white/5 pt-2">
        {interpretation}
      </p>
      {sessionTrendline && (
        <div className="p-2 rounded bg-white/5 border border-white/10 text-xs font-mono text-accent-cyan flex items-center gap-1.5">
          <TrendingUp size={13} className="text-accent-cyan shrink-0" />
          <span>{sessionTrendline}</span>
        </div>
      )}

      {/* Feature 1: Predicted Lap-Time Risk projection insight (only shown at 5+ clips) */}
      {(() => {
        const windowSize = Math.min(n, 4);
        const recentStress = stressScores.slice(-windowSize);
        const stressDelta = recentStress[recentStress.length - 1] - recentStress[0];
        
        const projectedCost = stressDelta > 0 ? (stressDelta * 0.65).toFixed(2) : "0.00";
        const isRising = stressDelta > 0.05;

        return (
          <div className={`p-2.5 rounded-lg border font-mono text-xs flex items-center justify-between ${
            isRising
              ? "bg-accent-red/10 border-accent-red/30 text-accent-red"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          }`}>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-wider uppercase text-[10px] px-1.5 py-0.5 rounded bg-black/40">
                {isRising ? "Risk Read" : "Pace Steady"}
              </span>
              <span className="text-[11px]">
                {isRising
                  ? `Stress rising (+${(stressDelta * 100).toFixed(0)}%) over last ${windowSize} transmissions`
                  : `Driver acoustic stress stable over last ${windowSize} transmissions`}
              </span>
            </div>
            <span className="font-bold text-sm tabular-nums">
              {isRising ? `+${projectedCost}s projected next lap` : "±0.0s projected"}
            </span>
          </div>
        );
      })()}
    </div>
  );
}
