"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorNote } from "@/components/ui/error-note";
import { Textarea } from "@/components/ui/field";
import { Badge, statusTone } from "@/components/ui/status";
import { apiFetch } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils/format";
import { PageHeading } from "@/features/common/page-heading";

export function RequestDetailScreen({ requestId }: { requestId: string }) {
  const queryClient = useQueryClient();
  const request = useQuery({
    queryKey: ["evidence-request", requestId],
    queryFn: () =>
      apiFetch<Record<string, unknown>>(`/evidence-requests/${requestId}`),
  });
  const correction = useMutation({
    mutationFn: () =>
      apiFetch(`/evidence-requests/${requestId}/request-correction`, {
        method: "POST",
        body: {
          reason: "Correction requested from console",
          reissue_invite: true,
        },
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["evidence-request", requestId],
      }),
  });
  const close = useMutation({
    mutationFn: () =>
      apiFetch(`/evidence-requests/${requestId}/close`, {
        method: "POST",
        body: {},
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["evidence-request", requestId],
      }),
  });
  const reminder = useMutation({
    mutationFn: () =>
      apiFetch(`/evidence-requests/${requestId}/send-reminder`, {
        method: "POST",
        body: {},
      }),
  });
  const product =
    request.data?.product && typeof request.data.product === "object"
      ? (request.data.product as Record<string, unknown>)
      : undefined;
  const supplier =
    request.data?.supplier && typeof request.data.supplier === "object"
      ? (request.data.supplier as Record<string, unknown>)
      : undefined;

  return (
    <>
      <PageHeading title="Evidence Request" description={requestId} />
      {request.isError ? <ErrorNote error={request.error} /> : null}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Request context</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <div className="text-xs text-slate-500">Status</div>
              <Badge
                value={request.data?.status ?? "unknown"}
                tone={statusTone(request.data?.status)}
              />
            </div>
            <div>
              <div className="text-xs text-slate-500">SLA</div>
              <Badge
                value={request.data?.slaStatus ?? "unknown"}
                tone={statusTone(request.data?.slaStatus)}
              />
            </div>
            <div>
              <div className="text-xs text-slate-500">Product</div>
              <div>{String(request.data?.productId ?? product?.id ?? "")}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Supplier</div>
              <div>
                {String(request.data?.supplierId ?? supplier?.id ?? "")}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Pack</div>
              <div>
                {String(request.data?.packKey ?? "battery-passport-readiness")}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Due</div>
              <div>{formatDateTime(request.data?.dueAt)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Correction reason"
              defaultValue={String(request.data?.correctionReason ?? "")}
            />
            {correction.isError ? <ErrorNote error={correction.error} /> : null}
            <Button
              className="w-full"
              onClick={() => correction.mutate()}
              disabled={correction.isPending}
            >
              <Send className="size-4" />
              Request correction
            </Button>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => reminder.mutate()}
              disabled={reminder.isPending}
            >
              Send reminder
            </Button>
            <Button
              className="w-full"
              variant="danger"
              onClick={() => close.mutate()}
              disabled={close.isPending}
            >
              <XCircle className="size-4" />
              Close request
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
