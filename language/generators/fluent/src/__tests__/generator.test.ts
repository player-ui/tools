import { describe, test, expect, vi } from "vitest";
import { setupTestEnv } from "@player-tools/test-utils";
import { TsConverter } from "@player-tools/xlr-converters";
import type { NamedType, ObjectType } from "@player-tools/xlr";
import { generateFluentBuilder, type GeneratorConfig } from "../generator";
import type { TypeRegistry } from "../utils";
import { FluentBuilderBase } from "@player-tools/fluent";

/** Custom primitives that should be treated as refs rather than resolved */
const CUSTOM_PRIMITIVES = ["Asset", "AssetWrapper", "Binding", "Expression"];

vi.setConfig({
  testTimeout: 2 * 60 * 1000,
});

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

describe("FluentBuilderGenerator", () => {
  describe("Basic Types", () => {
    test("generates builder for simple asset with string property", () => {
      const source = `
        interface Asset<T extends string> {
          id: string;
          type: T;
        }

        export interface TextAsset extends Asset<"text"> {
          value: string;
        }
      `;

      const types = convertTsToXLR(source);
      const textAsset = types.find(
        (t) => t.name === "TextAsset",
      ) as NamedType<ObjectType>;
      expect(textAsset).toBeDefined();

      const code = generateFluentBuilder(textAsset);
      expect(code).toMatchSnapshot();
    });

    test("generates builder for asset with optional properties", () => {
      const source = `
        interface Asset<T extends string> {
          id: string;
          type: T;
        }

        export interface InputAsset extends Asset<"input"> {
          binding: string;
          label?: string;
          placeholder?: string;
        }
      `;

      const types = convertTsToXLR(source);
      const inputAsset = types.find(
        (t) => t.name === "InputAsset",
      ) as NamedType<ObjectType>;
      expect(inputAsset).toBeDefined();

      const code = generateFluentBuilder(inputAsset);
      expect(code).toMatchSnapshot();
    });

    test("generates builder for asset with number and boolean properties", () => {
      const source = `
        interface Asset<T extends string> {
          id: string;
          type: T;
        }

        export interface CounterAsset extends Asset<"counter"> {
          value: number;
          min?: number;
          max?: number;
          enabled?: boolean;
        }
      `;

      const types = convertTsToXLR(source);
      const counterAsset = types.find(
        (t) => t.name === "CounterAsset",
      ) as NamedType<ObjectType>;
      expect(counterAsset).toBeDefined();

      const code = generateFluentBuilder(counterAsset);
      expect(code).toMatchSnapshot();
    });
  });

  describe("Asset Wrapper (Slot) Types", () => {
    test("generates builder for asset with AssetWrapper slots", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }
        type AssetWrapper<T extends Asset = Asset> = { asset: T };

        export interface InfoAsset extends Asset<"info"> {
          title?: AssetWrapper<Asset>;
          subtitle?: AssetWrapper<Asset>;
          primaryInfo: Array<AssetWrapper<Asset>>;
        }
      `;

      const types = convertTsToXLR(source);
      const infoAsset = types.find(
        (t) => t.name === "InfoAsset",
      ) as NamedType<ObjectType>;
      expect(infoAsset).toBeDefined();

      const code = generateFluentBuilder(infoAsset);
      expect(code).toMatchSnapshot();
    });

    test("generates builder for asset with array of AssetWrapper slots", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }
        type AssetWrapper<T extends Asset = Asset> = { asset: T };

        export interface CollectionAsset extends Asset<"collection"> {
          label?: AssetWrapper<Asset>;
          values?: Array<AssetWrapper<Asset>>;
        }
      `;

      const types = convertTsToXLR(source);
      const collectionAsset = types.find(
        (t) => t.name === "CollectionAsset",
      ) as NamedType<ObjectType>;
      expect(collectionAsset).toBeDefined();

      const code = generateFluentBuilder(collectionAsset);
      expect(code).toMatchSnapshot();
    });
  });

  describe("Binding and Expression Types", () => {
    test("generates builder for asset with Binding property", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }
        type Binding = string;

        export interface InputAsset extends Asset<"input"> {
          binding: Binding;
          label?: string;
        }
      `;

      const types = convertTsToXLR(source);
      const inputAsset = types.find(
        (t) => t.name === "InputAsset",
      ) as NamedType<ObjectType>;
      expect(inputAsset).toBeDefined();

      const code = generateFluentBuilder(inputAsset);
      expect(code).toMatchSnapshot();
    });

    test("generates builder for asset with Expression property", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }
        type Expression = string;

        export interface ActionAsset extends Asset<"action"> {
          value?: string;
          exp?: Expression;
        }
      `;

      const types = convertTsToXLR(source);
      const actionAsset = types.find(
        (t) => t.name === "ActionAsset",
      ) as NamedType<ObjectType>;
      expect(actionAsset).toBeDefined();

      const code = generateFluentBuilder(actionAsset);
      expect(code).toMatchSnapshot();
    });
  });

  describe("Nested Object Types", () => {
    test("generates builder for asset with nested object property", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface ActionAsset extends Asset<"action"> {
          value?: string;
          confirmation?: {
            message: string;
            affirmativeLabel: string;
            negativeLabel?: string;
          };
        }
      `;

      const types = convertTsToXLR(source);
      const actionAsset = types.find(
        (t) => t.name === "ActionAsset",
      ) as NamedType<ObjectType>;
      expect(actionAsset).toBeDefined();

      const code = generateFluentBuilder(actionAsset);
      expect(code).toMatchSnapshot();
    });

    test("generates builder for asset with named nested type", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }
        type AssetWrapper<T extends Asset = Asset> = { asset: T };

        export interface ActionMetaData {
          beacon?: string | Record<string, unknown>;
          role?: "primary" | "secondary" | "link";
          skipValidation?: boolean;
        }

        export interface ActionAsset extends Asset<"action"> {
          value?: string;
          label?: AssetWrapper<Asset>;
          metaData?: ActionMetaData;
        }
      `;

      const types = convertTsToXLR(source);
      const actionAsset = types.find(
        (t) => t.name === "ActionAsset",
      ) as NamedType<ObjectType>;
      expect(actionAsset).toBeDefined();

      const code = generateFluentBuilder(actionAsset);
      expect(code).toMatchSnapshot();
    });
  });

  describe("Union Types", () => {
    test("generates builder for asset with union property", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface ActionAsset extends Asset<"action"> {
          size?: "small" | "medium" | "large";
        }
      `;

      const types = convertTsToXLR(source);
      const actionAsset = types.find(
        (t) => t.name === "ActionAsset",
      ) as NamedType<ObjectType>;
      expect(actionAsset).toBeDefined();

      const code = generateFluentBuilder(actionAsset);
      expect(code).toMatchSnapshot();
    });

    test("generates builder for asset with discriminated union modifiers", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        interface CalloutModifier {
          type: "callout";
          value: "support" | "legal";
        }

        interface TagModifier {
          type: "tag";
          value: "block";
        }

        export interface CollectionAsset extends Asset<"collection"> {
          modifiers?: Array<CalloutModifier | TagModifier>;
        }
      `;

      const types = convertTsToXLR(source);
      const collectionAsset = types.find(
        (t) => t.name === "CollectionAsset",
      ) as NamedType<ObjectType>;
      expect(collectionAsset).toBeDefined();

      const code = generateFluentBuilder(collectionAsset);
      expect(code).toMatchSnapshot();
    });
  });

  describe("Array Types", () => {
    test("generates builder for asset with array of primitives", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }
        type Binding = string;

        export interface ActionAsset extends Asset<"action"> {
          validate?: Array<Binding> | Binding;
        }
      `;

      const types = convertTsToXLR(source);
      const actionAsset = types.find(
        (t) => t.name === "ActionAsset",
      ) as NamedType<ObjectType>;
      expect(actionAsset).toBeDefined();

      const code = generateFluentBuilder(actionAsset);
      expect(code).toMatchSnapshot();
    });

    test("generates builder for asset with array of complex objects", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }
        type AssetWrapper<T extends Asset = Asset> = { asset: T };

        export interface ChoiceItem {
          id: string;
          label?: AssetWrapper<Asset>;
          value?: string | number | boolean | null;
        }

        export interface ChoiceAsset extends Asset<"choice"> {
          binding: string;
          choices?: Array<ChoiceItem>;
        }
      `;

      const types = convertTsToXLR(source);
      const choiceAsset = types.find(
        (t) => t.name === "ChoiceAsset",
      ) as NamedType<ObjectType>;
      expect(choiceAsset).toBeDefined();

      const code = generateFluentBuilder(choiceAsset);
      expect(code).toMatchSnapshot();
    });

    test("generates builder for non-Asset type with complex properties", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }
        type AssetWrapper<T extends Asset = Asset> = { asset: T };

        export interface ChoiceItem {
          id: string;
          label?: AssetWrapper<Asset>;
          value?: string | number | boolean | null;
        }
      `;

      const types = convertTsToXLR(source);
      const choiceItem = types.find(
        (t) => t.name === "ChoiceItem",
      ) as NamedType<ObjectType>;
      expect(choiceItem).toBeDefined();

      const code = generateFluentBuilder(choiceItem);
      expect(code).toMatchSnapshot();
    });
  });

  describe("Generic Types", () => {
    test("generates builder for asset with generic parameter", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }
        type AssetWrapper<T extends Asset = Asset> = { asset: T };

        export interface InputAsset<AnyTextAsset extends Asset = Asset> extends Asset<"input"> {
          binding: string;
          label?: AssetWrapper<AnyTextAsset>;
          note?: AssetWrapper<AnyTextAsset>;
        }
      `;

      const types = convertTsToXLR(source);
      const inputAsset = types.find(
        (t) => t.name === "InputAsset",
      ) as NamedType<ObjectType>;
      expect(inputAsset).toBeDefined();

      const code = generateFluentBuilder(inputAsset);
      expect(code).toMatchSnapshot();
    });
  });
});

