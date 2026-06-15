"use client";

import { LogOut, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/status";
import { useAuth } from "@/lib/auth/auth-provider";

export function Topbar() {
  const auth = useAuth();
  const router = useRouter();
  const user = auth.me?.user as Record<string, unknown> | undefined;
  const workspace = auth.me?.workspace as Record<string, unknown> | undefined;

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
      <div>
        <div className="text-sm font-semibold text-slate-950">
          {String(workspace?.name ?? "Workspace")}
        </div>
        <div className="text-xs text-slate-500">
          {String(user?.email ?? "Authenticated console session")}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge value={auth.me?.authMethod ?? "api_key"} tone="info" />
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
          <ShieldCheck className="size-3.5" />
          {(auth.me?.scopes ?? []).slice(0, 3).join(", ") || "scoped"}
        </span>
        <Button
          variant="ghost"
          onClick={() => {
            auth.logout();
            router.push("/login");
          }}
        >
          <LogOut className="size-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}
