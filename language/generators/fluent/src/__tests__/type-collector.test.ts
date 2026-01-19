import { describe, test, expect, beforeEach } from "vitest";
import { setupTestEnv } from "@player-tools/test-utils";
import { TsConverter } from "@player-tools/xlr-converters";
import type { NamedType, ObjectType } from "@player-tools/xlr";
import { TypeCollector, type TypeTracker } from "../type-collector";

/** Custom primitives that should be treated as refs rather than resolved */
const CUSTOM_PRIMITIVES = ["Asset", "AssetWrapper", "Binding", "Expression"];

/**
 * Converts TypeScript source code to XLR types
 */
function convertTsToXLR(
  sourceCode: string,
  customPrimitives = CUSTOM_PRIMITIVES,
) {
  const { sf, tc } = setupTestEnv(sourceCode);
  const converter = new TsConverter(tc, customPrimitives);
  return converter.convertSourceFile(sf).data.types;
}

/**
 * Mock TypeTracker for testing
 */
class MockTypeTracker implements TypeTracker {
  readonly trackedTypes: string[] = [];
  readonly trackedNamespaces: string[] = [];

  trackReferencedType(typeName: string): void {
    this.trackedTypes.push(typeName);
  }

  trackNamespaceImport(namespaceName: string): void {
    this.trackedNamespaces.push(namespaceName);
  }
}

