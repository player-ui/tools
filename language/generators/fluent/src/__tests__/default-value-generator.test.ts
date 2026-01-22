import { describe, test, expect } from "vitest";
import type { ObjectType } from "@player-tools/xlr";
import { DefaultValueGenerator } from "../default-value-generator";

describe("DefaultValueGenerator", () => {
  const generator = new DefaultValueGenerator();

  describe("Asset Type Defaults", () => {
    test("adds asset type default", () => {
      const objectType: ObjectType = {
        type: "object",
        properties: {},
        extends: { type: "ref", ref: "Asset<'text'>" },
      };

      const defaults = generator.generateDefaults(objectType, "text");
      expect(defaults).toEqual({ type: "text", id: "" });
    });

    test("adds id default for Asset extensions", () => {
      const objectType: ObjectType = {
        type: "object",
        properties: {},
        extends: { type: "ref", ref: "Asset<'button'>" },
      };

      const defaults = generator.generateDefaults(objectType);
      expect(defaults).toEqual({ id: "" });
    });

    test("adds id default for types with id property", () => {
      const objectType: ObjectType = {
        type: "object",
        properties: {
          id: { required: true, node: { type: "string" } },
        },
      };

      const defaults = generator.generateDefaults(objectType);
      expect(defaults).toEqual({ id: "" });
    });
  });

  describe("Primitive Defaults", () => {
    test("generates string default", () => {
      const objectType: ObjectType = {
        type: "object",
        properties: {
          name: { required: true, node: { type: "string" } },
        },
      };

      const defaults = generator.generateDefaults(objectType);
      expect(defaults).toEqual({ name: "" });
    });

    test("generates number default", () => {
      const objectType: ObjectType = {
        type: "object",
        properties: {
          count: { required: true, node: { type: "number" } },
        },
      };

      const defaults = generator.generateDefaults(objectType);
      expect(defaults).toEqual({ count: 0 });
    });

    test("generates boolean default", () => {
      const objectType: ObjectType = {
        type: "object",
        properties: {
          enabled: { required: true, node: { type: "boolean" } },
        },
      };

      const defaults = generator.generateDefaults(objectType);
      expect(defaults).toEqual({ enabled: false });
    });

    test("preserves const values", () => {
      const objectType: ObjectType = {
        type: "object",
        properties: {
          status: { required: true, node: { type: "string", const: "active" } },
        },
      };

      const defaults = generator.generateDefaults(objectType);
      expect(defaults).toEqual({ status: "active" });
    });
  });

  describe("Expression and Binding Defaults", () => {
    test("generates Expression default", () => {
      const objectType: ObjectType = {
        type: "object",
        properties: {
          exp: { required: true, node: { type: "ref", ref: "Expression" } },
        },
      };

      const defaults = generator.generateDefaults(objectType);
      expect(defaults).toEqual({ exp: "" });
    });

    test("generates Binding default", () => {
      const objectType: ObjectType = {
        type: "object",
        properties: {
          binding: { required: true, node: { type: "ref", ref: "Binding" } },
        },
      };

      const defaults = generator.generateDefaults(objectType);
      expect(defaults).toEqual({ binding: "" });
    });
  });

  describe("Array Defaults", () => {
    test("generates array default", () => {
      const objectType: ObjectType = {
        type: "object",
        properties: {
          items: {
            required: true,
            node: { type: "array", elementType: { type: "string" } },
          },
        },
      };

      const defaults = generator.generateDefaults(objectType);
      expect(defaults).toEqual({ items: [] });
    });
  });

  describe("Union Type Defaults", () => {
    test("picks first non-null variant for union", () => {
      const objectType: ObjectType = {
        type: "object",
        properties: {
          value: {
            required: true,
            node: {
              type: "or",
              or: [{ type: "null" }, { type: "string" }],
            },
          },
        },
      };

      const defaults = generator.generateDefaults(objectType);
      expect(defaults).toEqual({ value: "" });
    });

    test("skips null and undefined variants", () => {
      const objectType: ObjectType = {
        type: "object",
        properties: {
          value: {
            required: true,
            node: {
              type: "or",
              or: [{ type: "null" }, { type: "undefined" }, { type: "number" }],
            },
          },
        },
      };

      const defaults = generator.generateDefaults(objectType);
      expect(defaults).toEqual({ value: 0 });
    });
  });

  describe("Object Type Defaults", () => {
    test("generates defaults for nested required properties", () => {
      const objectType: ObjectType = {
        type: "object",
        properties: {
          config: {
            required: true,
            node: {
              type: "object",
              properties: {
                name: { required: true, node: { type: "string" } },
                count: { required: true, node: { type: "number" } },
              },
            },
          },
        },
      };

      const defaults = generator.generateDefaults(objectType);
      expect(defaults).toEqual({ config: { name: "", count: 0 } });
    });

    test("respects depth limit for recursive objects", () => {
      const generator3 = new DefaultValueGenerator({ maxDepth: 3 });

      // Create a deeply nested structure
      const objectType: ObjectType = {
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
                                  deep: {
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

      const defaults = generator3.generateDefaults(objectType);
      // At maxDepth=3, level4 should be {} (depth limit reached)
      expect(defaults).toEqual({
        level1: { level2: { level3: { level4: {} } } },
      });
    });
  });

  describe("AssetWrapper Skipping", () => {
    test("skips AssetWrapper properties", () => {
      const objectType: ObjectType = {
        type: "object",
        properties: {
          name: { required: true, node: { type: "string" } },
          slot: {
            required: true,
            node: { type: "ref", ref: "AssetWrapper" },
          },
        },
      };

      const defaults = generator.generateDefaults(objectType);
      // AssetWrapper should be skipped - user must provide
      expect(defaults).toEqual({ name: "" });
      expect("slot" in defaults).toBe(false);
    });

    test("skips Asset properties", () => {
      const objectType: ObjectType = {
        type: "object",
        properties: {
          name: { required: true, node: { type: "string" } },
          asset: { required: true, node: { type: "ref", ref: "Asset" } },
        },
      };

      const defaults = generator.generateDefaults(objectType);
      expect(defaults).toEqual({ name: "" });
      expect("asset" in defaults).toBe(false);
    });

    test("skips AssetWrapper with generic", () => {
      const objectType: ObjectType = {
        type: "object",
        properties: {
          icon: {
            required: true,
            node: { type: "ref", ref: "AssetWrapper<ImageAsset>" },
          },
        },
      };

      const defaults = generator.generateDefaults(objectType);
      expect("icon" in defaults).toBe(false);
    });
  });

  describe("Optional Properties", () => {
    test("does not generate defaults for optional properties", () => {
      const objectType: ObjectType = {
        type: "object",
        properties: {
          requiredProp: { required: true, node: { type: "string" } },
          optionalProp: { required: false, node: { type: "string" } },
        },
      };

      const defaults = generator.generateDefaults(objectType);
      expect(defaults).toEqual({ requiredProp: "" });
      expect("optionalProp" in defaults).toBe(false);
    });
  });

  describe("Ref Types", () => {
    test("generates empty object for unknown ref types", () => {
      const objectType: ObjectType = {
        type: "object",
        properties: {
          config: {
            required: true,
            node: { type: "ref", ref: "CustomConfig" },
          },
        },
      };

      const defaults = generator.generateDefaults(objectType);
      expect(defaults).toEqual({ config: {} });
    });
  });

  describe("Intersection Types", () => {
    test("merges defaults for intersection types", () => {
      const objectType: ObjectType = {
        type: "object",
        properties: {
          combined: {
            required: true,
            node: {
              type: "and",
              and: [
                {
                  type: "object",
                  properties: {
                    name: { required: true, node: { type: "string" } },
                  },
                },
                {
                  type: "object",
                  properties: {
                    count: { required: true, node: { type: "number" } },
                  },
                },
              ],
            },
          },
        },
      };

      const defaults = generator.generateDefaults(objectType);
      expect(defaults).toEqual({ combined: { name: "", count: 0 } });
    });
  });
});
