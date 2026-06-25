interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}

export default function Badge({ children, variant = "default" }: BadgeProps) {
  const classes = {
    default: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
    success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
    danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes[variant]}`}
    >
      {children}
    </span>
  );
}
