import { Node, TypeNode, EnumDeclaration } from "ts-morph";
import type { PropertyInfo, ObjectProperty } from "../types.js";
import type { ExtractorContext } from "../core/ExtractorContext.js";
import type {
  AnalysisOptions,
  TypeAnalyzer,
} from "../analyzers/TypeAnalyzer.js";
import { UtilityTypeExpander } from "./UtilityTypeExpander.js";
import {
  extractStringLiteralUnion,
  getTypeReferenceName,
} from "../utils/index.js";
import { SymbolResolver } from "../resolvers/SymbolResolver.js";

/**
 * Expands Record<K, V> utility type.
 * Creates an object type with keys K and values V.
 */
export class RecordExpander extends UtilityTypeExpander {
  constructor(private readonly typeAnalyzer: TypeAnalyzer) {
    super();
  }

  getTypeName(): string {
    return "Record";
  }

  expand({
    name,
    typeArgs,
    context,
    options = {},
  }: {
    name: string;
    typeArgs: TypeNode[];
    context: ExtractorContext;
    options: AnalysisOptions;
  }): PropertyInfo | null {
    if (!this.validateTypeArguments(typeArgs, 2)) {
      return null;
    }

    const keyType = typeArgs[0]!;
    const valueType = typeArgs[1]!;

    // If it's Record<string, unknown> or Record<string, any>, return and
    // empty property array and acceptsUnknownProperties = true.
    if (
      keyType.getText() === "string" &&
      (valueType.getText() === "unknown" || valueType.getText() === "any")
    ) {
      const objectProperty: ObjectProperty = {
        type: "object",
        kind: "non-terminal",
        name,
        typeAsString: `Record<string, ${valueType.getText()}>`,
        properties: [],
        acceptsUnknownProperties: true,
        ...(options.isArray ? { isArray: true } : {}),
        ...(options.isOptional ? { isOptional: true } : {}),
      };
      return objectProperty;
    }

    // Extract possible keys - handle enums and literal unions
    const keys = this.extractKeys(keyType, context);
    const properties: PropertyInfo[] = [];

    // Create properties for each key
    for (const key of keys) {
      const valueProperty = this.typeAnalyzer.analyze({
        name: String(key),
        typeNode: valueType,
        context,
      });

      if (valueProperty) {
        properties.push(valueProperty);
      }
    }

    // If we can't extract specific keys, create a generic representation
    if (properties.length === 0) {
      const genericValueProperty = this.typeAnalyzer.analyze({
        name: "value",
        typeNode: valueType,
        context,
      });
      if (genericValueProperty) {
        properties.push(genericValueProperty);
      }
    }

    const typeAsString = `Record<${keyType.getText()}, ${valueType.getText()}>`;

    const objectProperty: ObjectProperty = {
      type: "object",
      kind: "non-terminal",
      name,
      typeAsString,
      properties,
      ...(options.isArray ? { isArray: true } : {}),
      ...(options.isOptional ? { isOptional: true } : {}),
    };

    return objectProperty;
  }

  /** Extract keys from the key type (handles enums and literal unions). */
  private extractKeys(
    keyType: TypeNode,
    context: ExtractorContext,
  ): (string | number)[] {
    // Handle string literal unions first
    const literalKeys = extractStringLiteralUnion(keyType);
    if (literalKeys.length > 0) {
      return literalKeys;
    }

    // Handle type references (enums)
    if (Node.isTypeReference(keyType)) {
      const typeName = getTypeReferenceName(keyType);

      if (typeName) {
        const enumKeys = this.extractEnumKeys(typeName, context);
        if (enumKeys.length > 0) {
          return enumKeys;
        }
      }
    }

    return [];
  }

  /** Extract keys from an enum type. */
  private extractEnumKeys(
    enumName: string,
    context: ExtractorContext,
  ): (string | number)[] {
    const symbolResolver = new SymbolResolver(context);
    const resolvedSymbol = symbolResolver.resolve(enumName);

    if (resolvedSymbol && Node.isEnumDeclaration(resolvedSymbol.declaration)) {
      const enumDecl = resolvedSymbol.declaration as EnumDeclaration;
      const enumMembers = enumDecl.getMembers();

      return enumMembers.map((member) => {
        const value = member.getValue();
        return value !== undefined ? value : member.getName();
      });
    }

    return [];
  }
}
