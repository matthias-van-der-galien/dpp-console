"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  email: z.string().email(),
  role: z.enum(["admin", "buyer"]),
});

export function UsersScreen() {
  const queryClient = useQueryClient();
  const users = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<unknown>("/users"),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", role: "buyer" },
  });
  const create = useMutation({
    mutationFn: (body: z.infer<typeof schema>) =>
      apiFetch("/users", { method: "POST", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
  const disable = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/users/${id}/disable`, { method: "POST", body: {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
  const activate = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/users/${id}/activate`, { method: "POST", body: {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  return (
    <>
      <PageHeading
        title="Users"
        description="Admin-only user lifecycle controls for workspace auth."
      />
      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create user</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={form.handleSubmit((values) => create.mutate(values))}
            >
              <div>
                <Label>Email</Label>
                <Input type="email" {...form.register("email")} />
              </div>
              <div>
                <Label>Role</Label>
                <Select {...form.register("role")}>
                  <option value="buyer">Buyer</option>
                  <option value="admin">Admin</option>
                </Select>
              </div>
              {create.isError ? <ErrorNote error={create.error} /> : null}
              <Button type="submit">Create user</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Workspace users</CardTitle>
          </CardHeader>
          <CardContent>
            {users.isError ? <ErrorNote error={users.error} /> : null}
            <Table>
              <THead>
                <tr>
                  <TH>Email</TH>
                  <TH>Role</TH>
                  <TH>Status</TH>
                  <TH>Actions</TH>
                </tr>
              </THead>
              <tbody>
                {toArray<Record<string, unknown>>(users.data).map((row) => (
                  <tr key={String(row.id)}>
                    <TCell>{String(row.email ?? "")}</TCell>
                    <TCell>{String(row.role ?? "")}</TCell>
                    <TCell>
                      <Badge
                        value={row.status ?? "active"}
                        tone={statusTone(row.status)}
                      />
                    </TCell>
                    <TCell>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => activate.mutate(String(row.id))}
                        >
                          Activate
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => disable.mutate(String(row.id))}
                        >
                          Disable
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
