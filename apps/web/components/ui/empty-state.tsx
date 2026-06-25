interface EmptyStateProps {
  message: string;
  className?: string;
}

export function EmptyState({ message, className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 py-12 text-zinc-500 dark:border-zinc-700 ${className || ""}`}>
      <p>{message}</p>
    </div>
  );
}