describe("Improvements over old fluent-gen-ts", () => {
  test("string properties accept TaggedTemplateValue for binding support", () => {
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
    const textAsset = types.find(
      (t) => t.name === "TextAsset",
    ) as NamedType<ObjectType>;
    const code = generateFluentBuilder(textAsset);

    // New generator adds TaggedTemplateValue support - OLD generator did NOT
    expect(code).toContain(
      "withValue(value: string | TaggedTemplateValue<string>)",
    );
    // Verify we don't just have plain string
    expect(code).not.toMatch(/withValue\(value: string\):/);
  });

  test("AssetWrapper slots accept Asset | FluentBuilder instead of AssetWrapper", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type AssetWrapper<T extends Asset = Asset> = { asset: T };

      export interface ActionAsset extends Asset<"action"> {
        label?: AssetWrapper<Asset>;
      }
    `;

    const types = convertTsToXLR(source);
    const actionAsset = types.find(
      (t) => t.name === "ActionAsset",
    ) as NamedType<ObjectType>;
    const code = generateFluentBuilder(actionAsset);

    // New generator uses Asset | FluentBuilder<Asset> - OLD generator incorrectly used AssetWrapper
    expect(code).toContain("Asset | FluentBuilder<Asset, BaseBuildContext>");
    // Verify we don't use AssetWrapper (which was the bug)
    expect(code).not.toContain("FluentBuilder<AssetWrapper");
  });

  test("Binding properties accept TaggedTemplateValue", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type Binding = string;

      export interface InputAsset extends Asset<"input"> {
        binding: Binding;
      }
    `;

    const types = convertTsToXLR(source);
    const inputAsset = types.find(
      (t) => t.name === "InputAsset",
    ) as NamedType<ObjectType>;
    const code = generateFluentBuilder(inputAsset);

    // Bindings should accept TaggedTemplateValue
    expect(code).toContain(
      "withBinding(value: string | TaggedTemplateValue<string>)",
    );
  });

  test("Expression properties accept TaggedTemplateValue", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type Expression = string;

      export interface ActionAsset extends Asset<"action"> {
        exp?: Expression;
      }
    `;

    const types = convertTsToXLR(source);
    const actionAsset = types.find(
      (t) => t.name === "ActionAsset",
    ) as NamedType<ObjectType>;
    const code = generateFluentBuilder(actionAsset);

    // Expressions should accept TaggedTemplateValue
    expect(code).toContain(
      "withExp(value: string | TaggedTemplateValue<string>)",
    );
  });
});

describe("Integration with Complex Type Patterns", () => {
  test("generates builder for TextAsset", () => {
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
    const textAsset = types.find(
      (t) => t.name === "TextAsset",
    ) as NamedType<ObjectType>;

    const code = generateFluentBuilder(textAsset);

    // Verify it has the expected parts
    expect(code).toContain("TextAssetBuilder");
    expect(code).toContain("withValue");
    expect(code).toContain("string | TaggedTemplateValue<string>");
    // Smart defaults now include required primitive fields
    expect(code).toContain(
      'defaults: Record<string, unknown> = {"type":"text","id":"","value":""}',
    );
  });

  test("generates builder for InfoAsset", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type AssetWrapper<T extends Asset = Asset> = { asset: T };

      export interface InfoAsset extends Asset<"info"> {
        primaryInfo: Array<AssetWrapper<Asset>>;
        title?: AssetWrapper<Asset>;
        subtitle?: AssetWrapper<Asset>;
      }
    `;

    const types = convertTsToXLR(source);
    const infoAsset = types.find(
      (t) => t.name === "InfoAsset",
    ) as NamedType<ObjectType>;

    const code = generateFluentBuilder(infoAsset);

    // Verify it has the expected parts
    expect(code).toContain("InfoAssetBuilder");
    expect(code).toContain("withPrimaryInfo");
    expect(code).toContain("withTitle");
    expect(code).toContain("withSubtitle");
    expect(code).toContain("Asset | FluentBuilder<Asset, BaseBuildContext>");
    expect(code).toContain("__arrayProperties__");
    expect(code).toContain('"primaryInfo"');
  });

  test("generates builder for InputAsset", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type AssetWrapper<T extends Asset = Asset> = { asset: T };

      export interface InputAsset extends Asset<"input"> {
        binding: string;
        label: AssetWrapper<Asset>;
        placeholder?: string;
      }
    `;

    const types = convertTsToXLR(source);
    const inputAsset = types.find(
      (t) => t.name === "InputAsset",
    ) as NamedType<ObjectType>;

    const code = generateFluentBuilder(inputAsset);

    // Verify it has the expected parts
    expect(code).toContain("InputAssetBuilder");
    expect(code).toContain("withBinding");
    expect(code).toContain("withLabel");
    expect(code).toContain("withPlaceholder");
    expect(code).toContain("Asset | FluentBuilder<Asset, BaseBuildContext>");
  });
});

describe("__arrayProperties__ generation", () => {
  test("generates __arrayProperties__ for types with array properties", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type AssetWrapper<T extends Asset = Asset> = { asset: T };

      export interface CollectionAsset extends Asset<"collection"> {
        values: Array<AssetWrapper<Asset>>;
        actions?: Array<AssetWrapper<Asset>>;
        label?: AssetWrapper<Asset>;
        modifiers?: Array<{ type: string }>;
      }
    `;

    const types = convertTsToXLR(source);
    const collectionAsset = types.find(
      (t) => t.name === "CollectionAsset",
    ) as NamedType<ObjectType>;

    const code = generateFluentBuilder(collectionAsset);

    // Must have __arrayProperties__ static property
    expect(code).toContain("__arrayProperties__");
    expect(code).toContain("ReadonlySet<string>");

    // Must include the array properties
    expect(code).toContain('"values"');
    expect(code).toContain('"actions"');
    expect(code).toContain('"modifiers"');

    // Non-array properties should NOT be in __arrayProperties__
    expect(code).not.toMatch(/__arrayProperties__.*"label"/);
  });

  test("does not generate __arrayProperties__ when no array properties exist", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }

      export interface TextAsset extends Asset<"text"> {
        value: string;
        optional?: string;
      }
    `;

    const types = convertTsToXLR(source);
    const textAsset = types.find(
      (t) => t.name === "TextAsset",
    ) as NamedType<ObjectType>;

    const code = generateFluentBuilder(textAsset);

    // Should NOT have __arrayProperties__ since there are no arrays
    expect(code).not.toContain("__arrayProperties__");
  });

  test("array detection works with union types containing arrays", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type Binding = string;

      export interface ActionAsset extends Asset<"action"> {
        value?: string;
        validate?: Array<Binding> | Binding;
      }
    `;

    const types = convertTsToXLR(source);
    const actionAsset = types.find(
      (t) => t.name === "ActionAsset",
    ) as NamedType<ObjectType>;

    const code = generateFluentBuilder(actionAsset);

    // validate is Array | string, the Array variant should still be detected
    expect(code).toContain("__arrayProperties__");
    expect(code).toContain('"validate"');
  });
});

