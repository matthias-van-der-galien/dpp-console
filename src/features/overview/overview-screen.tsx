"use client";

import { Activity, Database, ServerCog, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/status";
import { PageHeading } from "@/features/common/page-heading";
import { QueryPanel, useDppQuery } from "@/features/common/query-panel";
import { formatPercent } from "@/lib/utils/format";

function metric(data: unknown, path: string[], fallback: unknown = 0) {
  let current: unknown = data;
  for (const segment of path) {
    if (!current || typeof current !== "object") return fallback;
    current = (current as Record<string, unknown>)[segment];
  }
  return current ?? fallback;
}

export function OverviewScreen() {
  const overview = useDppQuery<Record<string, unknown>>(
    ["reports", "overview"],
    "/reports/overview",
  );
  const ready = useDppQuery<Record<string, unknown>>(["ready"], "/ready");
  const queue = useDppQuery<Record<string, unknown>>(
    ["queue", "health"],
    "/queue/health",
  );

  return (
    <>
      <PageHeading
        title="Workspace Overview"
        description="Readiness, queue state and backend health in one operational view."
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3">
            <Activity className="size-5 text-teal-700" />
            <div>
              <div className="text-xs text-slate-500">Average readiness</div>
              <div className="text-lg font-semibold">
                {formatPercent(metric(overview.data, ["readiness", "average"]))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <Database className="size-5 text-teal-700" />
            <div>
              <div className="text-xs text-slate-500">Products</div>
              <div className="text-lg font-semibold">
                {String(metric(overview.data, ["counts", "products"]))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-teal-700" />
            <div>
              <div className="text-xs text-slate-500">Quality issues</div>
              <div className="text-lg font-semibold">
                {String(metric(overview.data, ["quality", "invalid"]))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <ServerCog className="size-5 text-teal-700" />
            <div>
              <div className="text-xs text-slate-500">Queue</div>
              <div className="text-lg font-semibold">
                {String(metric(queue.data, ["status"], "unknown"))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <QueryPanel title="Backend readiness" query={ready}>
          {(data) => (
            <div className="space-y-3">
              <Badge
                value={data.status ?? "unknown"}
                tone={statusTone(data.status)}
              />
              <pre className="max-h-80 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
                {JSON.stringify(data.checks ?? data, null, 2)}
              </pre>
            </div>
          )}
        </QueryPanel>
        <QueryPanel title="Queue health" query={queue}>
          {(data) => (
            <pre className="max-h-80 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </QueryPanel>
        <Card>
          <CardHeader>
            <CardTitle>Operator workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>
              Create evidence requests, generate supplier upload links, review
              extracted candidates, then publish readiness outputs.
            </p>
            <p>
              Admin surfaces for users, API keys, queue jobs, notifications,
              events and webhooks are available from the sidebar.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
