"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { type ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorNote } from "@/components/ui/error-note";
import { apiFetch } from "@/lib/api/client";

export function useDppQuery<T>(
  queryKey: unknown[],
  path: string,
  enabled = true,
): UseQueryResult<T> {
  return useQuery({
    queryKey,
    queryFn: () => apiFetch<T>(path),
    enabled,
  });
}

export function QueryPanel<T>({
  title,
  query,
  children,
}: {
  title: string;
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" />
            Loading
          </div>
        ) : query.isError ? (
          <ErrorNote error={query.error} />
        ) : query.data ? (
          children(query.data)
        ) : (
          <p className="text-sm text-slate-500">No data</p>
        )}
      </CardContent>
    </Card>
  );
}