describe("Generator configuration", () => {
  test("supports custom fluent import path", () => {
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
    const textAsset = types.find(
      (t) => t.name === "TextAsset",
    ) as NamedType<ObjectType>;

    const config: GeneratorConfig = {
      fluentImportPath: "../../../gen/common.js",
    };

    const code = generateFluentBuilder(textAsset, config);

    expect(code).toContain('from "../../../gen/common.js"');
    expect(code).not.toContain('from "@player-tools/fluent"');
  });

  test("supports custom types import path", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type AssetWrapper<T extends Asset = Asset> = { asset: T };

      export interface ActionAsset extends Asset<"action"> {
        label?: AssetWrapper<Asset>;
      }
    `;

    const types = convertTsToXLR(source);
    const actionAsset = types.find(
      (t) => t.name === "ActionAsset",
    ) as NamedType<ObjectType>;

    const config: GeneratorConfig = {
      typesImportPath: "../custom-types.js",
    };

    const code = generateFluentBuilder(actionAsset, config);

    expect(code).toContain('from "../custom-types.js"');
    expect(code).not.toContain('from "@player-ui/types"');
  });

  test("supports custom type import path generator", () => {
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
    const textAsset = types.find(
      (t) => t.name === "TextAsset",
    ) as NamedType<ObjectType>;

    const config: GeneratorConfig = {
      typeImportPathGenerator: (typeName) =>
        `../types/${typeName.toLowerCase()}.js`,
    };

    const code = generateFluentBuilder(textAsset, config);

    expect(code).toContain('from "../types/textasset.js"');
  });
});

describe("End-to-end: TypeScript → XLR → Builder → Built Object", () => {
  /**
   * This e2e test validates the entire pipeline:
   * 1. TypeScript interface definition
   * 2. Conversion to XLR via TsConverter
   * 3. Builder generation via FluentBuilderGenerator
   * 4. Builder execution to produce an object
   * 5. Verification that the object matches the original interface structure
   */
  test("generates working builder for simple asset", () => {
    // Step 1: Define TypeScript interface
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }

      export interface TextAsset extends Asset<"text"> {
        value: string;
      }
    `;

    // Step 2: Convert to XLR
    const types = convertTsToXLR(source);
    const textAsset = types.find(
      (t) => t.name === "TextAsset",
    ) as NamedType<ObjectType>;
    expect(textAsset).toBeDefined();

    // Step 3: Generate builder code
    const code = generateFluentBuilder(textAsset);

    // Step 4: Verify the generated code structure
    // The generated builder should have defaults for id, type, and required primitive fields
    expect(code).toContain(
      'defaults: Record<string, unknown> = {"type":"text","id":"","value":""}',
    );
    // Should have withValue method that accepts TaggedTemplateValue
    expect(code).toContain(
      "withValue(value: string | TaggedTemplateValue<string>)",
    );
    // Should have proper build method
    expect(code).toContain("build(context?: BaseBuildContext): TextAsset");

    // Step 5: Verify the built object structure (by parsing the generated code)
    // The defaults object shows what fields the builder produces
    const defaultsMatch = code.match(
      /defaults: Record<string, unknown> = ({[^}]+})/,
    );
    expect(defaultsMatch).toBeTruthy();
    const defaults = JSON.parse(defaultsMatch![1]);
    // Smart defaults now include required primitive fields
    expect(defaults).toEqual({ type: "text", id: "", value: "" });
  });

  test("generates working builder for asset with slots", () => {
    // Step 1: Define TypeScript interface with AssetWrapper slots
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type AssetWrapper<T extends Asset = Asset> = { asset: T };

      export interface ActionAsset extends Asset<"action"> {
        value?: string;
        label?: AssetWrapper<Asset>;
      }
    `;

    // Step 2: Convert to XLR
    const types = convertTsToXLR(source);
    const actionAsset = types.find(
      (t) => t.name === "ActionAsset",
    ) as NamedType<ObjectType>;
    expect(actionAsset).toBeDefined();

    // Step 3: Generate builder code
    const code = generateFluentBuilder(actionAsset);

    // Step 4: Verify slot handling
    // The label slot should accept Asset | FluentBuilder, not AssetWrapper
    expect(code).toContain(
      "withLabel(value: Asset | FluentBuilder<Asset, BaseBuildContext>)",
    );
    // Should NOT have AssetWrapper in the parameter type
    expect(code).not.toContain("FluentBuilder<AssetWrapper");
  });

  test("generates working builder for asset with array properties", () => {
    // Step 1: Define TypeScript interface with array properties
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type AssetWrapper<T extends Asset = Asset> = { asset: T };

      export interface CollectionAsset extends Asset<"collection"> {
        values?: Array<AssetWrapper<Asset>>;
        actions?: Array<AssetWrapper<Asset>>;
        label?: AssetWrapper<Asset>;
      }
    `;

    // Step 2: Convert to XLR
    const types = convertTsToXLR(source);
    const collectionAsset = types.find(
      (t) => t.name === "CollectionAsset",
    ) as NamedType<ObjectType>;
    expect(collectionAsset).toBeDefined();

    // Step 3: Generate builder code
    const code = generateFluentBuilder(collectionAsset);

    // Step 4: Verify __arrayProperties__ is generated correctly
    expect(code).toContain("__arrayProperties__");
    expect(code).toContain('"values"');
    expect(code).toContain('"actions"');

    // Step 5: Verify array properties are correctly identified
    // The __arrayProperties__ line should include values and actions, but not label
    const arrayPropsMatch = code.match(
      /__arrayProperties__.*new Set\(\[([^\]]+)\]\)/,
    );
    expect(arrayPropsMatch).toBeTruthy();
    const arrayPropsContent = arrayPropsMatch![1];
    expect(arrayPropsContent).toContain('"values"');
    expect(arrayPropsContent).toContain('"actions"');
    expect(arrayPropsContent).not.toContain('"label"');
  });

  test("generates working builder for asset with nested objects", () => {
    // Step 1: Define TypeScript interface with nested object
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }

      export interface ActionAsset extends Asset<"action"> {
        value?: string;
        confirmation?: {
          message: string;
          affirmativeLabel: string;
          negativeLabel?: string;
        };
      }
    `;

    // Step 2: Convert to XLR
    const types = convertTsToXLR(source);
    const actionAsset = types.find(
      (t) => t.name === "ActionAsset",
    ) as NamedType<ObjectType>;
    expect(actionAsset).toBeDefined();

    // Step 3: Generate builder code
    const code = generateFluentBuilder(actionAsset);

    // Step 4: Verify nested object handling
    // The confirmation property should have inline type with TaggedTemplateValue support
    expect(code).toContain("withConfirmation");
    expect(code).toContain("message: string | TaggedTemplateValue<string>");
    expect(code).toContain(
      "affirmativeLabel: string | TaggedTemplateValue<string>",
    );
    expect(code).toContain(
      "negativeLabel?: string | TaggedTemplateValue<string>",
    );

    // Step 5: Verify complex nested objects accept both raw objects AND FluentBuilder
    // Complex nested objects (3+ properties) should accept FluentBuilder alternative
    expect(code).toContain("FluentBuilder<{");
    expect(code).toContain("}, BaseBuildContext>");
  });

  test("generates working builder for generic asset", () => {
    // Step 1: Define TypeScript interface with generic parameter
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type AssetWrapper<T extends Asset = Asset> = { asset: T };

      export interface InputAsset<AnyTextAsset extends Asset = Asset> extends Asset<"input"> {
        binding: string;
        label?: AssetWrapper<AnyTextAsset>;
      }
    `;

    // Step 2: Convert to XLR
    const types = convertTsToXLR(source);
    const inputAsset = types.find(
      (t) => t.name === "InputAsset",
    ) as NamedType<ObjectType>;
    expect(inputAsset).toBeDefined();

    // Step 3: Generate builder code
    const code = generateFluentBuilder(inputAsset);

    // Step 4: Verify generic parameter handling
    expect(code).toContain("InputAssetBuilder<AnyTextAsset extends Asset");
    expect(code).toContain("export function input<AnyTextAsset extends Asset");
  });
});

describe("Edge Cases", () => {
  test("handles special types: null, undefined, any, unknown, never, void", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }

      export interface SpecialTypesAsset extends Asset<"special"> {
        nullValue: null;
        undefinedValue: undefined;
        anyValue: any;
        unknownValue: unknown;
        neverValue: never;
        voidValue: void;
      }
    `;

    const types = convertTsToXLR(source);
    const specialAsset = types.find(
      (t) => t.name === "SpecialTypesAsset",
    ) as NamedType<ObjectType>;
    expect(specialAsset).toBeDefined();

    const code = generateFluentBuilder(specialAsset);

    expect(code).toContain("withNullValue(value: null)");
    expect(code).toContain("withUndefinedValue(value: undefined)");
    expect(code).toContain("withAnyValue(value: any)");
    expect(code).toContain("withUnknownValue(value: unknown)");
    expect(code).toContain("withNeverValue(value: never)");
    expect(code).toContain("withVoidValue(value: void)");
  });

  test("handles intersection types (AndType)", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }

      interface BaseProps {
        name: string;
      }

      interface ExtendedProps {
        description: string;
      }

      export interface IntersectionAsset extends Asset<"intersection"> {
        combined: BaseProps & ExtendedProps;
      }
    `;

    const types = convertTsToXLR(source);
    const asset = types.find(
      (t) => t.name === "IntersectionAsset",
    ) as NamedType<ObjectType>;
    expect(asset).toBeDefined();

    const code = generateFluentBuilder(asset);

    // Should handle intersection type
    expect(code).toContain("withCombined");
  });

  test("handles union types containing arrays for __arrayProperties__", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type Binding = string;

      export interface ActionAsset extends Asset<"action"> {
        value?: string;
        /** Can be single binding or array of bindings */
        validate?: Array<Binding> | Binding;
      }
    `;

    const types = convertTsToXLR(source);
    const actionAsset = types.find(
      (t) => t.name === "ActionAsset",
    ) as NamedType<ObjectType>;
    expect(actionAsset).toBeDefined();

    const code = generateFluentBuilder(actionAsset);

    // The validate property is Array<Binding> | Binding - should be in __arrayProperties__
    expect(code).toContain("__arrayProperties__");
    expect(code).toContain('"validate"');
  });

  test("handles Record types", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }

      export interface DataAsset extends Asset<"data"> {
        metadata: Record<string, unknown>;
        counts: Record<string, number>;
      }
    `;

    const types = convertTsToXLR(source);
    const dataAsset = types.find(
      (t) => t.name === "DataAsset",
    ) as NamedType<ObjectType>;
    expect(dataAsset).toBeDefined();

    const code = generateFluentBuilder(dataAsset);

    expect(code).toContain("withMetadata(value: Record<string, unknown>)");
    expect(code).toContain("withCounts(value: Record<string, number");
  });

  test("handles deeply nested union types", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type AssetWrapper<T extends Asset = Asset> = { asset: T };

      export interface ComplexAsset extends Asset<"complex"> {
        /** Single asset, array of assets, or nothing */
        content?: AssetWrapper<Asset> | Array<AssetWrapper<Asset>>;
      }
    `;

    const types = convertTsToXLR(source);
    const complexAsset = types.find(
      (t) => t.name === "ComplexAsset",
    ) as NamedType<ObjectType>;
    expect(complexAsset).toBeDefined();

    const code = generateFluentBuilder(complexAsset);

    // Should handle the union and include in __arrayProperties__
    expect(code).toContain("withContent");
    expect(code).toContain("__arrayProperties__");
    expect(code).toContain('"content"');
  });

  test("handles literal union types", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }

      export interface SizeAsset extends Asset<"sized"> {
        size: "small" | "medium" | "large";
        alignment?: "left" | "center" | "right";
      }
    `;

    const types = convertTsToXLR(source);
    const sizeAsset = types.find(
      (t) => t.name === "SizeAsset",
    ) as NamedType<ObjectType>;
    expect(sizeAsset).toBeDefined();

    const code = generateFluentBuilder(sizeAsset);

    // Should preserve literal union types
    expect(code).toContain('"small"');
    expect(code).toContain('"medium"');
    expect(code).toContain('"large"');
  });
});

