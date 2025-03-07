import { configDefaults, defineConfig } from "vitest/config";
import path from "node:path";
import { UserConfig } from "vitest";

export default defineConfig({
  test: {
    environment: "happy-dom",
    exclude: [
      ...configDefaults.exclude,
      "helpers",
      "bazel-bin",
      "bazel-out",
      "bazel-tools",
      "bazel-testlogs",
    ],
    reporters: [
      "default",
      process.env.XML_OUTPUT_FILE ? "junit" : "basic",
      path.join(__dirname, "helpers", "vitest_coverage_mapper.ts"),
    ],

    setupFiles: [
      path.join(
        process.env.XML_OUTPUT_FILE ? "" : __dirname,
        "./scripts/vitest.setup.ts"
      ),
    ],

    outputFile: {
      junit: process.env.XML_OUTPUT_FILE ?? "test-results.xml",
    },

    passWithNoTests: true,

    coverage: {
      enabled: Boolean(process.env.COVERAGE_OUTPUT_FILE),
      reportOnFailure: true,
      provider: "v8",
      exclude: [
        "**/node_modules/**",
        "external/**",
        "tools/**",
        "**/__tests__/**",
        "**/__mocks__/**",
        "**/*.d.ts",
        "**/*.test.*",
        "vitest.config.mts",
      ],
      all: true,
      reporter: ["text", "html", "lcovonly"],
    },
  },
}) as UserConfig;
