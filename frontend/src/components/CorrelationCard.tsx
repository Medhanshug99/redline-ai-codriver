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

  // Sparkline data: pair stress scores with lap times
  const n = Math.min(stressScores.length, lapTimes.length);
  const sparkData = Array.from({ length: n }, (_, i) => ({
    stress: stressScores[i],
    lap: lapTimes[i],
  }));

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
            {pct}% correlation strength
          </p>
          {/* Inline sparkline */}
          {n >= 2 && (
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
          )}
        </div>
      </div>
      <p className="text-xs text-text-muted leading-relaxed border-t border-white/5 pt-2">
        {stressScores.length < 2
          ? "Analyze 2+ clips to compute correlation."
          : interpretation}
      </p>
    </div>
  );
}
