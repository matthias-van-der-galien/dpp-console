import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const source = resolve(process.cwd(), "../dpp-services/contracts/openapi.json");
const target = resolve(process.cwd(), "contracts/openapi.json");

if (!existsSync(source)) {
  throw new Error(`OpenAPI source not found: ${source}`);
}

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log(`Synced ${source} -> ${target}`);
