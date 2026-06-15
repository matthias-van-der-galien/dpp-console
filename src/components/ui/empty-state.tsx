import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {detail ? (
          <p className="mt-1 text-sm text-slate-500">{detail}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
