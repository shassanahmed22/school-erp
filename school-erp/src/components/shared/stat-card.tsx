import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon,
  colorClass = "bg-blue-600",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass?: string;
}) {
  return (
    <Card className={cn("text-white border-0", colorClass)}>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-sm opacity-90">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <div className="h-11 w-11 rounded-lg bg-white/20 flex items-center justify-center">{icon}</div>
      </CardContent>
    </Card>
  );
}
