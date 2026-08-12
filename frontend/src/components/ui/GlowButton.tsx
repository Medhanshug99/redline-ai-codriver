import { motion } from "framer-motion";

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function GlowButton({
  children,
  className = "",
  disabled,
  ...props
}: GlowButtonProps) {
  return (
    <motion.button
      className={`relative inline-flex items-center justify-center px-6 py-3 font-semibold text-white transition-colors duration-200 bg-void rounded-xl border border-[rgba(255,255,255,0.1)] hover:border-accent-red hover:shadow-[0_0_15px_var(--border-glow)] overflow-hidden group ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      disabled={disabled}
      {...(props as object)}
    >
      <span className="relative z-10">{children}</span>
      <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-accent-red/0 via-accent-red/10 to-accent-red/0 transform -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
    </motion.button>
  );
}
