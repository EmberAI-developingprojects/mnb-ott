import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    /* Алдаагүй ажиллахын тулд test-ийн үед env-уудыг хоосон fallback-тай */
    setupFiles: ["src/__tests__/setup.ts"],
  },
});
