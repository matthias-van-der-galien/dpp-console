import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
