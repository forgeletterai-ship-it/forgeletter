import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "node:path"

// Vitest configured with jsdom + React Testing Library for component
// tests. Excludes Next.js routes and PDF rendering — those are tested
// through type-checking and the build, not unit tests.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
})
