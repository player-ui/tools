import { describe, test, expect, beforeEach } from "vitest";
import { setupTestEnv } from "@player-tools/test-utils";
import { TsConverter } from "@player-tools/xlr-converters";
import type { NamedType, ObjectType, RefType } from "@player-tools/xlr";
import {
  BuilderClassGenerator,
  type BuilderInfo,
} from "../builder-class-generator";
import {
  TypeTransformer,
  type TypeTransformContext,
} from "../type-transformer";
import {
  toBuilderClassName,
  toFactoryName,
  getAssetTypeFromExtends,
} from "../utils";

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
 * Mock TypeTransformContext for testing
 */
class MockTypeTransformContext implements TypeTransformContext {
  private needsAssetImport = false;
  private readonly namespaceMemberMap = new Map<string, string>();
  private readonly genericParamSymbols = new Set<string>();

  setNeedsAssetImport(value: boolean): void {
    this.needsAssetImport = value;
  }

  getNeedsAssetImport(): boolean {
    return this.needsAssetImport;
  }

  trackReferencedType(_typeName: string): void {
    // No-op for tests
  }

  trackNamespaceImport(_namespaceName: string): void {
    // No-op for tests
  }

  getNamespaceMemberMap(): Map<string, string> {
    return this.namespaceMemberMap;
  }

  getGenericParamSymbols(): Set<string> {
    return this.genericParamSymbols;
  }

  getAssetWrapperExtendsRef(_typeName: string): RefType | undefined {
    return undefined;
  }
}

/**
 * Creates a BuilderInfo from an XLR NamedType
 */
function createBuilderInfo(namedType: NamedType<ObjectType>): BuilderInfo {
  const assetType = getAssetTypeFromExtends(namedType);
  return {
    name: namedType.name,
    className: toBuilderClassName(namedType.name),
    factoryName: toFactoryName(namedType.name),
    objectType: namedType,
    assetType,
    genericParams: undefined,
    isAsset: !!assetType,
  };
}

