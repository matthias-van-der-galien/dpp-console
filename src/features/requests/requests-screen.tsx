"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorNote } from "@/components/ui/error-note";
import { Input, Label } from "@/components/ui/field";
import { Badge, statusTone } from "@/components/ui/status";
import { TCell, TH, THead, Table } from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { formatDateTime, toArray } from "@/lib/utils/format";
import { PageHeading } from "@/features/common/page-heading";

const createSchema = z.object({
  product_id: z.string().min(1),
  supplier_id: z.string().optional(),
  due_at: z.string().optional(),
  requested_field_keys: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;

export function RequestsScreen() {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const requests = useQuery({
    queryKey: ["evidence-requests"],
    queryFn: () => apiFetch<unknown>("/evidence-requests"),
  });
  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      product_id: "",
      supplier_id: "",
      due_at: "",
      requested_field_keys: "",
    },
  });
  const create = useMutation({
    mutationFn: (values: CreateForm) =>
      apiFetch("/evidence-requests", {
        method: "POST",
        body: {
          product_id: values.product_id,
          supplier_id: values.supplier_id || undefined,
          due_at: values.due_at
            ? new Date(values.due_at).toISOString()
            : undefined,
          requested_field_keys: values.requested_field_keys
            ? values.requested_field_keys.split(",").map((item) => item.trim())
            : undefined,
        },
      }),
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["evidence-requests"] });
    },
  });
  const invite = useMutation({
    mutationFn: (id: string) =>
      apiFetch<Record<string, unknown>>(
        `/evidence-requests/${id}/supplier-invites`,
        { method: "POST", body: { expiresInDays: 14 } },
      ),
    onSuccess: (data) => setInviteUrl(String(data.uploadUrl ?? "")),
  });
  const rows = toArray<Record<string, unknown>>(requests.data);

  return (
    <>
      <PageHeading
        title="Evidence Requests"
        description="Create buyer requests, pin due dates and generate supplier token upload URLs."
      />
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create request</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={form.handleSubmit((values) => create.mutate(values))}
            >
              <div>
                <Label>Product ID</Label>
                <Input {...form.register("product_id")} />
              </div>
              <div>
                <Label>Supplier ID</Label>
                <Input {...form.register("supplier_id")} />
              </div>
              <div>
                <Label>Due at</Label>
                <Input type="datetime-local" {...form.register("due_at")} />
              </div>
              <div>
                <Label>Requested field keys</Label>
                <Input
                  placeholder="field_a, field_b"
                  {...form.register("requested_field_keys")}
                />
              </div>
              {create.isError ? <ErrorNote error={create.error} /> : null}
              <Button type="submit" disabled={create.isPending}>
                <Plus className="size-4" />
                Create request
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.isError ? <ErrorNote error={requests.error} /> : null}
            {inviteUrl ? (
              <div className="flex items-center justify-between rounded-md border border-teal-200 bg-teal-50 p-3 text-sm">
                <span className="truncate text-teal-900">{inviteUrl}</span>
                <Button
                  variant="secondary"
                  onClick={() => navigator.clipboard.writeText(inviteUrl)}
                >
                  <Copy className="size-4" />
                  Copy
                </Button>
              </div>
            ) : null}
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <tr>
                    <TH>ID</TH>
                    <TH>Status</TH>
                    <TH>Product</TH>
                    <TH>Supplier</TH>
                    <TH>Due</TH>
                    <TH>Invite</TH>
                  </tr>
                </THead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={String(row.id)}>
                      <TCell>
                        <Link
                          className="font-medium text-teal-700 hover:underline"
                          href={`/evidence-requests/${String(row.id)}`}
                        >
                          {String(row.id).slice(0, 8)}
                        </Link>
                      </TCell>
                      <TCell>
                        <Badge
                          value={row.status ?? "open"}
                          tone={statusTone(row.status)}
                        />
                      </TCell>
                      <TCell>
                        {String(row.productId ?? row.product_id ?? "")}
                      </TCell>
                      <TCell>
                        {String(row.supplierId ?? row.supplier_id ?? "")}
                      </TCell>
                      <TCell>{formatDateTime(row.dueAt ?? row.due_at)}</TCell>
                      <TCell>
                        <Button
                          variant="secondary"
                          onClick={() => invite.mutate(String(row.id))}
                          disabled={invite.isPending}
                        >
                          Create
                        </Button>
                      </TCell>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
