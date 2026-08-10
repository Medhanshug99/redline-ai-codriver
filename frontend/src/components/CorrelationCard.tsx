import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  stressScores: number[];
  lapTimes: number[];
}

function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my);
    dx2 += (x[i] - mx) ** 2;
    dy2 += (y[i] - my) ** 2;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}

export function CorrelationCard({ stressScores, lapTimes }: Props) {
  const r = pearson(stressScores, lapTimes);
  const pct = Math.abs(r * 100).toFixed(0);

  const interpretation =
    r > 0.5 ? 'Higher stress → slower lap times. Driver performance impacted.'
    : r < -0.5 ? 'Inverse pattern detected. Driver performs under pressure.'
    : 'Weak correlation. More data needed for insight.';

  const color = r > 0.4 ? 'var(--stress-stressed)' : r < -0.4 ? 'var(--stress-calm)' : 'var(--text-muted)';
  const Icon = r > 0.2 ? TrendingUp : r < -0.2 ? TrendingDown : Minus;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2" style={{ color }}>
          <Icon size={28} />
          <span className="text-4xl font-bold font-mono">{r.toFixed(2)}</span>
        </div>
        <div>
          <p className="text-xs font-mono text-text-muted uppercase tracking-wider">Pearson r</p>
          <p className="text-xs font-mono text-text-muted">{pct}% correlation strength</p>
        </div>
      </div>
      <p className="text-xs text-text-muted leading-relaxed border-t border-white/5 pt-2">
        {stressScores.length < 2 ? 'Analyze 2+ clips to compute correlation.' : interpretation}
      </p>
    </div>
  );
}
