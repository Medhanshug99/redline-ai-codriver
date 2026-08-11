interface PanelProps {
  children: React.ReactNode;
  className?: string;
}

export function Panel({ children, className = "" }: PanelProps) {
  return <div className={`glass-panel p-6 ${className}`}>{children}</div>;
}
