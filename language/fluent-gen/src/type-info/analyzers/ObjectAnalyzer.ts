import { Node, TypeNode, PropertySignature } from "ts-morph";
import {
  type PropertyInfo,
  type ObjectProperty,
  isObjectProperty,
  isUnionProperty,
} from "../types.js";
import type { ExtractorContext } from "../core/ExtractorContext.js";
import type {
  TypeAnalysisStrategy,
  AnalysisOptions,
  TypeAnalyzer,
} from "./TypeAnalyzer.js";
import { extractJSDocFromNode } from "../utils/jsdoc.js";

/** Analyzes inline object types (type literals like { foo: string; bar: number }). */
export class ObjectAnalyzer implements TypeAnalysisStrategy {
  constructor(private readonly typeAnalyzer: TypeAnalyzer) {}

  canHandle(typeNode: TypeNode): boolean {
    return Node.isTypeLiteral(typeNode);
  }

  analyze({
    name,
    typeNode,
    context,
    options = {},
  }: {
    name: string;
    typeNode: TypeNode;
    context: ExtractorContext;
    options: AnalysisOptions;
  }): PropertyInfo | null {
    if (!Node.isTypeLiteral(typeNode)) {
      return null;
    }

    const properties: PropertyInfo[] = [];
    const members = typeNode.getMembers();

    // Analyze each property in the type literal
    for (const member of members) {
      if (Node.isPropertySignature(member)) {
        const memberProperty = this.analyzePropertyMember({
          member,
          context,
          parentOptions: options,
        });
        if (memberProperty) {
          properties.push(memberProperty);
        }
      }

      if (Node.isMethodSignature(member)) {
        properties.push({
          kind: "terminal",
          type: "method",
          name: member.getName(),
          typeAsString: member.getType().getText(),
          ...(member.hasQuestionToken() ? { isOptional: true } : {}),
        });
      }
    }
    // Determine if the object accepts unknown properties (index signature)
    const hasIndexSignature = members.some((m) =>
      Node.isIndexSignatureDeclaration(m),
    );
    const acceptsUnknownProperties = hasIndexSignature;

    if (properties.length === 0 && !acceptsUnknownProperties) {
      // Empty object type, treat as unknown
      return {
        kind: "terminal",
        type: "unknown",
        typeAsString: typeNode.getText(),
        name,
        ...(options.isOptional ? { isOptional: true } : {}),
        ...(options.isArray ? { isArray: true } : {}),
      };
    }

    const objectProperty: ObjectProperty = {
      kind: "non-terminal",
      type: "object",
      name,
      typeAsString: typeNode.getText(),
      properties,
      ...(options.isArray ? { isArray: true } : {}),
      ...(options.isOptional ? { isOptional: true } : {}),
    };

    return objectProperty;
  }

  /** Analyze a single property member within a type literal. */
  private analyzePropertyMember({
    member,
    context,
    parentOptions,
  }: {
    member: PropertySignature;
    context: ExtractorContext;
    parentOptions: AnalysisOptions;
  }): PropertyInfo | null {
    const memberTypeNode = member.getTypeNode();

    if (!memberTypeNode) {
      return null;
    }

    const memberName = member.getName();
    const isOptional = member.hasQuestionToken();
    const documentation = extractJSDocFromNode(member);

    const memberProperty = this.typeAnalyzer.analyze({
      name: memberName,
      typeNode: memberTypeNode,
      context,
      options: {
        ...parentOptions,
        isOptional,
        isArray: false, // Reset array flag for nested properties
      },
    });

    if (
      memberProperty &&
      documentation &&
      (isObjectProperty(memberProperty) || isUnionProperty(memberProperty))
    ) {
      memberProperty.documentation = documentation;
    }

    return memberProperty;
  }
}
