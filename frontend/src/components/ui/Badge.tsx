import { motion } from 'framer-motion';

interface BadgeProps {
  label: string;
  variant?: 'Calm' | 'Stressed' | 'Tired' | 'Frustrated';
  pulse?: boolean;
}

export function Badge({ label, variant = 'Calm', pulse = false }: BadgeProps) {
  const colorMap: Record<string, string> = {
    Calm: 'bg-stress-calm/20 text-stress-calm border-stress-calm/30',
    Stressed: 'bg-stress-stressed/20 text-stress-stressed border-stress-stressed/30',
    Tired: 'bg-stress-tired/20 text-stress-tired border-stress-tired/30',
    Frustrated: 'bg-accent-red/20 text-accent-red border-accent-red/30',
  };

  const styleClass = colorMap[variant] ?? colorMap['Calm'];

  return (
    <motion.span
      animate={pulse && variant === 'Stressed' ? { opacity: [1, 0.6, 1], scale: [1, 1.05, 1] } : {}}
      transition={{ repeat: Infinity, duration: 1.5 }}
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold font-mono border ${styleClass}`}
    >
      {label}
    </motion.span>
  );
}
