"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorNote } from "@/components/ui/error-note";
import { Input, Label } from "@/components/ui/field";
import { authMode } from "@/lib/api/config";
import { useAuth } from "@/lib/auth/auth-provider";

const schema = z.object({
  token: z.string().min(1, "Paste a bearer token"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const auth = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<unknown>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { token: "" },
  });

  async function submit(values: FormValues) {
    setError(null);
    try {
      await auth.login(values.token.trim());
      router.push(params.get("next") ?? "/");
    } catch (nextError) {
      setError(nextError);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-teal-700" />
            <CardTitle>DPP Console Access</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <div className="space-y-2">
              <Label htmlFor="token">Bearer token</Label>
              <Input
                id="token"
                type="password"
                autoFocus
                autoComplete="off"
                {...form.register("token")}
              />
              <p className="text-xs text-slate-500">
                Auth mode: {authMode}. Paste a JWT or local alpha API key; the
                token is kept in session storage.
              </p>
              {form.formState.errors.token ? (
                <p className="text-sm text-red-700">
                  {form.formState.errors.token.message}
                </p>
              ) : null}
            </div>
            {error ? <ErrorNote error={error} /> : null}
            <Button
              className="w-full"
              type="submit"
              disabled={form.formState.isSubmitting}
            >
              Validate and enter
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function LoginShell() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-teal-700" />
            <CardTitle>DPP Console Access</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">Loading auth screen</p>
        </CardContent>
      </Card>
    </main>
  );
}
