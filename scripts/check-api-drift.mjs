import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const sourceContract = resolve(
  process.cwd(),
  "../dpp-services/contracts/openapi.json",
);
const trackedContract = resolve(process.cwd(), "contracts/openapi.json");
const trackedTypes = resolve(process.cwd(), "src/lib/api/generated.ts");

function read(path) {
  if (!existsSync(path)) throw new Error(`Missing file: ${path}`);
  return readFileSync(path, "utf8");
}

function readJsonComparable(path) {
  return JSON.stringify(JSON.parse(read(path)));
}

if (
  readJsonComparable(sourceContract) !== readJsonComparable(trackedContract)
) {
  throw new Error("contracts/openapi.json is out of sync. Run pnpm sync:api.");
}

const tempDir = mkdtempSync(resolve(tmpdir(), "dpp-console-api-"));
const tempTypes = resolve(tempDir, "generated.ts");
execFileSync(
  "pnpm",
  ["exec", "openapi-typescript", trackedContract, "-o", tempTypes],
  {
    stdio: "ignore",
  },
);
execFileSync("pnpm", ["exec", "prettier", "--write", tempTypes], {
  stdio: "ignore",
});

if (read(tempTypes) !== read(trackedTypes)) {
  throw new Error(
    "src/lib/api/generated.ts is out of sync. Run pnpm generate:api.",
  );
}

console.log("API contract artifacts are in sync.");
