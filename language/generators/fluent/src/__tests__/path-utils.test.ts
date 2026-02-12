import { describe, test, expect } from "vitest";
import {
  isNodeModulesPath,
  extractPackageNameFromPath,
  createRelativeImportPath,
  resolveRelativeImportPath,
} from "../path-utils";

describe("path-utils", () => {
  describe("isNodeModulesPath", () => {
    test("returns true for standard node_modules path", () => {
      expect(isNodeModulesPath("/project/node_modules/lodash/index.d.ts")).toBe(
        true,
      );
    });

    test("returns true for scoped package in node_modules", () => {
      expect(
        isNodeModulesPath(
          "/project/node_modules/@player-tools/types/index.d.ts",
        ),
      ).toBe(true);
    });

    test("returns true for pnpm store path", () => {
      expect(
        isNodeModulesPath(
          "/project/node_modules/.pnpm/@player-tools+types@1.0.0/node_modules/@player-tools/types/index.d.ts",
        ),
      ).toBe(true);
    });

    test("returns false for local source file", () => {
      expect(isNodeModulesPath("/project/src/types/foo.ts")).toBe(false);
    });

    test("returns false for local file with 'modules' in path", () => {
      expect(isNodeModulesPath("/project/src/modules/auth.ts")).toBe(false);
    });
  });

  describe("extractPackageNameFromPath", () => {
    test("extracts simple package name", () => {
      expect(
        extractPackageNameFromPath("/project/node_modules/lodash/index.d.ts"),
      ).toBe("lodash");
    });

    test("extracts scoped package name", () => {
      expect(
        extractPackageNameFromPath(
          "/project/node_modules/@player-tools/types/index.d.ts",
        ),
      ).toBe("@player-tools/types");
    });

    test("extracts package from pnpm store structure", () => {
      expect(
        extractPackageNameFromPath(
          "/project/node_modules/.pnpm/@player-tools+types@1.0.0/node_modules/@player-tools/types/index.d.ts",
        ),
      ).toBe("@player-tools/types");
    });

    test("extracts package from nested pnpm path", () => {
      expect(
        extractPackageNameFromPath(
          "/project/node_modules/.pnpm/react@18.2.0/node_modules/react/index.d.ts",
        ),
      ).toBe("react");
    });

    test("handles deeply nested scoped package", () => {
      expect(
        extractPackageNameFromPath(
          "/project/node_modules/@babel/core/lib/index.d.ts",
        ),
      ).toBe("@babel/core");
    });

    test("returns null for local path without node_modules", () => {
      expect(extractPackageNameFromPath("/project/src/types/foo.ts")).toBe(
        null,
      );
    });

    test("returns null for path ending at node_modules", () => {
      expect(extractPackageNameFromPath("/project/node_modules")).toBe(null);
    });
  });

  describe("createRelativeImportPath", () => {
    test("creates relative path for same directory", () => {
      const result = createRelativeImportPath(
        "/project/src/types/foo.ts",
        "/project/src/types/bar.ts",
      );
      expect(result).toBe("./bar.js");
    });

    test("creates relative path for parent directory", () => {
      const result = createRelativeImportPath(
        "/project/src/builders/foo.ts",
        "/project/src/types/bar.ts",
      );
      expect(result).toBe("../types/bar.js");
    });

    test("creates relative path for deeply nested file", () => {
      const result = createRelativeImportPath(
        "/project/src/a/b/c/foo.ts",
        "/project/src/x/y/bar.ts",
      );
      expect(result).toBe("../../../x/y/bar.js");
    });

    test("converts .ts extension to .js", () => {
      const result = createRelativeImportPath(
        "/project/src/foo.ts",
        "/project/src/bar.ts",
      );
      expect(result).toContain(".js");
      expect(result).not.toContain(".ts");
    });

    test("converts .d.ts extension to .js", () => {
      const result = createRelativeImportPath(
        "/project/src/foo.ts",
        "/project/src/bar.d.ts",
      );
      expect(result).toContain(".js");
      expect(result).not.toContain(".d.ts");
    });
  });

  describe("resolveRelativeImportPath", () => {
    test("resolves relative import to absolute path", () => {
      const result = resolveRelativeImportPath(
        "/project/src/types/foo.ts",
        "./bar",
      );
      expect(result).toBe("/project/src/types/bar.ts");
    });

    test("resolves parent directory import", () => {
      const result = resolveRelativeImportPath(
        "/project/src/builders/foo.ts",
        "../types/bar",
      );
      expect(result).toBe("/project/src/types/bar.ts");
    });

    test("converts .js extension to .ts", () => {
      const result = resolveRelativeImportPath(
        "/project/src/foo.ts",
        "./bar.js",
      );
      expect(result).toBe("/project/src/bar.ts");
    });

    test("preserves .ts extension", () => {
      const result = resolveRelativeImportPath(
        "/project/src/foo.ts",
        "./bar.ts",
      );
      expect(result).toBe("/project/src/bar.ts");
    });

    test("adds .ts extension if no extension provided", () => {
      const result = resolveRelativeImportPath("/project/src/foo.ts", "./bar");
      expect(result).toMatch(/\.ts$/);
    });
  });
});