describe("Nested Objects Accept Raw or Builder", () => {
  test("complex nested objects accept raw object OR FluentBuilder", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }

      export interface ActionAsset extends Asset<"action"> {
        confirmation?: {
          message: string;
          affirmativeLabel: string;
          negativeLabel?: string;
          extra?: string;
        };
      }
    `;

    const types = convertTsToXLR(source);
    const actionAsset = types.find(
      (t) => t.name === "ActionAsset",
    ) as NamedType<ObjectType>;
    const code = generateFluentBuilder(actionAsset);

    // Should accept both raw inline object AND FluentBuilder
    expect(code).toContain("withConfirmation(value: {");
    expect(code).toContain("| FluentBuilder<{");
    expect(code).toContain("}, BaseBuildContext>");
  });

  test("any nested object accepts raw object OR FluentBuilder", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }

      export interface ActionAsset extends Asset<"action"> {
        simple?: {
          a: string;
          b: string;
        };
      }
    `;

    const types = convertTsToXLR(source);
    const actionAsset = types.find(
      (t) => t.name === "ActionAsset",
    ) as NamedType<ObjectType>;
    const code = generateFluentBuilder(actionAsset);

    // Any nested object should accept either raw object or FluentBuilder
    expect(code).toContain("withSimple(value: {");
    expect(code).toContain("| FluentBuilder<{");
  });

  test("named nested types accept raw object OR FluentBuilder", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type AssetWrapper<T extends Asset = Asset> = { asset: T };

      export interface Metadata {
        beacon?: string;
        role?: "primary" | "secondary";
        skipValidation?: boolean;
        extra?: string;
      }

      export interface ActionAsset extends Asset<"action"> {
        value?: string;
        label?: AssetWrapper<Asset>;
        metaData?: Metadata;
      }
    `;

    const types = convertTsToXLR(source);
    const actionAsset = types.find(
      (t) => t.name === "ActionAsset",
    ) as NamedType<ObjectType>;
    const code = generateFluentBuilder(actionAsset);

    // Named complex types should accept the type, FluentBuilder, or FluentPartial
    expect(code).toContain(
      "withMetaData(value: Metadata | FluentBuilder<Metadata, BaseBuildContext> | FluentPartial<Metadata, BaseBuildContext>)",
    );
  });
});

describe("Bug Fixes", () => {
  describe("Issue #1: Malformed Generic Type Parameters", () => {
    test("handles simple generic parameters", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface SimpleGeneric<T extends string = string, U extends number = number> extends Asset<"test"> {
          prop1?: T;
          prop2?: U;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "SimpleGeneric",
      ) as NamedType<ObjectType>;
      const code = generateFluentBuilder(asset);

      expect(code).toContain("SimpleGenericBuilder<T extends string");
      expect(code).toContain("<T, U>");
      // Should not have malformed syntax
      expect(code).not.toContain("<T, U,");
      expect(code).not.toContain("<T, U, BaseBuildContext>");
    });

    test("handles nested generic parameters with commas", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }
        type AssetWrapper<T extends Asset = Asset> = { asset: T };

        interface ListItemNoHelp<AnyAsset extends Asset = Asset> extends AssetWrapper<AnyAsset> {}
        interface ListItem<AnyAsset extends Asset = Asset> extends ListItemNoHelp<AnyAsset> {
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
      const listAsset = types.find(
        (t) => t.name === "ListAsset",
      ) as NamedType<ObjectType>;
      const code = generateFluentBuilder(listAsset);

      // Should produce <AnyAsset, ItemType>, not something malformed
      expect(code).toContain("ListAssetBuilder<AnyAsset extends Asset");
      expect(code).toContain("<AnyAsset, ItemType>");
      // Should not have extra generic parameter in the class type usage
      // The bug was producing things like <AnyAsset, ItemType, BaseBuildContext> as if
      // BaseBuildContext was a third type parameter
      expect(code).not.toMatch(
        /ListAssetBuilder<AnyAsset,\s*ItemType,\s*BaseBuildContext>/,
      );
      // The method return type should just be <AnyAsset, ItemType>, not malformed
      expect(code).toMatch(/:\s*ListAssetBuilder<AnyAsset,\s*ItemType>/);
    });
  });

  describe("Issue #2: Quoted Property Names", () => {
    test("generates valid method names for quoted properties", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface ImageAsset extends Asset<"image"> {
          value?: string;
          "mime-type"?: string;
          'single-quoted'?: number;
        }
      `;

      const types = convertTsToXLR(source);
      const imageAsset = types.find(
        (t) => t.name === "ImageAsset",
      ) as NamedType<ObjectType>;
      const code = generateFluentBuilder(imageAsset);

      // Should generate valid method names without quotes
      expect(code).toContain("withMimeType");
      expect(code).toContain("withSingleQuoted");
      // Should NOT have quotes in method names
      expect(code).not.toContain("with'");
      expect(code).not.toContain('with"');
      // The set() call should also have clean property names
      expect(code).toContain('this.set("mime-type"');
      expect(code).toContain('this.set("single-quoted"');
    });
  });

  describe("Issue #3: Missing Type Imports", () => {
    test("imports types referenced in generic constraints and defaults", () => {
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
      const listAsset = types.find(
        (t) => t.name === "ListAsset",
      ) as NamedType<ObjectType>;
      const code = generateFluentBuilder(listAsset);

      // Should import types from generic constraints/defaults
      // The import statement should include these types
      expect(code).toMatch(/import type \{[^}]*ListItemNoHelp[^}]*\}/);
      expect(code).toMatch(/import type \{[^}]*ListItem[^}]*\}/);
    });

    test("imports nested generic argument types", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface Wrapper<T> {
          value: T;
        }

        export interface Nested<T> {
          inner: T;
        }

        export interface ComplexGeneric<
          T extends Wrapper<Nested<string>> = Wrapper<Nested<string>>
        > extends Asset<"complex"> {
          prop?: T;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "ComplexGeneric",
      ) as NamedType<ObjectType>;
      const code = generateFluentBuilder(asset);

      // Should import nested types from generic arguments
      expect(code).toMatch(/import type \{[^}]*Wrapper[^}]*\}/);
      expect(code).toMatch(/import type \{[^}]*Nested[^}]*\}/);
    });
  });

  describe("Issue #4: Built-in TypeScript Types Should Not Be Imported", () => {
    test("does not import Map type from source file", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface DataAsset extends Asset<"data"> {
          errorsAndWarnings?: Map<string, Array<string>>;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "DataAsset",
      ) as NamedType<ObjectType>;
      const code = generateFluentBuilder(asset);

      // Map should NOT appear in imports - it's a built-in
      expect(code).not.toMatch(/import type \{[^}]*\bMap\b[^}]*\}/);
      // Should still generate the method correctly
      expect(code).toContain("withErrorsAndWarnings");
    });

    test("does not import Set type from source file", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface CollectionAsset extends Asset<"collection"> {
          uniqueIds?: Set<string>;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "CollectionAsset",
      ) as NamedType<ObjectType>;
      const code = generateFluentBuilder(asset);

      // Set should NOT appear in imports - it's a built-in
      expect(code).not.toMatch(/import type \{[^}]*\bSet\b[^}]*\}/);
      // Should still generate the method correctly
      expect(code).toContain("withUniqueIds");
    });

    test("does not import WeakMap or WeakSet types", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface CacheAsset extends Asset<"cache"> {
          weakCache?: WeakMap<object, string>;
          weakSet?: WeakSet<object>;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "CacheAsset",
      ) as NamedType<ObjectType>;
      const code = generateFluentBuilder(asset);

      // WeakMap and WeakSet should NOT appear in imports
      expect(code).not.toMatch(/import type \{[^}]*\bWeakMap\b[^}]*\}/);
      expect(code).not.toMatch(/import type \{[^}]*\bWeakSet\b[^}]*\}/);
    });

    test("handles multiple built-in types in single property", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface ComplexAsset extends Asset<"complex"> {
          data?: Map<string, Set<number>>;
          metadata?: Record<string, Array<Promise<string>>>;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "ComplexAsset",
      ) as NamedType<ObjectType>;
      const code = generateFluentBuilder(asset);

      // None of the built-in types should appear in imports
      expect(code).not.toMatch(/import type \{[^}]*\bMap\b[^}]*\}/);
      expect(code).not.toMatch(/import type \{[^}]*\bSet\b[^}]*\}/);
      expect(code).not.toMatch(/import type \{[^}]*\bRecord\b[^}]*\}/);
      expect(code).not.toMatch(/import type \{[^}]*\bArray\b[^}]*\}/);
      expect(code).not.toMatch(/import type \{[^}]*\bPromise\b[^}]*\}/);
      // Should still generate the methods correctly
      expect(code).toContain("withData");
      expect(code).toContain("withMetadata");
    });

    test("does not import Date, Error, or RegExp types", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface EventAsset extends Asset<"event"> {
          timestamp?: Date;
          error?: Error;
          pattern?: RegExp;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "EventAsset",
      ) as NamedType<ObjectType>;
      const code = generateFluentBuilder(asset);

      // Date, Error, RegExp should NOT appear in imports
      expect(code).not.toMatch(/import type \{[^}]*\bDate\b[^}]*\}/);
      expect(code).not.toMatch(/import type \{[^}]*\bError\b[^}]*\}/);
      expect(code).not.toMatch(/import type \{[^}]*\bRegExp\b[^}]*\}/);
    });

    test("imports custom types used as generic arguments of built-in types", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface CustomData {
          name: string;
          value: number;
        }

        export interface CustomKey {
          id: string;
        }

        export interface DataAsset extends Asset<"data"> {
          /** Map with custom value type - should import CustomData but not Map */
          dataMap?: Map<string, CustomData>;
          /** Set with custom type - should import CustomKey but not Set */
          keySet?: Set<CustomKey>;
          /** Array with custom type - should import CustomData but not Array */
          items?: Array<CustomData>;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "DataAsset",
      ) as NamedType<ObjectType>;
      const code = generateFluentBuilder(asset);

      // Built-in types should NOT appear in imports
      expect(code).not.toMatch(/import type \{[^}]*\bMap\b[^}]*\}/);
      expect(code).not.toMatch(/import type \{[^}]*\bSet\b[^}]*\}/);
      expect(code).not.toMatch(/import type \{[^}]*\bArray\b[^}]*\}/);

      // Custom types SHOULD appear in imports
      expect(code).toMatch(/import type \{[^}]*\bCustomData\b[^}]*\}/);
      expect(code).toMatch(/import type \{[^}]*\bCustomKey\b[^}]*\}/);

      // Should still generate the methods correctly
      expect(code).toContain("withDataMap");
      expect(code).toContain("withKeySet");
      expect(code).toContain("withItems");
    });
  });

  describe("Issue #5: External Package Imports", () => {
    test("imports types from external packages using externalTypes config", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface ExternalData {
          name: string;
        }

        export interface MyAsset extends Asset<"my"> {
          data?: ExternalData;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "MyAsset",
      ) as NamedType<ObjectType>;

      // Configure ExternalData as coming from an external package
      const externalTypes = new Map<string, string>();
      externalTypes.set("ExternalData", "@player-tools/types");

      const code = generateFluentBuilder(asset, { externalTypes });

      // ExternalData should be imported from the package
      expect(code).toContain(
        'import type { ExternalData } from "@player-tools/types"',
      );
      // Should still generate the method correctly
      expect(code).toContain("withData");
    });

    test("groups multiple types from same external package", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface TypeA {
          value: string;
        }

        export interface TypeB {
          count: number;
        }

        export interface MyAsset extends Asset<"my"> {
          a?: TypeA;
          b?: TypeB;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "MyAsset",
      ) as NamedType<ObjectType>;

      // Configure both types as coming from the same external package
      const externalTypes = new Map<string, string>();
      externalTypes.set("TypeA", "@external/types");
      externalTypes.set("TypeB", "@external/types");

      const code = generateFluentBuilder(asset, { externalTypes });

      // Both types should be imported from the same package in one statement
      expect(code).toMatch(
        /import type \{[^}]*TypeA[^}]*TypeB[^}]*\} from "@external\/types"/,
      );
    });

    test("external types take precedence over sameFileTypes", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface SharedType {
          value: string;
        }

        export interface MyAsset extends Asset<"my"> {
          shared?: SharedType;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "MyAsset",
      ) as NamedType<ObjectType>;

      // Configure SharedType as external (even though it would be in sameFileTypes)
      const sameFileTypes = new Set<string>(["SharedType"]);
      const externalTypes = new Map<string, string>();
      externalTypes.set("SharedType", "@external/shared");

      const code = generateFluentBuilder(asset, {
        sameFileTypes,
        externalTypes,
      });

      // SharedType should be imported from external package, not from same file
      expect(code).toContain(
        'import type { SharedType } from "@external/shared"',
      );
      // Should NOT be in the main type import
      expect(code).not.toMatch(
        /import type \{[^}]*MyAsset[^}]*SharedType[^}]*\} from/,
      );
    });
  });

  describe("Issue #6: Generic Type Parameters Should Not Be Imported", () => {
    test("does not import generic parameters from referenced type constraints", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }
        type AssetWrapper<T extends Asset = Asset> = { asset: T };

        export interface Bar<AnyAsset extends Asset = Asset> {
          label: AssetWrapper<AnyAsset>;
          info: AssetWrapper<AnyAsset>;
        }

        export interface DataVisualizationAsset<
          MetadataType = DataBarsMetaData,
          BarType extends Bar = SingleBar
        > extends Asset<"dataViz"> {
          metaData: MetadataType;
          data: BarType[];
        }

        export interface DataBarsMetaData {
          title: string;
        }

        export interface SingleBar extends Bar {
          value: number;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "DataVisualizationAsset",
      ) as NamedType<ObjectType>;
      const code = generateFluentBuilder(asset);

      // Should NOT try to import AnyAsset (it's a generic param of Bar, not a concrete type)
      expect(code).not.toMatch(/import type \{[^}]*\bAnyAsset\b[^}]*\}/);

      // Should import actual types like Bar, SingleBar, DataBarsMetaData
      expect(code).toMatch(/import type \{[^}]*\bBar\b[^}]*\}/);
      expect(code).toMatch(/import type \{[^}]*\bSingleBar\b[^}]*\}/);
      expect(code).toMatch(/import type \{[^}]*\bDataBarsMetaData\b[^}]*\}/);
    });

    test("does not import generic parameters from nested generic constraints", () => {
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
          ItemType extends ListItemNoHelp = ListItem<AnyAsset>
        > extends Asset<"list"> {
          values?: Array<ItemType>;
        }
      `;

      const types = convertTsToXLR(source);
      const listAsset = types.find(
        (t) => t.name === "ListAsset",
      ) as NamedType<ObjectType>;
      const code = generateFluentBuilder(listAsset);

      // Should NOT try to import AnyAsset (it's a generic param)
      expect(code).not.toMatch(/import type \{[^}]*\bAnyAsset\b[^}]*\}/);

      // Should import actual types
      expect(code).toMatch(/import type \{[^}]*\bListItemNoHelp\b[^}]*\}/);
      expect(code).toMatch(/import type \{[^}]*\bListItem\b[^}]*\}/);
    });
  });

  describe("Issue #7: Generic Constraints Should Not Include FluentBuilder", () => {
    test("generates raw type names in generic constraints", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface Bar<AnyAsset extends Asset = Asset> {
          label: string;
        }

        export interface DataVisualizationAsset<
          BarType extends Bar = SingleBar
        > extends Asset<"dataViz"> {
          data: BarType[];
        }

        export interface SingleBar extends Bar {
          value: number;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "DataVisualizationAsset",
      ) as NamedType<ObjectType>;
      const code = generateFluentBuilder(asset);

      // Constraint should be "extends Bar", NOT "extends Bar | FluentBuilder<Bar>"
      expect(code).toContain("BarType extends Bar");
      expect(code).not.toContain("BarType extends Bar | FluentBuilder");

      // Default should be "= SingleBar", NOT "= SingleBar | FluentBuilder<SingleBar>"
      expect(code).toContain("= SingleBar");
      expect(code).not.toContain("= SingleBar | FluentBuilder");
    });

    test("generates multiple generic constraints without FluentBuilder", () => {
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
          ItemType extends ListItemNoHelp = ListItem
        > extends Asset<"list"> {
          values?: Array<ItemType>;
        }
      `;

      const types = convertTsToXLR(source);
      const listAsset = types.find(
        (t) => t.name === "ListAsset",
      ) as NamedType<ObjectType>;
      const code = generateFluentBuilder(listAsset);

      // Both constraints should be raw types without FluentBuilder
      expect(code).toContain("AnyAsset extends Asset");
      expect(code).not.toContain("AnyAsset extends Asset | FluentBuilder");
      expect(code).toContain("ItemType extends ListItemNoHelp");
      expect(code).not.toContain(
        "ItemType extends ListItemNoHelp | FluentBuilder",
      );

      // Defaults should also be raw types
      expect(code).toContain("= Asset");
      expect(code).toContain("= ListItem");
      expect(code).not.toMatch(/=\s*Asset\s*\|\s*FluentBuilder/);
      expect(code).not.toMatch(/=\s*ListItem\s*\|\s*FluentBuilder/);
    });
  });

  describe("Issue #8: Embedded Type Arguments Should Be Preserved When Available", () => {
    test("preserves embedded type arguments in extends ref string", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface LinkModifier extends Asset<"link"> {
          url: string;
        }

        export interface FormattingAsset extends Asset<"format"> {
          style: string;
        }
      `;

      const types = convertTsToXLR(source);
      const linkAsset = types.find(
        (t) => t.name === "LinkModifier",
      ) as NamedType<ObjectType>;
      const code = generateFluentBuilder(linkAsset);

      // Should have the correct asset type default
      expect(code).toContain('"type":"link"');
    });

    test("handles union types with different modifiers", () => {
      const source = `
        interface Asset<T extends string = string> {
          id: string;
          type: T;
        }

        export interface LinkModifier {
          type: 'link';
          url: string;
        }

        export interface FormatModifier {
          type: 'format';
          style: string;
        }

        export interface TextAsset extends Asset<"text"> {
          value: string;
          modifiers?: Array<LinkModifier | FormatModifier>;
        }
      `;

      const types = convertTsToXLR(source);
      const asset = types.find(
        (t) => t.name === "TextAsset",
      ) as NamedType<ObjectType>;
      const code = generateFluentBuilder(asset);

      // Should generate method for modifiers
      expect(code).toContain("withModifiers");

      // Should handle both modifier types in the union
      expect(code).toContain("LinkModifier");
      expect(code).toContain("FormatModifier");
    });
  });
});

describe("Namespaced Types", () => {
  test("preserves full qualified name for namespaced types in constraints", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }

      namespace Validation {
        export interface CrossfieldReference {
          field: string;
          condition: string;
        }
      }

      export interface InputAsset extends Asset<"input"> {
        binding: string;
        validation?: Validation.CrossfieldReference;
      }
    `;

    const types = convertTsToXLR(source);
    const inputAsset = types.find(
      (t) => t.name === "InputAsset",
    ) as NamedType<ObjectType>;
    const code = generateFluentBuilder(inputAsset);

    // Should preserve the full qualified name
    expect(code).toContain("Validation.CrossfieldReference");
  });

  test("handles namespaced types in generic arguments", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }

      namespace Config {
        export interface Settings {
          enabled: boolean;
        }
      }

      export interface AppAsset extends Asset<"app"> {
        settings?: Config.Settings;
        allSettings?: Array<Config.Settings>;
      }
    `;

    const types = convertTsToXLR(source);
    const appAsset = types.find(
      (t) => t.name === "AppAsset",
    ) as NamedType<ObjectType>;
    const code = generateFluentBuilder(appAsset);

    // Should preserve the namespace in type references
    expect(code).toContain("Config.Settings");
  });

  test("imports namespace for namespaced types", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }

      namespace Types {
        export interface Data {
          value: string;
        }
      }

      export interface DataAsset extends Asset<"data"> {
        data?: Types.Data;
      }
    `;

    const types = convertTsToXLR(source);
    const dataAsset = types.find(
      (t) => t.name === "DataAsset",
    ) as NamedType<ObjectType>;

    // Configure Types namespace as external
    const externalTypes = new Map<string, string>();
    externalTypes.set("Types", "@custom/types");

    const code = generateFluentBuilder(dataAsset, { externalTypes });

    // Should import the namespace
    expect(code).toContain('import type { Types } from "@custom/types"');
    // Should use the full qualified name in the code
    expect(code).toContain("Types.Data");
  });
});

