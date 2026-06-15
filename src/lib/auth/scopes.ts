export const scopes = {
  all: "*",
  readWorkspace: "read:workspace",
  writeEvidence: "write:evidence",
  writeRequests: "write:requests",
  readReports: "read:reports",
  writeReports: "write:reports",
  readEvents: "read:events",
  writeWebhooks: "write:webhooks",
  adminApiKeys: "admin:api_keys",
  adminCompliancePacks: "admin:compliance_packs",
  adminQueue: "admin:queue",
  adminNotifications: "admin:notifications",
  adminUsers: "admin:users",
} as const;

export function hasScope(
  currentScopes: string[] | undefined,
  required: string,
) {
  return Boolean(
    currentScopes?.includes(scopes.all) || currentScopes?.includes(required),
  );
}
