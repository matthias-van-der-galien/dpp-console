# DPP Console

Frontend-only buyer/admin console and supplier-token submission surface for `dpp-services`.

## Setup

```bash
pnpm install
pnpm sync:api
pnpm generate:api
cp .env.example .env.local
pnpm dev
```

Default API target:

```bash
NEXT_PUBLIC_DPP_API_BASE_URL=http://127.0.0.1:3000
NEXT_PUBLIC_AUTH_MODE=jwt-token
```

Paste a JWT or the local seeded `dev-token` on `/login`. Tokens are stored in session storage for the alpha console.

## Workflows

- Overview: readiness, queue health and backend readiness.
- Products: readiness, evidence inbox, evidence history, audit events and exports.
- Evidence requests: create requests, set due dates and generate supplier token upload URLs.
- Supplier submissions: unauthenticated `/supplier-submissions/[token]` upload and complete flow.
- Reports: live reports, CSV exports, snapshots and digest run-now.
- Ops/Admin: notifications, events, webhooks, queue jobs, diagnostics, users and scoped API keys.

## Contract

The console tracks the backend OpenAPI contract from the sibling repo:

```bash
pnpm sync:api
pnpm check:api-drift
```

Generated types live in `src/lib/api/generated.ts`.

## Checks

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```