describe("TypeCollector", () => {
  let tracker: MockTypeTracker;
  let genericParamSymbols: Set<string>;
  let namespaceMemberMap: Map<string, string>;

  beforeEach(() => {
    tracker = new MockTypeTracker();
    genericParamSymbols = new Set<string>();
    namespaceMemberMap = new Map<string, string>();
  });

  function createCollector(mainTypeName: string): TypeCollector {
    return new TypeCollector(
      tracker,
      genericParamSymbols,
      mainTypeName,
      namespaceMemberMap,
    );
  }

  describe("collectGenericParamSymbols", () => {
    test("collects generic parameters from type definition", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface GenericAsset<T, U extends string = "default"> extends Asset<"generic"> {
          prop1?: T;
          prop2?: U;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "GenericAsset",
      ) as NamedType<ObjectType>;

      const collector = createCollector("GenericAsset");
      collector.collectGenericParamSymbols(asset);

      expect(genericParamSymbols.has("T")).toBe(true);
      expect(genericParamSymbols.has("U")).toBe(true);
    });

    test("does nothing for non-generic types", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface TextAsset extends Asset<"text"> {
          value: string;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "TextAsset",
      ) as NamedType<ObjectType>;

      const collector = createCollector("TextAsset");
      collector.collectGenericParamSymbols(asset);

      expect(genericParamSymbols.size).toBe(0);
    });
  });

  describe("collectReferencedTypes", () => {
    test("collects referenced named types", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface Metadata {
          beacon?: string;
        }

        export interface ActionAsset extends Asset<"action"> {
          value?: string;
          metaData?: Metadata;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "ActionAsset",
      ) as NamedType<ObjectType>;

      const collector = createCollector("ActionAsset");
      collector.collectReferencedTypes(asset);

      expect(tracker.trackedTypes).toContain("Metadata");
    });

    test("does not collect the main type itself", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface TextAsset extends Asset<"text"> {
          value: string;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "TextAsset",
      ) as NamedType<ObjectType>;

      const collector = createCollector("TextAsset");
      collector.collectReferencedTypes(asset);

      expect(tracker.trackedTypes).not.toContain("TextAsset");
    });

    test("does not collect built-in types", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface DataAsset extends Asset<"data"> {
          items?: Array<string>;
          mapping?: Record<string, number>;
          cache?: Map<string, object>;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "DataAsset",
      ) as NamedType<ObjectType>;

      const collector = createCollector("DataAsset");
      collector.collectReferencedTypes(asset);

      expect(tracker.trackedTypes).not.toContain("Array");
      expect(tracker.trackedTypes).not.toContain("Record");
      expect(tracker.trackedTypes).not.toContain("Map");
    });

    test("collects types from array element types", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface Item {
          name: string;
        }

        export interface CollectionAsset extends Asset<"collection"> {
          items?: Array<Item>;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "CollectionAsset",
      ) as NamedType<ObjectType>;

      const collector = createCollector("CollectionAsset");
      collector.collectReferencedTypes(asset);

      expect(tracker.trackedTypes).toContain("Item");
    });

    test("collects types from union types", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface TypeA {
          a: string;
        }

        export interface TypeB {
          b: number;
        }

        export interface UnionAsset extends Asset<"union"> {
          value?: TypeA | TypeB;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "UnionAsset",
      ) as NamedType<ObjectType>;

      const collector = createCollector("UnionAsset");
      collector.collectReferencedTypes(asset);

      expect(tracker.trackedTypes).toContain("TypeA");
      expect(tracker.trackedTypes).toContain("TypeB");
    });

    test("collects types from intersection types", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface BaseProps {
          name: string;
        }

        export interface ExtendedProps {
          description: string;
        }

        export interface IntersectionAsset extends Asset<"intersection"> {
          combined?: BaseProps & ExtendedProps;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "IntersectionAsset",
      ) as NamedType<ObjectType>;

      const collector = createCollector("IntersectionAsset");
      collector.collectReferencedTypes(asset);

      expect(tracker.trackedTypes).toContain("BaseProps");
      expect(tracker.trackedTypes).toContain("ExtendedProps");
    });

    test("does not collect generic parameters as types", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }
        type AssetWrapper<T extends Asset = Asset> = { asset: T };

        export interface GenericAsset<AnyAsset extends Asset = Asset> extends Asset<"generic"> {
          slot?: AssetWrapper<AnyAsset>;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "GenericAsset",
      ) as NamedType<ObjectType>;

      // First collect generic params
      const collector = createCollector("GenericAsset");
      collector.collectGenericParamSymbols(asset);

      // Then collect referenced types
      collector.collectReferencedTypes(asset);

      // AnyAsset should NOT be tracked since it's a generic param
      expect(tracker.trackedTypes).not.toContain("AnyAsset");
    });
  });

  describe("collectTypesFromGenericTokens", () => {
    test("collects types from generic constraints", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface Bar {
          value: string;
        }

        export interface GenericAsset<T extends Bar> extends Asset<"generic"> {
          data?: T;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "GenericAsset",
      ) as NamedType<ObjectType>;

      const collector = createCollector("GenericAsset");
      collector.collectGenericParamSymbols(asset);
      collector.collectTypesFromGenericTokens(asset);

      expect(tracker.trackedTypes).toContain("Bar");
    });

    test("collects types from generic defaults", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface DefaultType {
          value: string;
        }

        export interface GenericAsset<T = DefaultType> extends Asset<"generic"> {
          data?: T;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "GenericAsset",
      ) as NamedType<ObjectType>;

      const collector = createCollector("GenericAsset");
      collector.collectGenericParamSymbols(asset);
      collector.collectTypesFromGenericTokens(asset);

      expect(tracker.trackedTypes).toContain("DefaultType");
    });

    test("collects nested types from generic constraints", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }
        type AssetWrapper<T extends Asset = Asset> = { asset: T };

        export interface ListItemNoHelp<AnyAsset extends Asset = Asset>
          extends AssetWrapper<AnyAsset> {}

        export interface ListItem<AnyAsset extends Asset = Asset>
          extends ListItemNoHelp<AnyAsset> {
          help?: { id: string; };
        }

        export interface ListAsset<
          AnyAsset extends Asset = Asset,
          ItemType extends ListItemNoHelp<AnyAsset> = ListItem<AnyAsset>
        > extends Asset<"list"> {
          values?: Array<ItemType>;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "ListAsset",
      ) as NamedType<ObjectType>;

      const collector = createCollector("ListAsset");
      collector.collectGenericParamSymbols(asset);
      collector.collectTypesFromGenericTokens(asset);

      expect(tracker.trackedTypes).toContain("ListItemNoHelp");
      expect(tracker.trackedTypes).toContain("ListItem");
      // AnyAsset should NOT be tracked since it's a generic param
      expect(tracker.trackedTypes).not.toContain("AnyAsset");
    });
  });

  describe("Namespaced Types", () => {
    test("tracks namespace for namespaced types via collectReferencedTypesFromNode", () => {
      // Test the internal method directly with a namespaced ref
      // because TypeScript namespaces may not be fully preserved through XLR conversion
      const collector = createCollector("InputAsset");

      // Manually invoke the collector with a node that has a namespaced ref
      const namedType: NamedType<ObjectType> = {
        type: "object",
        name: "InputAsset",
        properties: {
          validation: {
            required: false,
            node: { type: "ref", ref: "Validation.CrossfieldReference" },
          },
        },
      };

      collector.collectReferencedTypes(namedType);

      expect(tracker.trackedNamespaces).toContain("Validation");
      expect(namespaceMemberMap.get("CrossfieldReference")).toBe(
        "Validation.CrossfieldReference",
      );
    });
  });
});
