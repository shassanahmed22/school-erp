import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title = "No data found",
  description = "There's nothing to show here yet.",
  icon,
  action,
  className,
}: {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16 text-center", className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        {icon ?? <Inbox className="h-6 w-6 text-muted-foreground" />}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
