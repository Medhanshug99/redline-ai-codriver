import { motion, AnimatePresence } from "framer-motion";
import { type LucideIcon, Minus, AlertTriangle, BatteryMedium, AlertCircle } from "lucide-react";

type MoodType = "Calm" | "Stressed" | "Tired" | "Frustrated";

interface Props {
  mood: MoodType | null;
  confidence: number;
}

const moodConfig: Record<
  MoodType,
  {
    color: string;
    bg: string;
    border: string;
    Icon: LucideIcon;
    description: string;
  }
> = {
  Calm: {
    color: "var(--stress-calm)",
    bg: "rgba(43,232,255,0.08)",
    border: "rgba(43,232,255,0.3)",
    Icon: Minus,
    description: "Vocal tone is steady. Driver is composed.",
  },
  Stressed: {
    color: "var(--stress-stressed)",
    bg: "rgba(255,43,60,0.08)",
    border: "rgba(255,43,60,0.3)",
    Icon: AlertTriangle,
    description: "Elevated vocal stress detected. Monitor closely.",
  },
  Tired: {
    color: "var(--stress-tired)",
    bg: "rgba(255,176,32,0.08)",
    border: "rgba(255,176,32,0.3)",
    Icon: BatteryMedium,
    description: "Vocal pattern suggests fatigue. Consider pacing.",
  },
  Frustrated: {
    color: "var(--accent-red)",
    bg: "rgba(255,43,60,0.12)",
    border: "rgba(255,43,60,0.5)",
    Icon: AlertCircle,
    description:
      "Mixed vocal stress signals. Composite frustration indicator active.",
  },
};

export function MoodBadge({ mood, confidence }: Props) {
  if (!mood) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted/50 font-mono text-sm py-6">
        [ No signal ]
      </div>
    );
  }

  const cfg = moodConfig[mood];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mood}
        initial={{ scale: 0.9, opacity: 0, boxShadow: `0 0 24px ${cfg.color}` }}
        animate={{ scale: 1, opacity: 1, boxShadow: `0 0 0px ${cfg.color}` }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 22, boxShadow: { duration: 0.35 } }}
        className="p-4 rounded-xl border"
        style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
      >
        <div className="flex items-center gap-3 mb-2">
          <motion.span
            className="flex items-center justify-center"
            style={{ color: cfg.color }}
            animate={mood === "Stressed" ? { scale: [1, 1.2, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            <cfg.Icon size={28} />
          </motion.span>
          <div>
            <p
              className="text-2xl font-bold tracking-tight"
              style={{ color: cfg.color }}
            >
              {mood}
            </p>
            <p className="text-xs font-mono text-text-muted">
              {(confidence * 100).toFixed(1)}% confidence
            </p>
          </div>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          {cfg.description}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
