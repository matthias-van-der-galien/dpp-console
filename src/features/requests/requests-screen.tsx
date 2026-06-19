"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorNote } from "@/components/ui/error-note";
import { Input, Label, Select } from "@/components/ui/field";
import { Badge, statusTone } from "@/components/ui/status";
import { TCell, TH, THead, Table } from "@/components/ui/table";
import { PageHeading } from "@/features/common/page-heading";
import { apiFetch } from "@/lib/api/client";
import { formatDateTime, toArray } from "@/lib/utils/format";

const createSchema = z.object({
  product_id: z.string().min(1),
  supplier_id: z.string().optional(),
  due_at: z.string().optional(),
  requested_field_keys: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;

function displayName(row: Record<string, unknown>) {
  return String(row.name ?? row.productName ?? row.sku ?? row.id ?? "");
}

function supplierName(row: Record<string, unknown>) {
  return String(row.name ?? row.supplierName ?? row.id ?? "");
}

function fieldLabel(row: Record<string, unknown>) {
  return String(row.fieldLabel ?? row.label ?? row.fieldKey ?? "Field");
}

function fieldKey(row: Record<string, unknown>) {
  return String(row.fieldKey ?? row.key ?? "");
}

function requestedKeys(values: CreateForm, selectedFieldKeys: string[]) {
  const custom = values.requested_field_keys
    ? values.requested_field_keys
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const keys = [...new Set([...selectedFieldKeys, ...custom])];
  return keys.length > 0 ? keys : undefined;
}

export function RequestsScreen() {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [selectedFieldKeys, setSelectedFieldKeys] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const requests = useQuery({
    queryKey: ["evidence-requests"],
    queryFn: () => apiFetch<unknown>("/evidence-requests"),
  });
  const products = useQuery({
    queryKey: ["products"],
    queryFn: () => apiFetch<unknown>("/products"),
  });
  const suppliers = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => apiFetch<unknown>("/suppliers"),
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
  const selectedProductId = form.watch("product_id");
  const productRows = toArray<Record<string, unknown>>(products.data);
  const supplierRows = toArray<Record<string, unknown>>(suppliers.data);
  const productInbox = useQuery({
    queryKey: ["product", selectedProductId, "inbox"],
    queryFn: () =>
      apiFetch<unknown>(`/products/${selectedProductId}/evidence-inbox`),
    enabled: Boolean(selectedProductId),
  });
  const suggestedFields = toArray<Record<string, unknown>>(
    productInbox.data,
  ).filter((item) =>
    ["missing", "conflicting", "expired", "low_confidence"].includes(
      String(item.status ?? ""),
    ),
  );

  const createAndInvite = useMutation({
    mutationFn: async (values: CreateForm) => {
      const request = await apiFetch<Record<string, unknown>>(
        "/evidence-requests",
        {
          method: "POST",
          body: {
            product_id: values.product_id,
            supplier_id: values.supplier_id || undefined,
            pack_key: "battery-passport-readiness",
            due_at: values.due_at
              ? new Date(values.due_at).toISOString()
              : undefined,
            requested_field_keys: requestedKeys(values, selectedFieldKeys),
          },
        },
      );
      const invite = await apiFetch<Record<string, unknown>>(
        `/evidence-requests/${String(request.id)}/supplier-invites`,
        { method: "POST", body: { expiresInDays: 14 } },
      );
      return { invite, request };
    },
    onSuccess: ({ invite }) => {
      setInviteUrl(String(invite.uploadUrl ?? ""));
      setSelectedFieldKeys([]);
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

  function toggleField(key: string) {
    setSelectedFieldKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  return (
    <>
      <PageHeading
        title="Evidence Requests"
        description="Select a product, choose evidence blockers, and send a supplier upload link."
      />
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create supplier request</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) =>
                createAndInvite.mutate(values),
              )}
            >
              <div>
                <Label htmlFor="product_id">Product</Label>
                <Select
                  id="product_id"
                  {...form.register("product_id", {
                    onChange: () => setSelectedFieldKeys([]),
                  })}
                >
                  <option value="">Select product</option>
                  {productRows.map((product) => (
                    <option key={String(product.id)} value={String(product.id)}>
                      {String(product.sku ?? product.id)} -{" "}
                      {displayName(product)}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="supplier_id">Supplier</Label>
                <Select id="supplier_id" {...form.register("supplier_id")}>
                  <option value="">Use product supplier</option>
                  {supplierRows.map((supplier) => (
                    <option
                      key={String(supplier.id)}
                      value={String(supplier.id)}
                    >
                      {supplierName(supplier)}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="due_at">Due at</Label>
                <Input
                  id="due_at"
                  type="datetime-local"
                  {...form.register("due_at")}
                />
              </div>
              <div className="space-y-2">
                <Label>Suggested evidence fields</Label>
                {!selectedProductId ? (
                  <p className="text-sm text-slate-500">
                    Select a product to load missing, conflicting and expired
                    evidence fields.
                  </p>
                ) : null}
                {productInbox.isError ? (
                  <ErrorNote error={productInbox.error} />
                ) : null}
                {selectedProductId &&
                !productInbox.isError &&
                suggestedFields.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No evidence blockers returned for this product.
                  </p>
                ) : null}
                {suggestedFields.length > 0 ? (
                  <div className="max-h-52 space-y-2 overflow-auto rounded-md border border-slate-200 p-2">
                    {suggestedFields.map((field) => {
                      const key = fieldKey(field);
                      return (
                        <label
                          key={key}
                          className="flex items-start gap-2 rounded-md px-2 py-1 text-sm hover:bg-slate-50"
                        >
                          <input
                            className="mt-1"
                            type="checkbox"
                            checked={selectedFieldKeys.includes(key)}
                            onChange={() => toggleField(key)}
                          />
                          <span>
                            <span className="font-medium text-slate-900">
                              {fieldLabel(field)}
                            </span>
                            <span className="ml-2 text-xs text-slate-500">
                              {String(field.status ?? "")}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              <div>
                <Label htmlFor="requested_field_keys">
                  Additional field keys
                </Label>
                <Input
                  id="requested_field_keys"
                  placeholder="carbon_footprint, recycled_content"
                  {...form.register("requested_field_keys")}
                />
              </div>
              {products.isError ? <ErrorNote error={products.error} /> : null}
              {suppliers.isError ? <ErrorNote error={suppliers.error} /> : null}
              {createAndInvite.isError ? (
                <ErrorNote error={createAndInvite.error} />
              ) : null}
              <Button type="submit" disabled={createAndInvite.isPending}>
                <Send className="size-4" />
                Create request and invite supplier
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Supplier requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.isError ? <ErrorNote error={requests.error} /> : null}
            {inviteUrl ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm">
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
            {rows.length === 0 ? (
              <p className="text-sm text-slate-500">
                No supplier evidence requests yet.
              </p>
            ) : (
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
                          {String(row.productSku ?? row.productId ?? "")}
                        </TCell>
                        <TCell>
                          {String(row.supplierName ?? row.supplierId ?? "")}
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
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
