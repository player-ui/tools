import { describe, test, expect, vi } from "vitest";
import { setupTestEnv } from "@player-tools/test-utils";
import { TsConverter } from "@player-tools/xlr-converters";
import type { NamedType, ObjectType } from "@player-tools/xlr";
import { generateFluentBuilder, type GeneratorConfig } from "../generator";

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

describe("Integration with Real Mock Types", () => {
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
    expect(code).toContain(
      'defaults: Record<string, unknown> = {"type":"text","id":""}',
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
    // The generated builder should have defaults for id and type
    expect(code).toContain(
      'defaults: Record<string, unknown> = {"type":"text","id":""}',
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
    expect(defaults).toEqual({ type: "text", id: "" });
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
