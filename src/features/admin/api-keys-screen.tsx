"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorNote } from "@/components/ui/error-note";
import { Input, Label, Select } from "@/components/ui/field";
import { Badge, statusTone } from "@/components/ui/status";
import { TCell, TH, THead, Table } from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { toArray } from "@/lib/utils/format";
import { PageHeading } from "@/features/common/page-heading";

const schema = z.object({
  name: z.string().min(1),
  kind: z.enum(["user", "service_account"]),
  scopes: z.string().min(1),
});

export function ApiKeysScreen() {
  const [rawToken, setRawToken] = useState("");
  const queryClient = useQueryClient();
  const keys = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => apiFetch<unknown>("/api-keys"),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      kind: "service_account",
      scopes: "read:reports",
    },
  });
  const create = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      apiFetch<Record<string, unknown>>("/api-keys", {
        method: "POST",
        body: {
          ...values,
          scopes: values.scopes.split(",").map((item) => item.trim()),
        },
      }),
    onSuccess: (data) => {
      setRawToken(String(data.token ?? ""));
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
  const revoke = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api-keys/${id}/revoke`, { method: "POST", body: {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });
  const rotate = useMutation({
    mutationFn: (id: string) =>
      apiFetch<Record<string, unknown>>(`/api-keys/${id}/rotate`, {
        method: "POST",
        body: {},
      }),
    onSuccess: (data) => setRawToken(String(data.token ?? "")),
  });

  return (
    <>
      <PageHeading
        title="API Keys"
        description="Scoped API key lifecycle for service accounts, CI and alpha operators."
      />
      {rawToken ? (
        <div className="mb-4 flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <span className="truncate font-mono">{rawToken}</span>
          <Button
            variant="secondary"
            onClick={() => navigator.clipboard.writeText(rawToken)}
          >
            <Copy className="size-4" />
            Copy once
          </Button>
        </div>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create key</CardTitle>
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
                <Label>Kind</Label>
                <Select {...form.register("kind")}>
                  <option value="service_account">Service account</option>
                  <option value="user">User</option>
                </Select>
              </div>
              <div>
                <Label>Scopes</Label>
                <Input {...form.register("scopes")} />
              </div>
              {create.isError ? <ErrorNote error={create.error} /> : null}
              <Button type="submit">Create key</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Keys</CardTitle>
          </CardHeader>
          <CardContent>
            {keys.isError ? <ErrorNote error={keys.error} /> : null}
            <Table>
              <THead>
                <tr>
                  <TH>Name</TH>
                  <TH>Status</TH>
                  <TH>Scopes</TH>
                  <TH>Actions</TH>
                </tr>
              </THead>
              <tbody>
                {toArray<Record<string, unknown>>(keys.data).map((row) => (
                  <tr key={String(row.id)}>
                    <TCell>{String(row.name ?? "")}</TCell>
                    <TCell>
                      <Badge
                        value={row.status ?? "active"}
                        tone={statusTone(row.status)}
                      />
                    </TCell>
                    <TCell>
                      {Array.isArray(row.scopes) ? row.scopes.join(", ") : ""}
                    </TCell>
                    <TCell>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => rotate.mutate(String(row.id))}
                        >
                          Rotate
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => revoke.mutate(String(row.id))}
                        >
                          Revoke
                        </Button>
                      </div>
                    </TCell>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
