import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    // All unit tests live in /tests (kept out of lib/ so source folders stay clean).
    include: ["tests/**/*.test.ts"],
  },
});
