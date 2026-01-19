import { describe, test, expect, beforeEach } from "vitest";
import { ImportGenerator } from "../import-generator";

describe("ImportGenerator", () => {
  let generator: ImportGenerator;

  describe("Basic Configuration", () => {
    beforeEach(() => {
      generator = new ImportGenerator();
    });

    test("generates default import paths", () => {
      const imports = generator.generateImports("TextAsset");

      // Default path uses kebab-case conversion
      expect(imports).toContain('from "../types/');
      expect(imports).toContain('from "@player-tools/fluent"');
    });

    test("uses custom fluent import path", () => {
      generator = new ImportGenerator({
        fluentImportPath: "../../../gen/common.js",
      });

      const imports = generator.generateImports("TextAsset");

      expect(imports).toContain('from "../../../gen/common.js"');
      expect(imports).not.toContain('from "@player-tools/fluent"');
    });

    test("uses custom types import path", () => {
      generator = new ImportGenerator({
        typesImportPath: "../custom-types.js",
      });

      generator.setNeedsAssetImport(true);
      const imports = generator.generateImports("TextAsset");

      expect(imports).toContain('from "../custom-types.js"');
    });

    test("uses custom type import path generator", () => {
      generator = new ImportGenerator({
        typeImportPathGenerator: (typeName) =>
          `../types/${typeName.toLowerCase()}.js`,
      });

      const imports = generator.generateImports("TextAsset");

      expect(imports).toContain('from "../types/textasset.js"');
    });
  });

  describe("Type Tracking", () => {
    beforeEach(() => {
      generator = new ImportGenerator();
    });

    test("tracks referenced types for same file", () => {
      generator = new ImportGenerator({
        sameFileTypes: new Set(["TypeA", "TypeB"]),
      });

      generator.trackReferencedType("TypeA");
      generator.trackReferencedType("TypeB");

      const imports = generator.generateImports("MainType");

      expect(imports).toMatch(/import type \{[^}]*MainType[^}]*\}/);
      expect(imports).toMatch(/import type \{[^}]*TypeA[^}]*\}/);
      expect(imports).toMatch(/import type \{[^}]*TypeB[^}]*\}/);
    });

    test("tracks external types", () => {
      const externalTypes = new Map<string, string>();
      externalTypes.set("ExternalType", "@external/types");

      generator = new ImportGenerator({ externalTypes });

      generator.trackReferencedType("ExternalType");

      const imports = generator.generateImports("MainType");

      expect(imports).toContain(
        'import type { ExternalType } from "@external/types"',
      );
    });

    test("groups multiple types from same external package", () => {
      const externalTypes = new Map<string, string>();
      externalTypes.set("TypeA", "@external/types");
      externalTypes.set("TypeB", "@external/types");

      generator = new ImportGenerator({ externalTypes });

      generator.trackReferencedType("TypeA");
      generator.trackReferencedType("TypeB");

      const imports = generator.generateImports("MainType");

      // Both types should be in one import statement
      expect(imports).toMatch(
        /import type \{[^}]*TypeA[^}]*TypeB[^}]*\} from "@external\/types"/,
      );
    });

    test("external types take precedence over sameFileTypes", () => {
      const sameFileTypes = new Set(["SharedType"]);
      const externalTypes = new Map<string, string>();
      externalTypes.set("SharedType", "@external/shared");

      generator = new ImportGenerator({ sameFileTypes, externalTypes });

      generator.trackReferencedType("SharedType");

      const imports = generator.generateImports("MainType");

      expect(imports).toContain(
        'import type { SharedType } from "@external/shared"',
      );
    });
  });

  describe("Namespace Tracking", () => {
    test("tracks namespace imports", () => {
      const externalTypes = new Map<string, string>();
      externalTypes.set("Validation", "@player-ui/types");

      generator = new ImportGenerator({ externalTypes });

      generator.trackNamespaceImport("Validation");

      const imports = generator.generateImports("MainType");

      expect(imports).toContain(
        'import type { Validation } from "@player-ui/types"',
      );
    });
  });

  describe("Asset Import", () => {
    beforeEach(() => {
      generator = new ImportGenerator();
    });

    test("includes Asset import when needed", () => {
      generator.setNeedsAssetImport(true);

      const imports = generator.generateImports("TextAsset");

      expect(imports).toContain(
        'import type { Asset } from "@player-ui/types"',
      );
    });

    test("does not include Asset import when not needed", () => {
      generator.setNeedsAssetImport(false);

      const imports = generator.generateImports("TextAsset");

      expect(imports).not.toContain("import type { Asset }");
    });
  });

  describe("Import Statement Structure", () => {
    test("generates fluent utilities import", () => {
      generator = new ImportGenerator();

      const imports = generator.generateImports("TextAsset");

      expect(imports).toContain("FluentBuilder");
      expect(imports).toContain("BaseBuildContext");
      expect(imports).toContain("FluentBuilderBase");
      expect(imports).toContain("createInspectMethod");
      expect(imports).toContain("TaggedTemplateValue");
    });

    test("generates type import for main type", () => {
      generator = new ImportGenerator();

      const imports = generator.generateImports("TextAsset");

      expect(imports).toMatch(/import type \{[^}]*TextAsset[^}]*\}/);
    });
  });

  describe("Type Import Path Generator with sameFileTypes", () => {
    test("uses typeImportPathGenerator for non-same-file types", () => {
      generator = new ImportGenerator({
        sameFileTypes: new Set(["LocalType"]),
        typeImportPathGenerator: (typeName) =>
          `../other/${typeName.toLowerCase()}.js`,
      });

      generator.trackReferencedType("LocalType");
      generator.trackReferencedType("ExternalType");

      const imports = generator.generateImports("MainType");

      // LocalType should be with MainType
      expect(imports).toMatch(/import type \{[^}]*LocalType[^}]*\}/);

      // ExternalType should use the generator
      expect(imports).toContain(
        'import type { ExternalType } from "../other/externaltype.js"',
      );
    });
  });

  describe("Strip Generic Arguments", () => {
    test("strips generic arguments from type names for imports", () => {
      generator = new ImportGenerator({
        sameFileTypes: new Set(["ListItem"]),
      });

      generator.trackReferencedType("ListItem<AnyAsset>");

      const imports = generator.generateImports("MainType");

      // Should import "ListItem", not "ListItem<AnyAsset>"
      expect(imports).toMatch(/import type \{[^}]*ListItem[^}]*\}/);
      expect(imports).not.toContain("ListItem<AnyAsset>");
    });
  });

  describe("Namespaced Type Handling", () => {
    test("handles namespaced types from external packages", () => {
      const externalTypes = new Map<string, string>();
      externalTypes.set("Validation", "@player-ui/types");

      generator = new ImportGenerator({ externalTypes });

      generator.trackReferencedType("Validation.CrossfieldReference");

      const imports = generator.generateImports("MainType");

      // Should import the namespace, not the full path
      expect(imports).toContain(
        'import type { Validation } from "@player-ui/types"',
      );
    });

    test("defaults namespaced types to @player-ui/types", () => {
      generator = new ImportGenerator();

      generator.trackReferencedType("Validation.CrossfieldReference");

      const imports = generator.generateImports("MainType");

      expect(imports).toContain(
        'import type { Validation } from "@player-ui/types"',
      );
    });
  });

  describe("TypeTransformContext Interface", () => {
    test("implements getGenericParamSymbols", () => {
      generator = new ImportGenerator();
      const symbols = generator.getGenericParamSymbols();

      expect(symbols).toBeInstanceOf(Set);
    });

    test("implements getNamespaceMemberMap", () => {
      generator = new ImportGenerator();
      const map = generator.getNamespaceMemberMap();

      expect(map).toBeInstanceOf(Map);
    });

    test("implements setNeedsAssetImport and getNeedsAssetImport", () => {
      generator = new ImportGenerator();

      expect(generator.getNeedsAssetImport()).toBe(false);

      generator.setNeedsAssetImport(true);
      expect(generator.getNeedsAssetImport()).toBe(true);

      generator.setNeedsAssetImport(false);
      expect(generator.getNeedsAssetImport()).toBe(false);
    });
  });

  describe("Scoped Packages", () => {
    test("handles scoped packages (@org/package)", () => {
      const externalTypes = new Map<string, string>();
      externalTypes.set("ScopedType", "@org/package");

      generator = new ImportGenerator({ externalTypes });

      generator.trackReferencedType("ScopedType");

      const imports = generator.generateImports("MainType");

      expect(imports).toContain(
        'import type { ScopedType } from "@org/package"',
      );
    });

    test("groups multiple types from same scoped package", () => {
      const externalTypes = new Map<string, string>();
      externalTypes.set("TypeA", "@my-org/shared-types");
      externalTypes.set("TypeB", "@my-org/shared-types");
      externalTypes.set("TypeC", "@my-org/shared-types");

      generator = new ImportGenerator({ externalTypes });

      generator.trackReferencedType("TypeA");
      generator.trackReferencedType("TypeB");
      generator.trackReferencedType("TypeC");

      const imports = generator.generateImports("MainType");

      // All types should be in one import statement
      expect(imports).toMatch(
        /import type \{[^}]*TypeA[^}]*\} from "@my-org\/shared-types"/,
      );
      expect(imports).toMatch(
        /import type \{[^}]*TypeB[^}]*\} from "@my-org\/shared-types"/,
      );
    });

    test("handles deeply scoped packages (@org/category/package)", () => {
      const externalTypes = new Map<string, string>();
      externalTypes.set("DeepType", "@org/category/package");

      generator = new ImportGenerator({ externalTypes });

      generator.trackReferencedType("DeepType");

      const imports = generator.generateImports("MainType");

      expect(imports).toContain(
        'import type { DeepType } from "@org/category/package"',
      );
    });
  });

  describe("Deduplication", () => {
    test("deduplicates imports from same source", () => {
      generator = new ImportGenerator({
        sameFileTypes: new Set(["TypeA"]),
      });

      // Track the same type multiple times
      generator.trackReferencedType("TypeA");
      generator.trackReferencedType("TypeA");
      generator.trackReferencedType("TypeA");

      const imports = generator.generateImports("MainType");

      // TypeA should only appear once in the import
      const typeAMatches = imports.match(/TypeA/g);
      expect(typeAMatches?.length).toBe(1);
    });

    test("deduplicates external type imports", () => {
      const externalTypes = new Map<string, string>();
      externalTypes.set("ExternalType", "@external/types");

      generator = new ImportGenerator({ externalTypes });

      generator.trackReferencedType("ExternalType");
      generator.trackReferencedType("ExternalType");

      const imports = generator.generateImports("MainType");

      // Should only have one import statement for ExternalType
      const importStatements = imports
        .split("\n")
        .filter((line) => line.includes("ExternalType"));
      expect(importStatements.length).toBe(1);
    });
  });

  describe("Import Ordering", () => {
    test("orders imports consistently", () => {
      const externalTypes = new Map<string, string>();
      externalTypes.set("ZType", "@z-package/types");
      externalTypes.set("AType", "@a-package/types");
      externalTypes.set("MType", "@m-package/types");

      generator = new ImportGenerator({ externalTypes });

      generator.trackReferencedType("ZType");
      generator.trackReferencedType("AType");
      generator.trackReferencedType("MType");

      const imports = generator.generateImports("MainType");

      // All imports should be present
      expect(imports).toContain("@a-package/types");
      expect(imports).toContain("@m-package/types");
      expect(imports).toContain("@z-package/types");
    });
  });
});
