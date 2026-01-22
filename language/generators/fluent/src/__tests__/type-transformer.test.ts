import { describe, test, expect, beforeEach } from "vitest";
import type { NodeType } from "@player-tools/xlr";
import {
  TypeTransformer,
  type TypeTransformContext,
} from "../type-transformer";

/**
 * Mock implementation of TypeTransformContext for testing
 */
class MockTypeTransformContext implements TypeTransformContext {
  private needsAssetImport = false;
  private readonly namespaceMemberMap = new Map<string, string>();
  private readonly genericParamSymbols = new Set<string>();
  readonly trackedTypes: string[] = [];
  readonly trackedNamespaces: string[] = [];

  setNeedsAssetImport(value: boolean): void {
    this.needsAssetImport = value;
  }

  getNeedsAssetImport(): boolean {
    return this.needsAssetImport;
  }

  trackReferencedType(typeName: string): void {
    this.trackedTypes.push(typeName);
  }

  trackNamespaceImport(namespaceName: string): void {
    this.trackedNamespaces.push(namespaceName);
  }

  getNamespaceMemberMap(): Map<string, string> {
    return this.namespaceMemberMap;
  }

  getGenericParamSymbols(): Set<string> {
    return this.genericParamSymbols;
  }

  addGenericParam(symbol: string): void {
    this.genericParamSymbols.add(symbol);
  }

  addNamespaceMapping(member: string, fullName: string): void {
    this.namespaceMemberMap.set(member, fullName);
  }
}

