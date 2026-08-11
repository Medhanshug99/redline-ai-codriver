import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "./ui/Badge";

interface LogEntry {
  id: string;
  transcript: string;
  mood: "Calm" | "Stressed" | "Tired" | "Frustrated";
  confidence: number;
  timestamp: number;
}

interface Props {
  entries: LogEntry[];
}

export function RadioLog({ entries }: Props) {
  if (!entries.length) {
    return (
      <div className="text-text-muted/50 font-mono text-sm italic p-2">
        No radio messages yet. Upload a clip to begin.
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(255,255,255,0.1) transparent",
      }}
    >
      <AnimatePresence>
        {[...entries].reverse().map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            className="p-3 rounded-lg border border-white/5 bg-void/30 flex flex-col gap-1"
          >
            <div className="flex items-center justify-between">
              <Badge label={entry.mood} variant={entry.mood} />
              <span className="text-xs font-mono text-text-muted">
                {new Date(entry.timestamp * 1000).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm text-text-primary leading-relaxed line-clamp-2">
              "{entry.transcript}"
            </p>
            <p className="text-xs text-text-muted font-mono">
              {(entry.confidence * 100).toFixed(1)}% confidence
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
