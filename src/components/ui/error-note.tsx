import { AlertTriangle } from "lucide-react";

import { userFacingError } from "@/lib/api/errors";

export function ErrorNote({ error }: { error: unknown }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{userFacingError(error)}</span>
    </div>
  );
}
