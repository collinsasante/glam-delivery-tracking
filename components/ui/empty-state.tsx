import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      {icon && (
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-4 text-gray-400">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {description && (
        <p className="text-xs text-gray-400 mt-1 max-w-[220px]">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
