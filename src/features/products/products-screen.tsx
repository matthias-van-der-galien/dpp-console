"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorNote } from "@/components/ui/error-note";
import { Badge, statusTone } from "@/components/ui/status";
import { TCell, TH, THead, Table } from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { formatDateTime, toArray } from "@/lib/utils/format";
import { PageHeading } from "@/features/common/page-heading";

export function ProductsScreen() {
  const query = useQuery({
    queryKey: ["products"],
    queryFn: () => apiFetch<unknown>("/products"),
  });
  const rows = toArray<Record<string, unknown>>(query.data);

  return (
    <>
      <PageHeading
        title="Products"
        description="Products with supplier evidence readiness and review status."
      />
      <Card>
        <CardHeader>
          <CardTitle>Product inventory</CardTitle>
        </CardHeader>
        <CardContent>
          {query.isError ? <ErrorNote error={query.error} /> : null}
          {!query.isError && rows.length === 0 ? (
            <p className="text-sm text-slate-500">No products returned yet.</p>
          ) : null}
          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <tr>
                    <TH>SKU</TH>
                    <TH>Name</TH>
                    <TH>Category</TH>
                    <TH>Status</TH>
                    <TH>Updated</TH>
                  </tr>
                </THead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={String(row.id)}>
                      <TCell>
                        <Link
                          className="font-medium text-teal-700 hover:underline"
                          href={`/products/${String(row.id)}`}
                        >
                          {String(row.sku ?? row.productSku ?? row.id)}
                        </Link>
                      </TCell>
                      <TCell>{String(row.name ?? row.productName ?? "")}</TCell>
                      <TCell>
                        {String(row.batteryCategory ?? row.category ?? "")}
                      </TCell>
                      <TCell>
                        <Badge
                          value={row.status ?? "tracked"}
                          tone={statusTone(row.status ?? "tracked")}
                        />
                      </TCell>
                      <TCell>
                        {formatDateTime(row.updatedAt ?? row.createdAt)}
                      </TCell>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