describe("BuilderClassGenerator", () => {
  let context: MockTypeTransformContext;
  let transformer: TypeTransformer;
  let generator: BuilderClassGenerator;

  beforeEach(() => {
    context = new MockTypeTransformContext();
    transformer = new TypeTransformer(context);
    generator = new BuilderClassGenerator(transformer);
  });

  describe("Basic Builder Generation", () => {
    test("generates builder class with correct name", () => {
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
      const info = createBuilderInfo(asset);

      const code = generator.generateBuilderClass(info);

      expect(code).toContain("export class TextAssetBuilder");
      expect(code).toContain("TextAssetBuilderMethods");
    });

    test("generates factory function", () => {
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
      const info = createBuilderInfo(asset);

      const code = generator.generateBuilderClass(info);

      expect(code).toContain("export function text(");
      expect(code).toContain("return new TextAssetBuilder(initial)");
    });

    test("generates methods for properties", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface TextAsset extends Asset<"text"> {
          value: string;
          label?: string;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "TextAsset",
      ) as NamedType<ObjectType>;
      const info = createBuilderInfo(asset);

      const code = generator.generateBuilderClass(info);

      expect(code).toContain("withValue(value:");
      expect(code).toContain("withLabel(value:");
    });
  });

  describe("Asset Type Defaults", () => {
    test("includes type default for assets", () => {
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
      const info = createBuilderInfo(asset);

      const code = generator.generateBuilderClass(info);

      expect(code).toContain('"type":"text"');
    });

    test("includes id default for assets", () => {
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
      const info = createBuilderInfo(asset);

      const code = generator.generateBuilderClass(info);

      expect(code).toContain('"id":""');
    });

    test("includes const property defaults", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface ButtonAsset extends Asset<"button"> {
          variant: "primary";
          label: string;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "ButtonAsset",
      ) as NamedType<ObjectType>;
      const info = createBuilderInfo(asset);

      const code = generator.generateBuilderClass(info);

      expect(code).toContain('"variant":"primary"');
    });
  });

  describe("Array Properties", () => {
    test("generates __arrayProperties__ for array properties", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }
        type AssetWrapper<T extends Asset = Asset> = { asset: T };

        export interface CollectionAsset extends Asset<"collection"> {
          values: Array<AssetWrapper<Asset>>;
          label?: AssetWrapper<Asset>;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "CollectionAsset",
      ) as NamedType<ObjectType>;
      const info = createBuilderInfo(asset);

      const code = generator.generateBuilderClass(info);

      expect(code).toContain("__arrayProperties__");
      expect(code).toContain('"values"');
      // label is not an array, should not be in __arrayProperties__
      expect(code).not.toMatch(/__arrayProperties__.*"label"/);
    });

    test("does not generate __arrayProperties__ when no arrays", () => {
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
      const info = createBuilderInfo(asset);

      const code = generator.generateBuilderClass(info);

      expect(code).not.toContain("__arrayProperties__");
    });

    test("detects arrays in union types", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface ActionAsset extends Asset<"action"> {
          validate?: Array<string> | string;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "ActionAsset",
      ) as NamedType<ObjectType>;
      const info = createBuilderInfo(asset);

      const code = generator.generateBuilderClass(info);

      expect(code).toContain("__arrayProperties__");
      expect(code).toContain('"validate"');
    });

    test("generates __arrayProperties__ with all array property names", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }
        type AssetWrapper<T extends Asset = Asset> = { asset: T };

        export interface CollectionAsset extends Asset<"collection"> {
          values: Array<AssetWrapper<Asset>>;
          actions: Array<AssetWrapper<Asset>>;
          items: Array<string>;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "CollectionAsset",
      ) as NamedType<ObjectType>;
      const info = createBuilderInfo(asset);

      const code = generator.generateBuilderClass(info);

      expect(code).toContain("__arrayProperties__");
      expect(code).toContain('"values"');
      expect(code).toContain('"actions"');
      expect(code).toContain('"items"');
    });

    test("handles properties with union types containing arrays", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface FlexibleAsset extends Asset<"flexible"> {
          data?: string | number | Array<string>;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "FlexibleAsset",
      ) as NamedType<ObjectType>;
      const info = createBuilderInfo(asset);

      const code = generator.generateBuilderClass(info);

      // Should detect array within the union
      expect(code).toContain("__arrayProperties__");
      expect(code).toContain('"data"');
    });
  });

  describe("Generic Class Generation", () => {
    test("generates class with constrained generic parameters", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        interface ConstraintType {
          name: string;
        }

        export interface ConstrainedAsset<T extends ConstraintType = ConstraintType> extends Asset<"constrained"> {
          data: T;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "ConstrainedAsset",
      ) as NamedType<ObjectType>;
      const info: BuilderInfo = {
        ...createBuilderInfo(asset),
        genericParams: "T extends ConstraintType = ConstraintType",
      };

      const code = generator.generateBuilderClass(info);

      expect(code).toContain(
        "export class ConstrainedAssetBuilder<T extends ConstraintType = ConstraintType>",
      );
    });

    test("generates interface with generic parameters", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface ParameterizedAsset<T, U extends string = "default"> extends Asset<"param"> {
          first?: T;
          second?: U;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "ParameterizedAsset",
      ) as NamedType<ObjectType>;
      const info: BuilderInfo = {
        ...createBuilderInfo(asset),
        genericParams: 'T, U extends string = "default"',
      };

      const code = generator.generateBuilderClass(info);

      expect(code).toContain(
        'export interface ParameterizedAssetBuilderMethods<T, U extends string = "default">',
      );
      expect(code).toContain(
        'export function parameterized<T, U extends string = "default">(',
      );
    });
  });

  describe("Interface Methods", () => {
    test("generates interface with method signatures", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface TextAsset extends Asset<"text"> {
          value: string;
          count?: number;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "TextAsset",
      ) as NamedType<ObjectType>;
      const info = createBuilderInfo(asset);

      const code = generator.generateBuilderClass(info);

      expect(code).toContain("export interface TextAssetBuilderMethods");
      expect(code).toContain("withValue(value:");
      expect(code).toContain("withCount(value:");
    });
  });

  describe("Build Method", () => {
    test("generates build method with correct return type", () => {
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
      const info = createBuilderInfo(asset);

      const code = generator.generateBuilderClass(info);

      expect(code).toContain("build(context?: BaseBuildContext): TextAsset");
      expect(code).toContain(
        "return this.buildWithDefaults(TextAssetBuilder.defaults, context)",
      );
    });
  });

  describe("Inspect Method", () => {
    test("generates inspect method for debugging", () => {
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
      const info = createBuilderInfo(asset);

      const code = generator.generateBuilderClass(info);

      expect(code).toContain('[Symbol.for("nodejs.util.inspect.custom")]');
      expect(code).toContain('createInspectMethod("TextAssetBuilder"');
    });
  });

  describe("Generic Types", () => {
    test("generates generic builder class", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface GenericAsset<T extends string = string> extends Asset<"generic"> {
          value?: T;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "GenericAsset",
      ) as NamedType<ObjectType>;
      const info: BuilderInfo = {
        ...createBuilderInfo(asset),
        genericParams: "T extends string = string",
      };

      const code = generator.generateBuilderClass(info);

      expect(code).toContain(
        "export class GenericAssetBuilder<T extends string = string>",
      );
      expect(code).toContain(
        "export interface GenericAssetBuilderMethods<T extends string = string>",
      );
      expect(code).toContain(
        "export function generic<T extends string = string>(",
      );
    });
  });

  describe("Inherited Properties", () => {
    test("adds id property for assets without explicit id", () => {
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
      const info = createBuilderInfo(asset);

      const code = generator.generateBuilderClass(info);

      expect(code).toContain("withId(value:");
    });
  });

  describe("Non-Asset Types", () => {
    test("generates builder for non-Asset type", () => {
      const source = `
        export interface Metadata {
          beacon?: string;
          role?: string;
        }
      `;

      const types = convertTsToXLR(source);
      const metadata = types.find(
        (t) => t.name === "Metadata",
      ) as NamedType<ObjectType>;
      const info = createBuilderInfo(metadata);

      const code = generator.generateBuilderClass(info);

      expect(code).toContain("export class MetadataBuilder");
      expect(code).toContain("export function metadata(");
      expect(code).toContain("withBeacon(value:");
      expect(code).toContain("withRole(value:");
    });

    test("adds id default for non-Asset types with id property", () => {
      const source = `
        export interface Item {
          id: string;
          name: string;
        }
      `;

      const types = convertTsToXLR(source);
      const item = types.find(
        (t) => t.name === "Item",
      ) as NamedType<ObjectType>;
      const info = createBuilderInfo(item);

      const code = generator.generateBuilderClass(info);

      expect(code).toContain('"id":""');
    });
  });
});
