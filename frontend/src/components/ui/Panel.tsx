interface PanelProps {
  children: React.ReactNode;
  className?: string;
  mood?: "Calm" | "Stressed" | "Tired" | "Frustrated" | null;
}

const MOOD_GLOW_CLASS: Record<string, string> = {
  Stressed: "hover:border-accent-red/60 hover:shadow-[0_0_20px_rgba(255,43,60,0.2)]",
  Tired: "hover:border-amber-500/60 hover:shadow-[0_0_20px_rgba(255,176,32,0.2)]",
  Frustrated: "hover:border-purple-500/60 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]",
  Calm: "hover:border-accent-cyan/60 hover:shadow-[0_0_20px_rgba(43,232,255,0.2)]",
};

export function Panel({ children, className = "", mood }: PanelProps) {
  const moodGlow = mood && MOOD_GLOW_CLASS[mood] ? MOOD_GLOW_CLASS[mood] : "";
  return <div className={`glass-panel p-6 transition-all duration-300 ${moodGlow} ${className}`}>{children}</div>;
}