describe("FluentPartial Support for Nested Builder Objects", () => {
  test("generates FluentPartial union for nested object properties with AssetWrapper", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type AssetWrapper<T extends Asset = Asset> = { asset: T };

      export interface Foo {
        bar: AssetWrapper<Asset>;
        buz: AssetWrapper<Asset>;
        lol: string;
        ok: boolean;
      }

      export interface ContainerAsset extends Asset<"container"> {
        foo: Foo;
      }
    `;

    const types = convertTsToXLR(source);
    const containerAsset = types.find(
      (t) => t.name === "ContainerAsset",
    ) as NamedType<ObjectType>;
    expect(containerAsset).toBeDefined();

    const code = generateFluentBuilder(containerAsset);

    // The foo property should accept Foo, FluentBuilder<Foo>, or FluentPartial<Foo>
    expect(code).toContain("FluentPartial<Foo, BaseBuildContext>");
    // Verify the full signature
    expect(code).toContain(
      "withFoo(value: Foo | FluentBuilder<Foo, BaseBuildContext> | FluentPartial<Foo, BaseBuildContext>)",
    );
  });

  test("generates FluentPartial for deeply nested object structures", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type AssetWrapper<T extends Asset = Asset> = { asset: T };

      export interface DeepNested {
        level1: {
          level2: {
            content: AssetWrapper<Asset>;
            value: string;
          };
        };
      }

      export interface DeepAsset extends Asset<"deep"> {
        nested: DeepNested;
      }
    `;

    const types = convertTsToXLR(source);
    const deepAsset = types.find(
      (t) => t.name === "DeepAsset",
    ) as NamedType<ObjectType>;
    expect(deepAsset).toBeDefined();

    const code = generateFluentBuilder(deepAsset);

    // The nested property should accept DeepNested, FluentBuilder<DeepNested>, or FluentPartial<DeepNested>
    expect(code).toContain("FluentPartial<DeepNested, BaseBuildContext>");
  });

  test("generates FluentPartial for array element types", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type AssetWrapper<T extends Asset = Asset> = { asset: T };

      export interface ListItem {
        label: AssetWrapper<Asset>;
        value: string;
      }

      export interface ListAsset extends Asset<"list"> {
        items: Array<ListItem>;
      }
    `;

    const types = convertTsToXLR(source);
    const listAsset = types.find(
      (t) => t.name === "ListAsset",
    ) as NamedType<ObjectType>;
    expect(listAsset).toBeDefined();

    const code = generateFluentBuilder(listAsset);

    // Array elements should also support FluentPartial
    expect(code).toContain(
      "Array<ListItem | FluentBuilder<ListItem, BaseBuildContext> | FluentPartial<ListItem, BaseBuildContext>>",
    );
  });

  test("generates FluentPartial for union types containing objects", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type AssetWrapper<T extends Asset = Asset> = { asset: T };

      export interface TypeA {
        slot: AssetWrapper<Asset>;
        kind: "a";
      }

      export interface TypeB {
        slot: AssetWrapper<Asset>;
        kind: "b";
      }

      export interface UnionAsset extends Asset<"union"> {
        content: TypeA | TypeB;
      }
    `;

    const types = convertTsToXLR(source);
    const unionAsset = types.find(
      (t) => t.name === "UnionAsset",
    ) as NamedType<ObjectType>;
    expect(unionAsset).toBeDefined();

    const code = generateFluentBuilder(unionAsset);

    // Both TypeA and TypeB should support FluentPartial in the union
    expect(code).toContain("FluentPartial<TypeA, BaseBuildContext>");
    expect(code).toContain("FluentPartial<TypeB, BaseBuildContext>");
  });
});

