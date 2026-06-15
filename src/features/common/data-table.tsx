import Link from "next/link";

import { Badge, ReadinessBar, statusTone } from "@/components/ui/status";
import { Table, TCell, TH, THead } from "@/components/ui/table";
import { formatDateTime, getId, toArray } from "@/lib/utils/format";

export type Column = {
  key: string;
  label: string;
  kind?: "status" | "date" | "readiness" | "link";
  href?: (row: Record<string, unknown>) => string;
};

export function DataTable({
  data,
  columns,
  empty = "No rows yet",
}: {
  data: unknown;
  columns: Column[];
  empty?: string;
}) {
  const rows = toArray<Record<string, unknown>>(data);
  if (rows.length === 0)
    return <p className="text-sm text-slate-500">{empty}</p>;

  return (
    <div className="overflow-x-auto">
      <Table>
        <THead>
          <tr>
            {columns.map((column) => (
              <TH key={column.key}>{column.label}</TH>
            ))}
          </tr>
        </THead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={getId(row) || index}>
              {columns.map((column) => {
                const value = row[column.key];
                return (
                  <TCell key={column.key}>
                    {column.kind === "status" ? (
                      <Badge value={value} tone={statusTone(value)} />
                    ) : column.kind === "date" ? (
                      formatDateTime(value)
                    ) : column.kind === "readiness" ? (
                      <ReadinessBar value={value} />
                    ) : column.kind === "link" && column.href ? (
                      <Link
                        className="font-medium text-teal-700 hover:underline"
                        href={column.href(row)}
                      >
                        {String(value ?? getId(row))}
                      </Link>
                    ) : (
                      String(value ?? "")
                    )}
                  </TCell>
                );
              })}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
