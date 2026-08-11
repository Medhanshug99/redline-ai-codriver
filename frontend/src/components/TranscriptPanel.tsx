import type { ReactNode } from "react";
import { Flag } from "lucide-react";

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
    return <span key={i}>{word}</span>;
  });
}

interface Props {
  text: string;
}

export function TranscriptPanel({ text }: Props) {
  return (
    <div className="mt-2 p-4 bg-void/30 rounded-lg border border-white/5 min-h-[90px] flex flex-col justify-center gap-2">
      {text ? (
        <>
          <p className="text-base text-text-primary font-medium leading-relaxed">
            "{highlightKeywords(text)}"
          </p>
          <p className="text-xs text-text-muted font-mono mt-1 flex items-center gap-1">
            <Flag size={12} className="text-text-muted" /> Safety keywords
            highlighted in red
          </p>
        </>
      ) : (
        <p className="text-text-muted/50 font-mono text-sm italic">
          [ Awaiting transcription data ]
        </p>
      )}
    </div>
  );
}
