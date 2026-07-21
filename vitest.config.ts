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
    // Opens public bookings for the run and restores the flag afterwards.
    // See the file header — it explains why, and the risk of running this
    // against the live project.
    globalSetup: ["tests/support/global-setup.ts"],
  },
});
