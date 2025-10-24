// @ts-check
import {
  createPlugin,
  primitive,
  object,
  array,
  reference,
  or,
} from "fluent-gen-ts";

/**
 * Tracks which properties are Array<AssetWrapper<T>> for each builder type.
 * Key: fully qualified type name (e.g., "Collection")
 * Value: Set of property names that are array types
 */
const typeArrayPropertiesMap = new Map();

const plugin = createPlugin("player-plugin", "1.0.0")
  .setDescription("Player Fluent Plugin.")

  .requireImports((imports) =>
    imports
      .addExternalTypes("@player-tools/fluent", ["TaggedTemplateValue"])
      .addExternalTypes("@player-ui/types", ["Asset", "AssetWrapper"]),
  )

  .transformPropertyMethods((builder) =>
    builder

      // Only match properties that are DIRECTLY AssetWrapper or Asset
      // Not properties that merely contain AssetWrapper nested somewhere
      .when((ctx) => {
        // Direct AssetWrapper reference: label?: AssetWrapper<Asset>
        if (
          ctx.propertyType.kind === "reference" &&
          ctx.propertyType.name === "AssetWrapper"
        ) {
          return true;
        }

        // Direct AssetWrapper object: label?: { asset: Asset }
        if (
          ctx.propertyType.kind === "object" &&
          ctx.propertyType.name === "AssetWrapper"
        ) {
          return true;
        }

        return false;
      })
      .setParameter((ctx) =>
        ctx.originalTypeString.replace(/AssetWrapper/g, "Asset"),
      )
      .setExtractor("{ asset: value }")
      .done()

      // Only match Array<AssetWrapper>, not Array<SomethingContainingAssetWrapper>
      .when((ctx) => {
        if (ctx.propertyType.kind !== "array") return false;

        const elementType = ctx.propertyType.elementType;
        if (!elementType) return false;

        // Check if the DIRECT array element is AssetWrapper
        const isAssetWrapperArray =
          (elementType.kind === "reference" &&
            elementType.name === "AssetWrapper") ||
          (elementType.kind === "object" &&
            elementType.name === "AssetWrapper") ||
          (elementType.kind === "union" &&
            elementType.unionTypes?.some(
              (t) =>
                (t.kind === "reference" && t.name === "AssetWrapper") ||
                (t.kind === "object" && t.name === "AssetWrapper"),
            ));

        // Track this property as an array property for this type
        if (isAssetWrapperArray) {
          const typeName = ctx.builderName.replace(/Builder$/, "");
          if (!typeArrayPropertiesMap.has(typeName)) {
            typeArrayPropertiesMap.set(typeName, new Set());
          }
          typeArrayPropertiesMap.get(typeName).add(ctx.property.name);
        }

        return isAssetWrapperArray;
      })
      .setParameter((ctx) => {
        let result = ctx.type.transformDeep();
        result = result.replace(
          array().of(object("AssetWrapper")),
          "Array<Asset | FluentBuilder<Asset, BaseBuildContext>>",
        );
        result = result.replace(
          array().of(or(reference("AssetWrapper"))),
          "Array<Asset | FluentBuilder<Asset, BaseBuildContext>>",
        );
        return result.toString();
      })
      .setExtractor("{ asset: value }")
      .done()

      // Handle objects containing TaggedTemplateValue properties (e.g., confirmation)
      // MUST be FIRST before any primitive rules since first match wins!
      .when((ctx) => {
        // Must NOT be a reference to a named type (e.g., ActionMetaData)
        if (ctx.type.isReference()) return false;

        // Check if root type is an anonymous object
        if (ctx.propertyType.kind !== "object") return false;
        if (ctx.propertyType.name) return false; // Must be anonymous

        // Must have properties
        if (
          !ctx.propertyType.properties ||
          ctx.propertyType.properties.length === 0
        )
          return false;

        // At least one property must be or contain a primitive
        return ctx.type.containsDeep(
          or(primitive("string"), primitive("number"), primitive("boolean")),
        );
      })
      .setParameter((ctx) => {
        // Transform each primitive property to include TaggedTemplateValue
        let result = ctx.type.transformDeep();
        result = result.replace(
          primitive("string"),
          "string | TaggedTemplateValue<string>",
        );
        result = result.replace(
          primitive("number"),
          "number | TaggedTemplateValue<number>",
        );
        result = result.replace(
          primitive("boolean"),
          "boolean | TaggedTemplateValue<boolean>",
        );
        return result.toString();
      })
      .done()

      // Handle union types: Array<primitive> | primitive (e.g., Array<string> | string)
      .when((ctx) => {
        const hasArrayOfString = ctx.type.containsDeep(
          array().of(primitive("string")),
        );
        const hasString = ctx.type.containsDeep(primitive("string"));
        return hasArrayOfString && hasString;
      })
      .setParameter((ctx) =>
        ctx.type
          .transformDeep()
          .replace(
            array().of(primitive("string")),
            "Array<string | TaggedTemplateValue<string>>",
          )
          .replace(primitive("string"), "string | TaggedTemplateValue<string>")
          .toString(),
      )
      .done()

      .when((ctx) => {
        const hasArrayOfNumber = ctx.type.containsDeep(
          array().of(primitive("number")),
        );
        const hasNumber = ctx.type.containsDeep(primitive("number"));
        return hasArrayOfNumber && hasNumber;
      })
      .setParameter((ctx) =>
        ctx.type
          .transformDeep()
          .replace(
            array().of(primitive("number")),
            "Array<number | TaggedTemplateValue<number>>",
          )
          .replace(primitive("number"), "number | TaggedTemplateValue<number>")
          .toString(),
      )
      .done()

      .when((ctx) => {
        const hasArrayOfBoolean = ctx.type.containsDeep(
          array().of(primitive("boolean")),
        );
        const hasBoolean = ctx.type.containsDeep(primitive("boolean"));
        return hasArrayOfBoolean && hasBoolean;
      })
      .setParameter((ctx) =>
        ctx.type
          .transformDeep()
          .replace(
            array().of(primitive("boolean")),
            "Array<boolean | TaggedTemplateValue<boolean>>",
          )
          .replace(
            primitive("boolean"),
            "boolean | TaggedTemplateValue<boolean>",
          )
          .toString(),
      )
      .done()

      // Handle standalone arrays of primitives
      .when((ctx) => ctx.type.containsDeep(array().of(primitive("string"))))
      .setParameter((ctx) =>
        ctx.type
          .transformDeep()
          .replace(
            array().of(primitive("string")),
            "Array<string | TaggedTemplateValue<string>>",
          )
          .toString(),
      )
      .done()

      .when((ctx) => ctx.type.containsDeep(array().of(primitive("number"))))
      .setParameter((ctx) =>
        ctx.type
          .transformDeep()
          .replace(
            array().of(primitive("number")),
            "Array<number | TaggedTemplateValue<number>>",
          )
          .toString(),
      )
      .done()

      .when((ctx) => ctx.type.containsDeep(array().of(primitive("boolean"))))
      .setParameter((ctx) =>
        ctx.type
          .transformDeep()
          .replace(
            array().of(primitive("boolean")),
            "Array<boolean | TaggedTemplateValue<boolean>>",
          )
          .toString(),
      )
      .done()

      // Handle standalone primitives (root type must BE a primitive, not contain one)
      .when((ctx) => ctx.type.isPrimitive("string"))
      .setParameter((ctx) =>
        ctx.type
          .transformDeep()
          .replace(primitive("string"), "string | TaggedTemplateValue<string>")
          .toString(),
      )
      .done()

      .when((ctx) => ctx.type.isPrimitive("number"))
      .setParameter((ctx) =>
        ctx.type
          .transformDeep()
          .replace(primitive("number"), "number | TaggedTemplateValue<number>")
          .toString(),
      )
      .done()

      .when((ctx) => ctx.type.isPrimitive("boolean"))
      .setParameter((ctx) =>
        ctx.type
          .transformDeep()
          .replace(
            primitive("boolean"),
            "boolean | TaggedTemplateValue<boolean>",
          )
          .toString(),
      )
      .done(),
  )

  .beforeGenerate((context) => {
    // Clear the map before each generation to prevent stale data
    typeArrayPropertiesMap.clear();
    return { ok: true, value: context };
  })

  .afterGenerate((code, context) => {
    // Extract the type name from the generated code
    // Look for pattern: "export class XxxBuilder"
    const classMatch = code.match(/export class (\w+)Builder/);
    if (!classMatch) {
      // Not a builder file, skip
      return { ok: true, value: code };
    }

    const typeName = classMatch[1];
    const arrayProperties = typeArrayPropertiesMap.get(typeName);

    // If this type has array properties, inject static metadata
    if (arrayProperties && arrayProperties.size > 0) {
      const propertyNames = Array.from(arrayProperties).sort();
      const arrayPropertiesSet = `new Set([${propertyNames.map((p) => `"${p}"`).join(", ")}])`;
      const staticProperty = `  private static readonly __arrayProperties__: ReadonlySet<string> = ${arrayPropertiesSet};`;

      // Find the line with "defaults" and insert metadata after it
      const lines = code.split("\n");
      const defaultsIndex = lines.findIndex((line) =>
        line.includes("private static readonly defaults"),
      );

      if (defaultsIndex >= 0) {
        lines.splice(defaultsIndex + 1, 0, staticProperty);
        return { ok: true, value: lines.join("\n") };
      }
    }

    return { ok: true, value: code };
  })

  .build();

export default plugin;
