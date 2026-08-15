import type { ReactNode } from "react";
import { Flag, Wrench } from "lucide-react";

const SAFETY_KEYWORDS = [
  "brake",
  "brakes",
  "tyre",
  "tyres",
  "tire",
  "tires",
  "smoke",
  "pain",
  "vision",
  "fire",
  "lose",
  "losing",
  "wall",
  "crash",
  "damage",
  "gravel",
  "vibrat",
];

function highlightKeywords(text: string): ReactNode[] {
  if (!text) return [];
  const words = text.split(/(\s+)/);
  return words.map((word, i) => {
    const clean = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
    if (SAFETY_KEYWORDS.includes(clean)) {
      return (
        <mark
          key={i}
          className="px-1 rounded text-accent-red font-bold bg-accent-red/15 border border-accent-red/30 mx-0.5"
          title="Safety keyword flagged"
        >
          {word}
        </mark>
      );
    }
    return word;
  });
}

interface Props {
  text: string;
  recommendedAction?: string | null;
}

export function TranscriptPanel({ text, recommendedAction }: Props) {
  return (
    <div className="mt-2 p-4 bg-void/30 rounded-lg border border-white/5 min-h-[90px] flex flex-col justify-center gap-2">
      {text ? (
        <>
          <p className="text-base text-text-primary font-medium leading-relaxed">
            "{highlightKeywords(text)}"
          </p>
          <div className="flex items-center justify-between flex-wrap gap-2 mt-1">
            <p className="text-xs text-text-muted font-mono flex items-center gap-1">
              <Flag size={12} className="text-text-muted" /> Safety keywords
              highlighted in red
            </p>
            {recommendedAction && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-xs font-semibold shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                <Wrench size={13} className="text-amber-400" />
                ACTION: {recommendedAction}
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="text-text-muted/50 font-mono text-sm italic">
          [ Awaiting transcription data ]
        </p>
      )}
    </div>
  );
}
