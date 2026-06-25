import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  message?: string;
}

export default function EmptyState({ icon: Icon, title, description, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-black/[.12] p-12 text-center dark:border-white/[.12]">
      {Icon && <Icon className="h-10 w-10 text-zinc-400" aria-hidden="true" />}
      <div className="flex flex-col gap-1">
        {(title || message) && (
          <p className="font-medium text-zinc-900 dark:text-zinc-100">{title || message}</p>
        )}
        {description && <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
      </div>
    </div>
  );
}

export { EmptyState };