describe("Generic Type Arguments Preservation", () => {
  test("preserves string literal generic arguments in type names", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }

      export interface SimpleModifier<T extends string> {
        type: T;
        value: string;
      }

      export interface TextAsset extends Asset<"text"> {
        value: string;
        modifiers?: Array<SimpleModifier<"format"> | SimpleModifier<"link">>;
      }
    `;

    const types = convertTsToXLR(source);
    const textAsset = types.find(
      (t) => t.name === "TextAsset",
    ) as NamedType<ObjectType>;
    const code = generateFluentBuilder(textAsset);

    // Should preserve the generic arguments in the type
    expect(code).toContain('SimpleModifier<"format">');
    expect(code).toContain('SimpleModifier<"link">');
  });
});

describe("Import Handling for Asset", () => {
  test("Asset is imported exactly once when used in AssetWrapper", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type AssetWrapper<T extends Asset = Asset> = { asset: T };

      export interface ActionAsset extends Asset<"action"> {
        label?: AssetWrapper<Asset>;
        icon?: AssetWrapper<Asset>;
      }
    `;

    const types = convertTsToXLR(source);
    const actionAsset = types.find(
      (t) => t.name === "ActionAsset",
    ) as NamedType<ObjectType>;
    const code = generateFluentBuilder(actionAsset);

    // Asset should be imported exactly once from @player-ui/types
    const assetImportMatches = code.match(
      /import type \{ Asset \} from "@player-ui\/types"/g,
    );
    expect(assetImportMatches?.length).toBe(1);

    // Asset should NOT be in the main type import
    expect(code).not.toMatch(
      /import type \{[^}]*ActionAsset[^}]*Asset[^}]*\} from/,
    );
  });

  test("generic parameters of the current type are not imported", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type AssetWrapper<T extends Asset = Asset> = { asset: T };

      export interface InputAsset<AnyTextAsset extends Asset = Asset> extends Asset<"input"> {
        binding: string;
        label?: AssetWrapper<AnyTextAsset>;
      }
    `;

    const types = convertTsToXLR(source);
    const inputAsset = types.find(
      (t) => t.name === "InputAsset",
    ) as NamedType<ObjectType>;
    const code = generateFluentBuilder(inputAsset);

    // AnyTextAsset should NOT be imported - it's a generic parameter of InputAsset
    expect(code).not.toMatch(/import type \{[^}]*AnyTextAsset[^}]*\}/);
  });
});

describe("Types Extending AssetWrapper", () => {
  test("generates correct type signature and __assetWrapperPaths__ for type extending AssetWrapper", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type AssetWrapper<T extends Asset = Asset> = { asset: T };

      export interface Header extends AssetWrapper<Asset> {
        title: string;
      }

      export interface TableAsset extends Asset<"table"> {
        headers: Array<Header>;
      }
    `;

    const types = convertTsToXLR(source);
    const headerType = types.find(
      (t) => t.name === "Header",
    ) as NamedType<ObjectType>;
    const tableAsset = types.find(
      (t) => t.name === "TableAsset",
    ) as NamedType<ObjectType>;
    expect(headerType).toBeDefined();
    expect(tableAsset).toBeDefined();

    const typeRegistry: TypeRegistry = new Map([["Header", headerType]]);

    const code = generateFluentBuilder(tableAsset, { typeRegistry });

    // Should include Asset | FluentBuilder<Asset> for the inner asset type
    expect(code).toContain("Asset | FluentBuilder<Asset, BaseBuildContext>");
    // Should include Header type in the union
    expect(code).toContain("Header");
    // Should have __assetWrapperPaths__ that includes "headers"
    expect(code).toContain("__assetWrapperPaths__");
    expect(code).toContain('"headers"');
  });

  test("generates correct type for single property extending AssetWrapper", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type AssetWrapper<T extends Asset = Asset> = { asset: T };

      export interface Header extends AssetWrapper<Asset> {
        title: string;
      }

      export interface CardAsset extends Asset<"card"> {
        header?: Header;
      }
    `;

    const types = convertTsToXLR(source);
    const headerType = types.find(
      (t) => t.name === "Header",
    ) as NamedType<ObjectType>;
    const cardAsset = types.find(
      (t) => t.name === "CardAsset",
    ) as NamedType<ObjectType>;
    expect(headerType).toBeDefined();
    expect(cardAsset).toBeDefined();

    const typeRegistry: TypeRegistry = new Map([["Header", headerType]]);

    const code = generateFluentBuilder(cardAsset, { typeRegistry });

    // Should accept Asset, FluentBuilder<Asset>, Header, FluentBuilder<Header>, or FluentPartial<Header>
    expect(code).toContain("Asset | FluentBuilder<Asset, BaseBuildContext>");
    expect(code).toContain("Header | FluentBuilder<Header, BaseBuildContext>");
    expect(code).toContain("FluentPartial<Header, BaseBuildContext>");
    // Should have __assetWrapperPaths__
    expect(code).toContain("__assetWrapperPaths__");
    expect(code).toContain('"header"');
  });

  test("handles transitive AssetWrapper extension", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type AssetWrapper<T extends Asset = Asset> = { asset: T };

      export interface ListItemBase extends AssetWrapper<Asset> {}

      export interface ListItem extends ListItemBase {
        help?: string;
      }

      export interface ListAsset extends Asset<"list"> {
        items: Array<ListItem>;
      }
    `;

    const types = convertTsToXLR(source);
    const listItemBaseType = types.find(
      (t) => t.name === "ListItemBase",
    ) as NamedType<ObjectType>;
    const listItemType = types.find(
      (t) => t.name === "ListItem",
    ) as NamedType<ObjectType>;
    const listAsset = types.find(
      (t) => t.name === "ListAsset",
    ) as NamedType<ObjectType>;
    expect(listItemBaseType).toBeDefined();
    expect(listItemType).toBeDefined();
    expect(listAsset).toBeDefined();

    const typeRegistry: TypeRegistry = new Map([
      ["ListItemBase", listItemBaseType],
      ["ListItem", listItemType],
    ]);

    const code = generateFluentBuilder(listAsset, { typeRegistry });

    // Should detect ListItem as extending AssetWrapper (transitively)
    expect(code).toContain("__assetWrapperPaths__");
    expect(code).toContain('"items"');
    // Should include Asset in the type signature
    expect(code).toContain("Asset | FluentBuilder<Asset, BaseBuildContext>");
  });

  test("generates correct inner type from specific AssetWrapper generic argument", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type AssetWrapper<T extends Asset = Asset> = { asset: T };

      export interface ImageAsset extends Asset<"image"> {
        src: string;
      }

      export interface ImageSlot extends AssetWrapper<ImageAsset> {
        alt?: string;
      }

      export interface GalleryAsset extends Asset<"gallery"> {
        images: Array<ImageSlot>;
      }
    `;

    const types = convertTsToXLR(source);
    const imageAssetType = types.find(
      (t) => t.name === "ImageAsset",
    ) as NamedType<ObjectType>;
    const imageSlotType = types.find(
      (t) => t.name === "ImageSlot",
    ) as NamedType<ObjectType>;
    const galleryAsset = types.find(
      (t) => t.name === "GalleryAsset",
    ) as NamedType<ObjectType>;
    expect(imageSlotType).toBeDefined();
    expect(galleryAsset).toBeDefined();

    const typeRegistry: TypeRegistry = new Map([
      ["ImageSlot", imageSlotType],
      ["ImageAsset", imageAssetType],
    ]);

    const code = generateFluentBuilder(galleryAsset, { typeRegistry });

    // Should use ImageAsset as the inner type (not generic Asset)
    expect(code).toContain(
      "ImageAsset | FluentBuilder<ImageAsset, BaseBuildContext>",
    );
    // Should also include ImageSlot in the union
    expect(code).toContain("ImageSlot");
    // Should have __assetWrapperPaths__
    expect(code).toContain("__assetWrapperPaths__");
    expect(code).toContain('"images"');
  });
});

describe("Runtime: Table Composition with Nested Builders", () => {
  // Inline builder classes matching generated patterns to validate
  // that the fluent builder runtime correctly handles:
  // 1. AssetWrapper auto-wrapping (search, filters, actions)
  // 2. Types extending AssetWrapper (Header, TableColumn)
  // 3. Nested builders (StaticFilter inside Header inside Table)
  // 4. Array of extending types (Array<Header>, Array<TableColumn>)

  class TextBuilder extends FluentBuilderBase<any> {
    static defaults = { type: "text", id: "" };
    withValue(v: any) {
      return this.set("value", v);
    }
    build(ctx?: any) {
      return this.buildWithDefaults(TextBuilder.defaults, ctx);
    }
  }
  const text = (initial?: any) => new TextBuilder(initial);

  class ActionBuilder extends FluentBuilderBase<any> {
    static defaults = { type: "action", id: "" };
    withLabel(v: any) {
      return this.set("label", v);
    }
    build(ctx?: any) {
      return this.buildWithDefaults(ActionBuilder.defaults, ctx);
    }
  }
  const action = (initial?: any) => new ActionBuilder(initial);

  class StaticFilterBuilder extends FluentBuilderBase<any> {
    static defaults = {};
    static __assetWrapperPaths__ = [["label"], ["value"]];
    withLabel(v: any) {
      return this.set("label", v);
    }
    withValue(v: any) {
      return this.set("value", v);
    }
    withComparator(v: any) {
      return this.set("comparator", v);
    }
    build(ctx?: any) {
      return this.buildWithDefaults(StaticFilterBuilder.defaults, ctx);
    }
  }
  const staticFilter = (initial?: any) => new StaticFilterBuilder(initial);

  class TableColumnBuilder extends FluentBuilderBase<any> {
    static defaults = { id: "" };
    withComparator(v: any) {
      return this.set("comparator", v);
    }
    build(ctx?: any) {
      return this.buildWithDefaults(TableColumnBuilder.defaults, ctx);
    }
  }
  const tableColumn = (initial?: any) => new TableColumnBuilder(initial);

  class HeaderBuilder extends FluentBuilderBase<any> {
    static defaults = { id: "", significance: "optional" };
    static __assetWrapperPaths__: string[][] = [
      ["staticFilters", "label"],
      ["staticFilters", "value"],
    ];
    withStaticFilters(v: any) {
      return this.set("staticFilters", v);
    }
    withSortable(v: any) {
      return this.set("sortable", v);
    }
    withSignificance(v: any) {
      return this.set("significance", v);
    }
    build(ctx?: any) {
      return this.buildWithDefaults(HeaderBuilder.defaults, ctx);
    }
  }
  const header = (initial?: any) => new HeaderBuilder(initial);

  class RowBuilder extends FluentBuilderBase<any> {
    static defaults = {};
    static __assetWrapperPaths__ = [["values"], ["actions"]];
    withContext(v: any) {
      return this.set("context", v);
    }
    withValues(v: any) {
      return this.set("values", v);
    }
    withActions(v: any) {
      return this.set("actions", v);
    }
    build(ctx?: any) {
      return this.buildWithDefaults(RowBuilder.defaults, ctx);
    }
  }
  const row = (initial?: any) => new RowBuilder(initial);

  class TableAssetBuilder extends FluentBuilderBase<any> {
    static defaults = { type: "table", id: "" };
    static __assetWrapperPaths__ = [
      ["search"],
      ["filters"],
      ["headers", "values"],
      ["headers", "values", "staticFilters", "label"],
      ["headers", "values", "staticFilters", "value"],
      ["actions"],
      ["values", "values"],
      ["values", "actions"],
    ];
    withSearch(v: any) {
      return this.set("search", v);
    }
    withFilters(v: any) {
      return this.set("filters", v);
    }
    withHeaders(v: any) {
      return this.set("headers", v);
    }
    withValues(v: any) {
      return this.set("values", v);
    }
    withActions(v: any) {
      return this.set("actions", v);
    }
    withPlaceholder(v: any) {
      return this.set("placeholder", v);
    }
    withAutomationId(v: any) {
      return this.set("automationId", v);
    }
    build(ctx?: any) {
      return this.buildWithDefaults(TableAssetBuilder.defaults, ctx);
    }
  }
  const tableAsset = (initial?: any) => new TableAssetBuilder(initial);

  test("composes table with nested builders and auto-wraps AssetWrapper properties", () => {
    const result = tableAsset()
      .withSearch(text().withValue("Search..."))
      .withFilters([text().withValue("Filter 1")])
      .withHeaders({
        values: [
          header()
            .withStaticFilters([
              staticFilter()
                .withLabel(text().withValue("Active"))
                .withValue(text().withValue("Yes"))
                .withComparator("active"),
            ])
            .withSortable(true),
          header().withSignificance("optional"),
        ],
      })
      .withValues([
        row()
          .withContext({ state: "complete" })
          .withValues([
            tableColumn().withComparator("name"),
            tableColumn().withComparator("status"),
          ])
          .withActions([action().withLabel("Edit")]),
      ])
      .withActions([action().withLabel("Add Row")])
      .withPlaceholder("No data available")
      .withAutomationId("main-table")
      .build();

    // Top-level structure
    expect(result.type).toBe("table");
    expect(result.placeholder).toBe("No data available");
    expect(result.automationId).toBe("main-table");

    // Direct AssetWrapper: search is auto-wrapped
    expect(result.search.asset).toBeDefined();
    expect(result.search.asset.type).toBe("text");
    expect(result.search.asset.value).toBe("Search...");

    // Array<AssetWrapper>: filters are auto-wrapped
    expect(result.filters).toHaveLength(1);
    expect(result.filters[0].asset.type).toBe("text");
    expect(result.filters[0].asset.value).toBe("Filter 1");

    // Table-level actions are auto-wrapped
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].asset.type).toBe("action");
    expect(result.actions[0].asset.label).toBe("Add Row");

    // Headers with nested Header builders
    expect(result.headers.values).toHaveLength(2);
    const header1 = result.headers.values[0];
    expect(header1.sortable).toBe(true);
    expect(header1.staticFilters).toHaveLength(1);

    // StaticFilter.label/value auto-wrapped within the nested builder
    const sf = header1.staticFilters[0];
    expect(sf.comparator).toBe("active");
    expect(sf.label.asset).toBeDefined();
    expect(sf.label.asset.value).toBe("Active");
    expect(sf.value.asset).toBeDefined();
    expect(sf.value.asset.value).toBe("Yes");

    // Rows with nested TableColumn builders
    expect(result.values).toHaveLength(1);
    const row1 = result.values[0];
    expect(row1.context).toEqual({ state: "complete" });
    expect(row1.values).toHaveLength(2);
    expect(row1.values[0].comparator).toBe("name");
    expect(row1.values[1].comparator).toBe("status");

    // Row-level actions are auto-wrapped
    expect(row1.actions).toHaveLength(1);
    expect(row1.actions[0].asset.type).toBe("action");
    expect(row1.actions[0].asset.label).toBe("Edit");
  });

  test("generated __assetWrapperPaths__ match for Table with extends-AssetWrapper types", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type AssetWrapper<T extends Asset = Asset> = { asset: T };
      type Binding = string;

      export interface StaticFilter<AnyAsset extends Asset = Asset> {
        label: AssetWrapper<AnyAsset>;
        value: AssetWrapper<AnyAsset>;
        comparator: string;
      }

      export interface Header<AnyAsset extends Asset = Asset>
        extends AssetWrapper<AnyAsset> {
        staticFilters?: Array<StaticFilter<AnyAsset>>;
        sortable?: boolean;
      }

      export interface TableColumn<AnyAsset extends Asset = Asset>
        extends AssetWrapper<AnyAsset> {
        comparator?: string;
      }

      export interface Row<AnyAsset extends Asset = Asset> {
        values: Array<TableColumn<AnyAsset>>;
        actions?: Array<AssetWrapper<AnyAsset>>;
      }

      export interface TableAsset<AnyAsset extends Asset = Asset>
        extends Asset<'table'> {
        search?: AssetWrapper<AnyAsset>;
        filters?: Array<AssetWrapper<AnyAsset>>;
        headers?: { values?: Array<Header<AnyAsset>> };
        values?: Array<Row<AnyAsset>>;
        actions?: Array<AssetWrapper<AnyAsset>>;
      }
    `;

    const types = convertTsToXLR(source);
    const findType = (name: string) =>
      types.find((t) => t.name === name) as NamedType<ObjectType>;

    const headerType = findType("Header");
    const tableColumnType = findType("TableColumn");
    const rowType = findType("Row");
    const staticFilterType = findType("StaticFilter");
    const tableAssetType = findType("TableAsset");

    const typeRegistry: TypeRegistry = new Map(
      [headerType, tableColumnType, rowType, staticFilterType]
        .filter(Boolean)
        .map((t) => [t.name, t]),
    );
    const config: GeneratorConfig = { typeRegistry };

    const tableCode = generateFluentBuilder(tableAssetType, config);

    // Direct AssetWrapper paths
    expect(tableCode).toContain('"search"');
    expect(tableCode).toContain('"filters"');
    expect(tableCode).toContain('"actions"');

    // Nested paths through extends-AssetWrapper types
    // headers.values -> Header extends AssetWrapper
    expect(tableCode).toMatch(/"headers".*"values"/);
    // headers.values -> staticFilters.label/value (via array recursion)
    expect(tableCode).toMatch(/"headers".*"values".*"staticFilters".*"label"/);
    expect(tableCode).toMatch(/"headers".*"values".*"staticFilters".*"value"/);

    // values.values -> Row.values = Array<TableColumn extends AssetWrapper>
    expect(tableCode).toMatch(/"values".*"values"/);
    // values.actions -> Row.actions = Array<AssetWrapper>
    expect(tableCode).toMatch(/"values".*"actions"/);

    // Type signatures: Header accepted with Asset union
    expect(tableCode).toContain(
      "Asset | FluentBuilder<Asset, BaseBuildContext>",
    );
    expect(tableCode).toContain("Header");
  });
});

