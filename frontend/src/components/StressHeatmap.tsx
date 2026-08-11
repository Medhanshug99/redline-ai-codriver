import { motion } from "framer-motion";

type MoodType = "Calm" | "Stressed" | "Tired" | "Frustrated";

interface HeatmapEntry {
  mood: MoodType;
  time: string;
  confidence: number;
}

interface Props {
  entries: HeatmapEntry[];
}

const moodColor: Record<MoodType, string> = {
  Calm: "var(--stress-calm)",
  Stressed: "var(--stress-stressed)",
  Tired: "var(--stress-tired)",
  Frustrated: "var(--accent-red)",
};

export function StressHeatmap({ entries }: Props) {
  if (!entries.length) {
    return (
      <div className="h-12 rounded-lg bg-void/30 border border-white/5 flex items-center justify-center text-xs text-text-muted font-mono">
        [ Heatmap builds as you analyze clips ]
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-10 rounded-lg overflow-hidden gap-0.5">
        {entries.map((entry, i) => (
          <motion.div
            key={i}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: i * 0.05 }}
            className="flex-1 rounded-sm group relative cursor-pointer"
            style={{
              backgroundColor: moodColor[entry.mood],
              opacity: 0.4 + entry.confidence * 0.6,
            }}
          >
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-20">
              <div className="bg-void text-text-primary text-xs font-mono px-2 py-1 rounded border border-white/10 whitespace-nowrap">
                {entry.time} · {entry.mood}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="flex justify-between text-xs font-mono text-text-muted">
        <span>← Earlier</span>
        <span>Latest →</span>
      </div>
    </div>
  );
}
