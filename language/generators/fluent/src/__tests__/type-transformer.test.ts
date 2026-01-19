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
        "CustomType | FluentBuilder<CustomType, BaseBuildContext>",
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
        "Container<string | TaggedTemplateValue<string>> | FluentBuilder<Container<string | TaggedTemplateValue<string>>, BaseBuildContext>",
      );
    });

    test("transforms ref with embedded generics", () => {
      const node: NodeType = { type: "ref", ref: "SimpleModifier<'format'>" };
      const result = transformer.transformType(node, false);
      expect(result).toBe(
        "SimpleModifier<'format'> | FluentBuilder<SimpleModifier<'format'>, BaseBuildContext>",
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
  });
});
