"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorNote } from "@/components/ui/error-note";
import { TCell, TH, THead, Table } from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { formatDateTime, toArray } from "@/lib/utils/format";
import { PageHeading } from "@/features/common/page-heading";

export function EventsScreen() {
  const events = useQuery({
    queryKey: ["events"],
    queryFn: () => apiFetch<unknown>("/events"),
  });
  const types = useQuery({
    queryKey: ["event-types"],
    queryFn: () => apiFetch<unknown>("/event-types"),
  });
  const replay = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/events/${id}/replay`, {
        method: "POST",
        body: { reason: "Console replay" },
      }),
  });

  return (
    <>
      <PageHeading
        title="Domain Events"
        description="Read sanitized workspace events and manually replay them to active webhook subscriptions."
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
          </CardHeader>
          <CardContent>
            {events.isError ? <ErrorNote error={events.error} /> : null}
            {replay.isError ? <ErrorNote error={replay.error} /> : null}
            <Table>
              <THead>
                <tr>
                  <TH>Type</TH>
                  <TH>Entity</TH>
                  <TH>Occurred</TH>
                  <TH>Replay</TH>
                </tr>
              </THead>
              <tbody>
                {toArray<Record<string, unknown>>(events.data).map((row) => (
                  <tr key={String(row.id)}>
                    <TCell>{String(row.type ?? "")}</TCell>
                    <TCell>
                      {String(row.entityType ?? "")}{" "}
                      {String(row.entityId ?? "")}
                    </TCell>
                    <TCell>
                      {formatDateTime(row.occurredAt ?? row.createdAt)}
                    </TCell>
                    <TCell>
                      <Button
                        variant="secondary"
                        onClick={() => replay.mutate(String(row.id))}
                      >
                        Replay
                      </Button>
                    </TCell>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Event contracts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {types.isError ? <ErrorNote error={types.error} /> : null}
            {toArray<Record<string, unknown>>(types.data).map((row) => (
              <a
                key={String(row.type)}
                className="block rounded-md border border-slate-200 p-2 text-sm hover:bg-slate-50"
                href={`/event-types/${String(row.type)}/schema.json`}
              >
                <span className="font-medium text-slate-900">
                  {String(row.type)}
                </span>
                <span className="ml-2 text-xs text-slate-500">
                  v{String(row.payloadVersion ?? 1)}
                </span>
              </a>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