describe("Issue #9: Generic Parameter Leak from Base Type", () => {
  test("non-generic type extending generic base does not import generic params", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type AssetWrapper<T extends Asset = Asset> = { asset: T };

      export interface FileInputAssetBase<AnyAsset extends Asset = Asset> extends Asset<'fileInput'> {
        label?: AssetWrapper<AnyAsset>;
      }

      export interface FileInputAsset extends FileInputAssetBase {
        uploadTrigger: string;
      }
    `;

    const types = convertTsToXLR(source);
    const base = types.find(
      (t) => t.name === "FileInputAssetBase",
    ) as NamedType<ObjectType>;
    const asset = types.find(
      (t) => t.name === "FileInputAsset",
    ) as NamedType<ObjectType>;

    const typeRegistry: TypeRegistry = new Map([["FileInputAssetBase", base]]);
    const code = generateFluentBuilder(asset, { typeRegistry });

    // AnyAsset is a generic param of the base type, not a concrete type to import
    expect(code).not.toContain("AnyAsset");
    // The AssetWrapper<AnyAsset> property should resolve to Asset (the default)
    expect(code).toContain("Asset | FluentBuilder<Asset, BaseBuildContext>");
  });

  test("non-generic type extending generic base with multiple params", () => {
    const source = `
      interface Asset<T extends string = string> {
        id: string;
        type: T;
      }
      type AssetWrapper<T extends Asset = Asset> = { asset: T };

      export interface MultiGenericBase<AnyLabelAsset extends Asset = Asset, AnyIconAsset extends Asset = Asset> extends Asset<'multi'> {
        label?: AssetWrapper<AnyLabelAsset>;
        icon?: AssetWrapper<AnyIconAsset>;
      }

      export interface ConcreteMulti extends MultiGenericBase {
        extra: string;
      }
    `;

    const types = convertTsToXLR(source);
    const base = types.find(
      (t) => t.name === "MultiGenericBase",
    ) as NamedType<ObjectType>;
    const asset = types.find(
      (t) => t.name === "ConcreteMulti",
    ) as NamedType<ObjectType>;

    const typeRegistry: TypeRegistry = new Map([["MultiGenericBase", base]]);
    const code = generateFluentBuilder(asset, { typeRegistry });

    // Neither generic param should be imported as a concrete type
    expect(code).not.toContain("AnyLabelAsset");
    expect(code).not.toContain("AnyIconAsset");
  });
});