describe("TypeTransformer", () => {
  let context: MockTypeTransformContext;
  let transformer: TypeTransformer;

  beforeEach(() => {
    context = new MockTypeTransformContext();
    transformer = new TypeTransformer(context);
  });

  describe("Primitive Types", () => {
    test("transforms string type", () => {
      const node: NodeType = { type: "string" };
      expect(transformer.transformType(node, false)).toBe("string");
      expect(transformer.transformType(node, true)).toBe(
        "string | TaggedTemplateValue<string>",
      );
    });

    test("transforms number type", () => {
      const node: NodeType = { type: "number" };
      expect(transformer.transformType(node, false)).toBe("number");
      expect(transformer.transformType(node, true)).toBe(
        "number | TaggedTemplateValue<number>",
      );
    });

    test("transforms boolean type", () => {
      const node: NodeType = { type: "boolean" };
      expect(transformer.transformType(node, false)).toBe("boolean");
      expect(transformer.transformType(node, true)).toBe(
        "boolean | TaggedTemplateValue<boolean>",
      );
    });

    test("transforms string const type", () => {
      const node: NodeType = { type: "string", const: "hello" };
      expect(transformer.transformType(node, false)).toBe('"hello"');
      expect(transformer.transformType(node, true)).toBe('"hello"');
    });

    test("transforms number const type", () => {
      const node: NodeType = { type: "number", const: 42 };
      expect(transformer.transformType(node, false)).toBe("42");
      expect(transformer.transformType(node, true)).toBe("42");
    });

    test("transforms boolean const type", () => {
      const node: NodeType = { type: "boolean", const: true };
      expect(transformer.transformType(node, false)).toBe("true");
      expect(transformer.transformType(node, true)).toBe("true");
    });
  });

  describe("Special Types", () => {
    test("transforms null type", () => {
      const node: NodeType = { type: "null" };
      expect(transformer.transformType(node, false)).toBe("null");
    });

    test("transforms undefined type", () => {
      const node: NodeType = { type: "undefined" };
      expect(transformer.transformType(node, false)).toBe("undefined");
    });

    test("transforms any type", () => {
      const node: NodeType = { type: "any" };
      expect(transformer.transformType(node, false)).toBe("any");
    });

    test("transforms unknown type", () => {
      const node: NodeType = { type: "unknown" };
      expect(transformer.transformType(node, false)).toBe("unknown");
    });

    test("transforms never type", () => {
      const node: NodeType = { type: "never" };
      expect(transformer.transformType(node, false)).toBe("never");
    });

    test("transforms void type", () => {
      const node: NodeType = { type: "void" };
      expect(transformer.transformType(node, false)).toBe("void");
    });
  });

  describe("Ref Types", () => {
    test("transforms AssetWrapper ref to Asset | FluentBuilder", () => {
      const node: NodeType = { type: "ref", ref: "AssetWrapper" };
      const result = transformer.transformType(node, false);
      expect(result).toBe("Asset | FluentBuilder<Asset, BaseBuildContext>");
      expect(context.getNeedsAssetImport()).toBe(true);
    });

    test("transforms AssetWrapper with generic arguments preserving the type", () => {
      const node: NodeType = {
        type: "ref",
        ref: "AssetWrapper",
        genericArguments: [{ type: "ref", ref: "ImageAsset" }],
      };
      const result = transformer.transformType(node, false);
      expect(result).toBe(
        "ImageAsset | FluentBuilder<ImageAsset, BaseBuildContext>",
      );
      expect(context.getNeedsAssetImport()).toBe(true);
      expect(context.trackedTypes).toContain("ImageAsset");
    });

    test("transforms AssetWrapper with embedded generic in ref string", () => {
      const node: NodeType = { type: "ref", ref: "AssetWrapper<TextAsset>" };
      const result = transformer.transformType(node, false);
      expect(result).toBe(
        "TextAsset | FluentBuilder<TextAsset, BaseBuildContext>",
      );
      expect(context.getNeedsAssetImport()).toBe(true);
      expect(context.trackedTypes).toContain("TextAsset");
    });

    test("transforms AssetWrapper with embedded intersection in ref string", () => {
      const node: NodeType = {
        type: "ref",
        ref: "AssetWrapper<ImageAsset & Trackable>",
      };
      const result = transformer.transformType(node, false);
      expect(result).toBe(
        "ImageAsset & Trackable | FluentBuilder<ImageAsset & Trackable, BaseBuildContext>",
      );
      expect(context.getNeedsAssetImport()).toBe(true);
      // Each part of the intersection should be tracked separately for imports
      expect(context.trackedTypes).toContain("ImageAsset");
      expect(context.trackedTypes).toContain("Trackable");
      // The combined string should NOT be tracked
      expect(context.trackedTypes).not.toContain("ImageAsset & Trackable");
    });

    test("transforms AssetWrapper with generic param falls back to Asset", () => {
      context.addGenericParam("AnyAsset");
      const node: NodeType = {
        type: "ref",
        ref: "AssetWrapper",
        genericArguments: [{ type: "ref", ref: "AnyAsset" }],
      };
      const result = transformer.transformType(node, false);
      // Should fall back to Asset because AnyAsset is a generic param
      expect(result).toBe("Asset | FluentBuilder<Asset, BaseBuildContext>");
      expect(context.getNeedsAssetImport()).toBe(true);
      // Should NOT track AnyAsset as a type to import
      expect(context.trackedTypes).not.toContain("AnyAsset");
    });

    test("transforms AssetWrapper with intersection generic argument and tracks parts separately", () => {
      const node: NodeType = {
        type: "ref",
        ref: "AssetWrapper",
        genericArguments: [
          {
            type: "and",
            and: [
              { type: "ref", ref: "ImageAsset" },
              { type: "ref", ref: "Trackable" },
            ],
          },
        ],
      };
      const result = transformer.transformType(node, false);
      expect(result).toBe(
        "ImageAsset & Trackable | FluentBuilder<ImageAsset & Trackable, BaseBuildContext>",
      );
      expect(context.getNeedsAssetImport()).toBe(true);
      // Each part of the intersection should be tracked separately
      expect(context.trackedTypes).toContain("ImageAsset");
      expect(context.trackedTypes).toContain("Trackable");
      // The intersection string itself should NOT be tracked
      expect(context.trackedTypes).not.toContain("ImageAsset & Trackable");
    });

    test("does not double-track intersection type parts", () => {
      const node: NodeType = {
        type: "ref",
        ref: "AssetWrapper",
        genericArguments: [
          {
            type: "and",
            and: [
              { type: "ref", ref: "ImageAsset" },
              { type: "ref", ref: "Trackable" },
            ],
          },
        ],
      };
      transformer.transformType(node, false);
      // Each type should be tracked exactly once, not twice
      const imageAssetCount = context.trackedTypes.filter(
        (t) => t === "ImageAsset",
      ).length;
      const trackableCount = context.trackedTypes.filter(
        (t) => t === "Trackable",
      ).length;
      expect(imageAssetCount).toBe(1);
      expect(trackableCount).toBe(1);
    });

    test("handles intersection with Asset type (skips Asset in tracking)", () => {
      const node: NodeType = {
        type: "ref",
        ref: "AssetWrapper",
        genericArguments: [
          {
            type: "and",
            and: [
              { type: "ref", ref: "AnyAsset" },
              { type: "ref", ref: "Asset" },
            ],
          },
        ],
      };
      context.addGenericParam("AnyAsset");
      transformer.transformType(node, false);
      // Asset should not be tracked (it's special-cased)
      // AnyAsset should not be tracked (it's a generic param)
      expect(context.trackedTypes).not.toContain("Asset");
      expect(context.trackedTypes).not.toContain("AnyAsset");
    });

    test("handles intersection with generic param (skips generic params in tracking)", () => {
      context.addGenericParam("T");
      const node: NodeType = {
        type: "ref",
        ref: "AssetWrapper",
        genericArguments: [
          {
            type: "and",
            and: [
              { type: "ref", ref: "T" },
              { type: "ref", ref: "Mixin" },
            ],
          },
        ],
      };
      transformer.transformType(node, false);
      // T should not be tracked (it's a generic param)
      expect(context.trackedTypes).not.toContain("T");
      // Mixin should be tracked
      expect(context.trackedTypes).toContain("Mixin");
    });

    test("handles three-way intersection in genericArguments", () => {
      const node: NodeType = {
        type: "ref",
        ref: "AssetWrapper",
        genericArguments: [
          {
            type: "and",
            and: [
              { type: "ref", ref: "TypeA" },
              { type: "ref", ref: "TypeB" },
              { type: "ref", ref: "TypeC" },
            ],
          },
        ],
      };
      const result = transformer.transformType(node, false);
      expect(result).toBe(
        "TypeA & TypeB & TypeC | FluentBuilder<TypeA & TypeB & TypeC, BaseBuildContext>",
      );
      expect(context.trackedTypes).toContain("TypeA");
      expect(context.trackedTypes).toContain("TypeB");
      expect(context.trackedTypes).toContain("TypeC");
    });

    test("handles three-way intersection in embedded ref string", () => {
      const node: NodeType = {
        type: "ref",
        ref: "AssetWrapper<TypeA & TypeB & TypeC>",
      };
      const result = transformer.transformType(node, false);
      expect(result).toBe(
        "TypeA & TypeB & TypeC | FluentBuilder<TypeA & TypeB & TypeC, BaseBuildContext>",
      );
      expect(context.trackedTypes).toContain("TypeA");
      expect(context.trackedTypes).toContain("TypeB");
      expect(context.trackedTypes).toContain("TypeC");
      expect(context.trackedTypes).not.toContain("TypeA & TypeB & TypeC");
    });

    test("transforms Expression ref to string with TaggedTemplateValue", () => {
      const node: NodeType = { type: "ref", ref: "Expression" };
      expect(transformer.transformType(node, false)).toBe("string");
      expect(transformer.transformType(node, true)).toBe(
        "string | TaggedTemplateValue<string>",
      );
    });

    test("transforms Binding ref to string with TaggedTemplateValue", () => {
      const node: NodeType = { type: "ref", ref: "Binding" };
      expect(transformer.transformType(node, false)).toBe("string");
      expect(transformer.transformType(node, true)).toBe(
        "string | TaggedTemplateValue<string>",
      );
    });

    test("transforms Asset ref", () => {
      const node: NodeType = { type: "ref", ref: "Asset" };
      const result = transformer.transformType(node, false);
      expect(result).toBe("Asset");
      expect(context.getNeedsAssetImport()).toBe(true);
    });

    test("transforms custom ref type with FluentBuilder", () => {
      const node: NodeType = { type: "ref", ref: "CustomType" };
      const result = transformer.transformType(node, false);
      expect(result).toBe(
        "CustomType | FluentBuilder<CustomType, BaseBuildContext> | FluentPartial<CustomType, BaseBuildContext>",
      );
    });

    test("transforms ref with generic arguments", () => {
      const node: NodeType = {
        type: "ref",
        ref: "Container",
        genericArguments: [{ type: "string" }],
      };
      const result = transformer.transformType(node, true);
      expect(result).toBe(
        "Container<string | TaggedTemplateValue<string>> | FluentBuilder<Container<string | TaggedTemplateValue<string>>, BaseBuildContext> | FluentPartial<Container<string | TaggedTemplateValue<string>>, BaseBuildContext>",
      );
    });

    test("transforms ref with embedded generics", () => {
      const node: NodeType = { type: "ref", ref: "SimpleModifier<'format'>" };
      const result = transformer.transformType(node, false);
      expect(result).toBe(
        "SimpleModifier<'format'> | FluentBuilder<SimpleModifier<'format'>, BaseBuildContext> | FluentPartial<SimpleModifier<'format'>, BaseBuildContext>",
      );
    });
  });

  describe("Array Types", () => {
    test("transforms array of primitives", () => {
      const node: NodeType = {
        type: "array",
        elementType: { type: "string" },
      };
      const result = transformer.transformType(node, true);
      expect(result).toBe("Array<string | TaggedTemplateValue<string>>");
    });

    test("transforms array of refs", () => {
      const node: NodeType = {
        type: "array",
        elementType: { type: "ref", ref: "Asset" },
      };
      const result = transformer.transformType(node, false);
      expect(result).toBe("Array<Asset>");
    });
  });

  describe("Record Types", () => {
    test("transforms Record type", () => {
      const node: NodeType = {
        type: "record",
        keyType: { type: "string" },
        valueType: { type: "number" },
      };
      const result = transformer.transformType(node, true);
      // Key type should NOT have TaggedTemplateValue
      expect(result).toBe(
        "Record<string, number | TaggedTemplateValue<number>>",
      );
    });
  });

  describe("Union Types (Or)", () => {
    test("transforms union of primitives", () => {
      const node: NodeType = {
        type: "or",
        or: [{ type: "string" }, { type: "number" }],
      };
      const result = transformer.transformType(node, true);
      expect(result).toBe(
        "string | TaggedTemplateValue<string> | number | TaggedTemplateValue<number>",
      );
    });

    test("transforms union of string literals", () => {
      const node: NodeType = {
        type: "or",
        or: [
          { type: "string", const: "small" },
          { type: "string", const: "medium" },
          { type: "string", const: "large" },
        ],
      };
      const result = transformer.transformType(node, false);
      expect(result).toBe('"small" | "medium" | "large"');
    });
  });

  describe("Intersection Types (And)", () => {
    test("transforms intersection of types", () => {
      const node: NodeType = {
        type: "and",
        and: [
          { type: "ref", ref: "BaseProps" },
          { type: "ref", ref: "ExtendedProps" },
        ],
      };
      const result = transformer.transformType(node, false);
      expect(result).toContain("BaseProps");
      expect(result).toContain("ExtendedProps");
      expect(result).toContain("&");
    });
  });

  describe("Object Types", () => {
    test("transforms anonymous object type with properties", () => {
      const node: NodeType = {
        type: "object",
        properties: {
          name: { required: true, node: { type: "string" } },
        },
      };
      const result = transformer.transformType(node, false);
      expect(result).toContain("name: string");
      expect(result).toContain("FluentBuilder");
    });

    test("transforms anonymous object type", () => {
      const node: NodeType = {
        type: "object",
        properties: {
          name: { required: true, node: { type: "string" } },
          count: { required: false, node: { type: "number" } },
        },
      };
      const result = transformer.transformType(node, true);
      expect(result).toContain("name: string | TaggedTemplateValue<string>");
      expect(result).toContain("count?: number | TaggedTemplateValue<number>");
      expect(result).toContain("| FluentBuilder<{");
    });
  });

  describe("transformTypeForConstraint", () => {
    test("returns raw type without FluentBuilder for constraints", () => {
      const node: NodeType = { type: "ref", ref: "Bar" };
      const result = transformer.transformTypeForConstraint(node);
      expect(result).toBe("Bar");
      expect(result).not.toContain("FluentBuilder");
    });

    test("handles generic ref in constraints", () => {
      const node: NodeType = {
        type: "ref",
        ref: "ListItemNoHelp",
        genericArguments: [{ type: "ref", ref: "AnyAsset" }],
      };
      const result = transformer.transformTypeForConstraint(node);
      expect(result).toBe("ListItemNoHelp<AnyAsset>");
      expect(result).not.toContain("FluentBuilder");
    });

    test("handles Asset type in constraints", () => {
      const node: NodeType = { type: "ref", ref: "Asset" };
      const result = transformer.transformTypeForConstraint(node);
      expect(result).toBe("Asset");
      expect(context.getNeedsAssetImport()).toBe(true);
    });

    test("handles object type in constraints", () => {
      const node: NodeType = {
        type: "object",
        properties: {
          value: { required: true, node: { type: "number" } },
        },
      };
      const result = transformer.transformTypeForConstraint(node);
      // Anonymous objects in constraints still get inline treatment
      expect(result).toContain("value: number");
    });

    test("handles array type in constraints", () => {
      const node: NodeType = {
        type: "array",
        elementType: { type: "ref", ref: "Item" },
      };
      const result = transformer.transformTypeForConstraint(node);
      expect(result).toBe("Array<Item>");
    });

    test("handles union type in constraints", () => {
      const node: NodeType = {
        type: "or",
        or: [
          { type: "ref", ref: "TypeA" },
          { type: "ref", ref: "TypeB" },
        ],
      };
      const result = transformer.transformTypeForConstraint(node);
      expect(result).toBe("TypeA | TypeB");
    });
  });

  describe("FluentPartial Support for Nested Builders", () => {
    test("includes FluentPartial for named object types", () => {
      // Named types use ref, not object with name property
      const node: NodeType = { type: "ref", ref: "Foo" };
      const result = transformer.transformType(node, false);
      expect(result).toBe(
        "Foo | FluentBuilder<Foo, BaseBuildContext> | FluentPartial<Foo, BaseBuildContext>",
      );
    });

    test("includes FluentPartial for anonymous object types", () => {
      const node: NodeType = {
        type: "object",
        properties: {
          value: { required: true, node: { type: "string" } },
        },
      };
      const result = transformer.transformType(node, false);
      expect(result).toContain(
        "| FluentPartial<{ value: string }, BaseBuildContext>",
      );
    });

    test("includes FluentPartial for ref types", () => {
      const node: NodeType = { type: "ref", ref: "CustomType" };
      const result = transformer.transformType(node, false);
      expect(result).toBe(
        "CustomType | FluentBuilder<CustomType, BaseBuildContext> | FluentPartial<CustomType, BaseBuildContext>",
      );
    });

    test("includes FluentPartial for ref types with generic arguments", () => {
      const node: NodeType = {
        type: "ref",
        ref: "Container",
        genericArguments: [{ type: "string" }],
      };
      const result = transformer.transformType(node, true);
      expect(result).toContain(
        "| FluentPartial<Container<string | TaggedTemplateValue<string>>, BaseBuildContext>",
      );
    });

    test("includes FluentPartial for ref types with embedded generics", () => {
      const node: NodeType = { type: "ref", ref: "SimpleModifier<'format'>" };
      const result = transformer.transformType(node, false);
      expect(result).toBe(
        "SimpleModifier<'format'> | FluentBuilder<SimpleModifier<'format'>, BaseBuildContext> | FluentPartial<SimpleModifier<'format'>, BaseBuildContext>",
      );
    });

    test("does not include FluentPartial for AssetWrapper (unwrapped to Asset)", () => {
      const node: NodeType = { type: "ref", ref: "AssetWrapper" };
      const result = transformer.transformType(node, false);
      // AssetWrapper is unwrapped to Asset | FluentBuilder<Asset>, no FluentPartial
      expect(result).toBe("Asset | FluentBuilder<Asset, BaseBuildContext>");
      expect(result).not.toContain("FluentPartial");
    });
  });

  describe("Namespace Type Resolution", () => {
    test("resolves namespaced type member to full qualified name", () => {
      context.addNamespaceMapping(
        "CrossfieldReference",
        "Validation.CrossfieldReference",
      );

      const node: NodeType = { type: "ref", ref: "CrossfieldReference" };
      const result = transformer.transformType(node, false);
      expect(result).toContain("Validation.CrossfieldReference");
    });
  });

  describe("Generic Parameter Tracking", () => {
    test("does not track generic parameters as types to import", () => {
      context.addGenericParam("T");
      context.addGenericParam("AnyAsset");

      const node: NodeType = { type: "ref", ref: "AnyAsset" };
      transformer.transformTypeForConstraint(node);

      // AnyAsset should not be tracked since it's a generic param
      expect(context.trackedTypes).not.toContain("AnyAsset");
    });

    test("tracks non-generic-param types for import", () => {
      const node: NodeType = { type: "ref", ref: "CustomType" };
      transformer.transformTypeForConstraint(node);

      expect(context.trackedTypes).toContain("CustomType");
    });
  });

  describe("Property Name Quoting", () => {
    test("quotes property names with special characters", () => {
      const node: NodeType = {
        type: "object",
        properties: {
          "mime-type": { required: true, node: { type: "string" } },
          normalProp: { required: true, node: { type: "string" } },
        },
      };
      const result = transformer.generateInlineObjectType(node, false);
      expect(result).toContain('"mime-type"');
      expect(result).not.toContain('"normalProp"');
      expect(result).toContain("normalProp:");
    });

    test("quotes property names with dots", () => {
      const node: NodeType = {
        type: "object",
        properties: {
          "data.path": { required: true, node: { type: "string" } },
        },
      };
      const result = transformer.generateInlineObjectType(node, false);
      expect(result).toContain('"data.path"');
    });

    test("quotes property names with spaces", () => {
      const node: NodeType = {
        type: "object",
        properties: {
          "my property": { required: true, node: { type: "string" } },
        },
      };
      const result = transformer.generateInlineObjectType(node, false);
      expect(result).toContain('"my property"');
    });

    test("does not quote reserved words (valid in TypeScript)", () => {
      const node: NodeType = {
        type: "object",
        properties: {
          class: { required: true, node: { type: "string" } },
          default: { required: false, node: { type: "number" } },
        },
      };
      const result = transformer.generateInlineObjectType(node, false);
      // Reserved words are valid property names in TypeScript without quotes
      expect(result).toContain("class:");
      expect(result).toContain("default?:");
      expect(result).not.toContain('"class"');
      expect(result).not.toContain('"default"');
    });
  });

  describe("Generic Parameter Handling (Edge Cases)", () => {
    test("handles generic with extends constraint", () => {
      context.addGenericParam("T");

      const node: NodeType = { type: "ref", ref: "T" };
      const result = transformer.transformTypeForConstraint(node);

      // T is a generic param, should return as-is
      expect(result).toBe("T");
      expect(context.trackedTypes).not.toContain("T");
    });

    test("handles generic with extends and default", () => {
      context.addGenericParam("T");
      context.addGenericParam("U");

      const node: NodeType = {
        type: "ref",
        ref: "Container",
        genericArguments: [
          { type: "ref", ref: "T" },
          { type: "ref", ref: "U" },
        ],
      };
      const result = transformer.transformTypeForConstraint(node);

      expect(result).toBe("Container<T, U>");
      expect(context.trackedTypes).not.toContain("T");
      expect(context.trackedTypes).not.toContain("U");
      expect(context.trackedTypes).toContain("Container");
    });

    test("handles Record with generic param value type in constraints", () => {
      context.addGenericParam("T");
      context.addGenericParam("U");

      const node: NodeType = {
        type: "record",
        keyType: { type: "string" },
        valueType: { type: "ref", ref: "U" },
      };
      const result = transformer.transformTypeForConstraint(node);

      // Record falls through to transformType which adds FluentBuilder and FluentPartial union for ref types
      expect(result).toBe(
        "Record<string, U | FluentBuilder<U, BaseBuildContext> | FluentPartial<U, BaseBuildContext>>",
      );
    });

    test("deduplicates identical generic parameters", () => {
      context.addGenericParam("T");

      // Using T in multiple places
      const node: NodeType = {
        type: "or",
        or: [
          { type: "ref", ref: "T" },
          { type: "array", elementType: { type: "ref", ref: "T" } },
        ],
      };
      const result = transformer.transformTypeForConstraint(node);

      expect(result).toContain("T");
    });
  });

  describe("Deeply Nested Object Types", () => {
    test("handles deeply nested object types (5+ levels)", () => {
      const node: NodeType = {
        type: "object",
        properties: {
          level1: {
            required: true,
            node: {
              type: "object",
              properties: {
                level2: {
                  required: true,
                  node: {
                    type: "object",
                    properties: {
                      level3: {
                        required: true,
                        node: {
                          type: "object",
                          properties: {
                            level4: {
                              required: true,
                              node: {
                                type: "object",
                                properties: {
                                  level5: {
                                    required: true,
                                    node: { type: "string" },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const result = transformer.generateInlineObjectType(node, false);
      expect(result).toContain("level1:");
      expect(result).toContain("level2:");
      expect(result).toContain("level3:");
      expect(result).toContain("level4:");
      expect(result).toContain("level5:");
      expect(result).toContain("string");
    });
  });

  describe("Tuple Types", () => {
    test("transforms basic tuple type", () => {
      const node: NodeType = {
        type: "tuple",
        elementTypes: [
          { type: { type: "string" } },
          { type: { type: "number" } },
          { type: { type: "boolean" } },
        ],
        minItems: 3,
        additionalItems: false,
      };
      const result = transformer.transformType(node, false);
      expect(result).toBe("[string, number, boolean]");
    });

    test("transforms tuple type with TaggedTemplateValue", () => {
      const node: NodeType = {
        type: "tuple",
        elementTypes: [
          { type: { type: "string" } },
          { type: { type: "number" } },
        ],
        minItems: 2,
        additionalItems: false,
      };
      const result = transformer.transformType(node, true);
      expect(result).toBe(
        "[string | TaggedTemplateValue<string>, number | TaggedTemplateValue<number>]",
      );
    });

    test("transforms tuple type with optional elements", () => {
      const node: NodeType = {
        type: "tuple",
        elementTypes: [
          { type: { type: "string" } },
          { type: { type: "number" }, optional: true },
          { type: { type: "boolean" }, optional: true },
        ],
        minItems: 1,
        additionalItems: false,
      };
      const result = transformer.transformType(node, false);
      expect(result).toBe("[string, number?, boolean?]");
    });

    test("transforms tuple type with rest element", () => {
      const node: NodeType = {
        type: "tuple",
        elementTypes: [
          { type: { type: "string" } },
          { type: { type: "number" } },
        ],
        minItems: 2,
        additionalItems: { type: "boolean" },
      };
      const result = transformer.transformType(node, false);
      expect(result).toBe("[string, number, ...boolean[]]");
    });

    test("transforms tuple type with ref elements", () => {
      const node: NodeType = {
        type: "tuple",
        elementTypes: [
          { type: { type: "ref", ref: "Asset" } },
          { type: { type: "ref", ref: "CustomType" } },
        ],
        minItems: 2,
        additionalItems: false,
      };
      const result = transformer.transformType(node, false);
      expect(result).toBe(
        "[Asset, CustomType | FluentBuilder<CustomType, BaseBuildContext> | FluentPartial<CustomType, BaseBuildContext>]",
      );
      expect(context.getNeedsAssetImport()).toBe(true);
    });

    test("transformTypeForConstraint handles tuple types", () => {
      const node: NodeType = {
        type: "tuple",
        elementTypes: [
          { type: { type: "string" } },
          { type: { type: "ref", ref: "Item" } },
        ],
        minItems: 2,
        additionalItems: false,
      };
      const result = transformer.transformTypeForConstraint(node);
      // Constraints should not have FluentBuilder unions
      expect(result).toBe("[string, Item]");
    });
  });

  describe("Object additionalProperties Handling", () => {
    test("ignores additionalProperties in object types", () => {
      // additionalProperties (index signatures) are not supported in inline object generation
      const node: NodeType = {
        type: "object",
        properties: {
          name: { required: true, node: { type: "string" } },
        },
        additionalProperties: { type: "string" },
      };

      const result = transformer.generateInlineObjectType(node, false);
      // Only explicit properties are included, additionalProperties is ignored
      expect(result).toContain("name: string");
      expect(result).not.toContain("[key:");
    });
  });
});
