"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorNote } from "@/components/ui/error-note";
import { Input, Label } from "@/components/ui/field";
import { Badge, statusTone } from "@/components/ui/status";
import { TCell, TH, THead, Table } from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { toArray } from "@/lib/utils/format";
import { PageHeading } from "@/features/common/page-heading";

const schema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  event_types: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export function WebhooksScreen() {
  const queryClient = useQueryClient();
  const subscriptions = useQuery({
    queryKey: ["webhook-subscriptions"],
    queryFn: () => apiFetch<unknown>("/webhook-subscriptions"),
  });
  const deliveries = useQuery({
    queryKey: ["webhook-deliveries"],
    queryFn: () => apiFetch<unknown>("/webhook-deliveries"),
  });
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", url: "", event_types: "*" },
  });
  const create = useMutation({
    mutationFn: (values: FormValues) =>
      apiFetch("/webhook-subscriptions", {
        method: "POST",
        body: {
          ...values,
          event_types: values.event_types.split(",").map((item) => item.trim()),
        },
      }),
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["webhook-subscriptions"] });
    },
  });
  const test = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/webhook-subscriptions/${id}/test`, {
        method: "POST",
        body: {},
      }),
  });

  return (
    <>
      <PageHeading
        title="Webhooks"
        description="Manage signed webhook subscriptions and inspect delivery status."
      />
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={form.handleSubmit((values) => create.mutate(values))}
            >
              <div>
                <Label>Name</Label>
                <Input {...form.register("name")} />
              </div>
              <div>
                <Label>URL</Label>
                <Input {...form.register("url")} />
              </div>
              <div>
                <Label>Event types</Label>
                <Input
                  placeholder="* or evidence.accepted"
                  {...form.register("event_types")}
                />
              </div>
              {create.isError ? <ErrorNote error={create.error} /> : null}
              <Button type="submit" disabled={create.isPending}>
                <Plus className="size-4" />
                Create
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            {subscriptions.isError ? (
              <ErrorNote error={subscriptions.error} />
            ) : null}
            <Table>
              <THead>
                <tr>
                  <TH>Name</TH>
                  <TH>Status</TH>
                  <TH>URL</TH>
                  <TH>Test</TH>
                </tr>
              </THead>
              <tbody>
                {toArray<Record<string, unknown>>(subscriptions.data).map(
                  (row) => (
                    <tr key={String(row.id)}>
                      <TCell>{String(row.name ?? "")}</TCell>
                      <TCell>
                        <Badge
                          value={row.status ?? "active"}
                          tone={statusTone(row.status)}
                        />
                      </TCell>
                      <TCell>{String(row.url ?? "")}</TCell>
                      <TCell>
                        <Button
                          variant="secondary"
                          onClick={() => test.mutate(String(row.id))}
                        >
                          Test
                        </Button>
                      </TCell>
                    </tr>
                  ),
                )}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Recent deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          {deliveries.isError ? <ErrorNote error={deliveries.error} /> : null}
          <Table>
            <THead>
              <tr>
                <TH>ID</TH>
                <TH>Status</TH>
                <TH>Reason</TH>
                <TH>Attempts</TH>
              </tr>
            </THead>
            <tbody>
              {toArray<Record<string, unknown>>(deliveries.data).map((row) => (
                <tr key={String(row.id)}>
                  <TCell>{String(row.id).slice(0, 8)}</TCell>
                  <TCell>
                    <Badge
                      value={row.status ?? ""}
                      tone={statusTone(row.status)}
                    />
                  </TCell>
                  <TCell>{String(row.reason ?? "")}</TCell>
                  <TCell>
                    {String(row.attemptCount ?? row.attempt_count ?? 0)}
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
