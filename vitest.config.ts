import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 30_000,
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
  },
});
