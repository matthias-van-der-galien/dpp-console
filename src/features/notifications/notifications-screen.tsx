"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorNote } from "@/components/ui/error-note";
import { Badge, statusTone } from "@/components/ui/status";
import { TCell, TH, THead, Table } from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { formatDateTime, toArray } from "@/lib/utils/format";
import { PageHeading } from "@/features/common/page-heading";

export function NotificationsScreen() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["notification-events"],
    queryFn: () => apiFetch<unknown>("/notification-events?status=all"),
  });
  const dispatch = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/notification-events/${id}/dispatch`, {
        method: "POST",
        body: {},
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notification-events"] }),
  });
  const cancel = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/notification-events/${id}/cancel`, {
        method: "POST",
        body: {},
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notification-events"] }),
  });

  return (
    <>
      <PageHeading
        title="Notifications"
        description="Inspect deliverable notification outbox events and manually dispatch or cancel them."
      />
      <Card>
        <CardHeader>
          <CardTitle>Notification events</CardTitle>
        </CardHeader>
        <CardContent>
          {query.isError ? <ErrorNote error={query.error} /> : null}
          <Table>
            <THead>
              <tr>
                <TH>Type</TH>
                <TH>Status</TH>
                <TH>Recipient</TH>
                <TH>Created</TH>
                <TH>Actions</TH>
              </tr>
            </THead>
            <tbody>
              {toArray<Record<string, unknown>>(query.data).map((row) => (
                <tr key={String(row.id)}>
                  <TCell>{String(row.type ?? "")}</TCell>
                  <TCell>
                    <Badge
                      value={row.status ?? "pending"}
                      tone={statusTone(row.status)}
                    />
                  </TCell>
                  <TCell>
                    {String(row.recipientEmail ?? row.recipient_email ?? "")}
                  </TCell>
                  <TCell>
                    {formatDateTime(row.createdAt ?? row.created_at)}
                  </TCell>
                  <TCell>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => dispatch.mutate(String(row.id))}
                      >
                        Dispatch
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => cancel.mutate(String(row.id))}
                      >
                        Cancel
                      </Button>
                    </div>
                  </TCell>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
