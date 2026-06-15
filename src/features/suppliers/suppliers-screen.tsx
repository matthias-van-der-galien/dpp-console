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
import { TCell, TH, THead, Table } from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { toArray } from "@/lib/utils/format";
import { PageHeading } from "@/features/common/page-heading";

const schema = z.object({
  name: z.string().min(1),
  external_id: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export function SuppliersScreen() {
  const queryClient = useQueryClient();
  const suppliers = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => apiFetch<unknown>("/suppliers"),
  });
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", external_id: "", contact_email: "" },
  });
  const create = useMutation({
    mutationFn: (values: FormValues) =>
      apiFetch("/suppliers", { method: "POST", body: values }),
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
  const rows = toArray<Record<string, unknown>>(suppliers.data);

  return (
    <>
      <PageHeading
        title="Suppliers"
        description="Manage supplier metadata and contact emails used by notification delivery."
      />
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Add supplier</CardTitle>
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
                <Label>External ID</Label>
                <Input {...form.register("external_id")} />
              </div>
              <div>
                <Label>Contact email</Label>
                <Input type="email" {...form.register("contact_email")} />
              </div>
              {create.isError ? <ErrorNote error={create.error} /> : null}
              <Button type="submit" disabled={create.isPending}>
                <Plus className="size-4" />
                Add supplier
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Supplier directory</CardTitle>
          </CardHeader>
          <CardContent>
            {suppliers.isError ? <ErrorNote error={suppliers.error} /> : null}
            <Table>
              <THead>
                <tr>
                  <TH>Name</TH>
                  <TH>External ID</TH>
                  <TH>Contact email</TH>
                  <TH>ID</TH>
                </tr>
              </THead>
              <tbody>
                {rows.map((row) => (
                  <tr key={String(row.id)}>
                    <TCell>{String(row.name ?? "")}</TCell>
                    <TCell>
                      {String(row.externalId ?? row.external_id ?? "")}
                    </TCell>
                    <TCell>
                      {String(row.contactEmail ?? row.contact_email ?? "")}
                    </TCell>
                    <TCell className="font-mono text-xs">
                      {String(row.id ?? "")}
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
