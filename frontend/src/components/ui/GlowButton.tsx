interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function GlowButton({ children, className = '', ...props }: GlowButtonProps) {
  return (
    <button
      className={`relative inline-flex items-center justify-center px-6 py-3 font-semibold text-white transition-all duration-300 bg-void rounded-xl border border-[rgba(255,255,255,0.1)] hover:border-accent-red hover:shadow-[0_0_15px_var(--border-glow)] overflow-hidden group ${className}`}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-accent-red/0 via-accent-red/10 to-accent-red/0 transform -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
    </button>
  );
}
