import { Node, EnumDeclaration, EnumMember } from "ts-morph";
import type { PropertyInfo, Declaration } from "../../types.js";
import {
  BaseDeclarationAnalysisStrategy,
  type DeclarationAnalysisContext,
} from "./DeclarationAnalysisStrategy.js";
import { PropertyFactory } from "../../factories/PropertyFactory.js";
import { extractJSDocFromNode } from "../../utils/jsdoc.js";
import { logAnalysisWarning } from "../utils.js";

/** Strategy for analyzing enum declarations. */
export class EnumAnalysisStrategy extends BaseDeclarationAnalysisStrategy {
  canHandle(declaration: Declaration): boolean {
    return Node.isEnumDeclaration(declaration);
  }

  analyze(context: DeclarationAnalysisContext): PropertyInfo | null {
    const declaration = context.declaration;
    if (!Node.isEnumDeclaration(declaration)) {
      return null;
    }

    try {
      this.addDependency(context, context.typeName);

      const enumValues = this.extractEnumValues(declaration);
      const documentation = extractJSDocFromNode(declaration);

      if (enumValues.length === 0) {
        logAnalysisWarning(
          "EnumAnalysisStrategy",
          `Enum has no values: ${context.typeName}`,
          { enumName: declaration.getName() },
        );
        return PropertyFactory.createFallbackProperty({
          name: context.name,
          typeAsString: context.typeAsString,
          options: context.options,
        });
      }

      return PropertyFactory.createEnumProperty({
        name: context.name,
        enumName: context.typeName,
        values: enumValues,
        options: context.options,
        ...(documentation && { documentation }),
      });
    } catch (error) {
      logAnalysisWarning(
        "EnumAnalysisStrategy",
        `Error analyzing enum: ${context.typeName}`,
        {
          error: error instanceof Error ? error.message : String(error),
          enumName: declaration.getName(),
        },
      );

      return PropertyFactory.createFallbackProperty({
        name: context.name,
        typeAsString: context.typeAsString,
        options: context.options,
      });
    }
  }

  getName(): string {
    return "EnumAnalysisStrategy";
  }

  /** Extract values from an enum declaration. */
  private extractEnumValues(enumDecl: EnumDeclaration): (string | number)[] {
    const values: (string | number)[] = [];

    try {
      for (const member of enumDecl.getMembers()) {
        const value = this.getEnumMemberValue(member);
        if (value !== undefined) {
          values.push(value);
        }
      }
    } catch (error) {
      logAnalysisWarning(
        "EnumAnalysisStrategy",
        `Error extracting enum values from: ${enumDecl.getName()}`,
        {
          error: error instanceof Error ? error.message : String(error),
          enumName: enumDecl.getName(),
        },
      );
    }

    return values;
  }

  /** Get the value of an enum member, handling different enum types. */
  private getEnumMemberValue(member: EnumMember): string | number | undefined {
    try {
      // Try to get the computed value first
      const value = member.getValue();
      if (typeof value === "string" || typeof value === "number") {
        return value;
      }

      // If no explicit value, use the member name for string enums
      const memberName = member.getName();
      if (typeof memberName === "string") {
        return memberName;
      }
    } catch {
      // If we can't get the value, try to use the member name as fallback
      try {
        const memberName = member.getName();
        if (typeof memberName === "string") {
          return memberName;
        }
      } catch {
        // Last resort: use a placeholder
        return "<enum-member>";
      }
    }

    return undefined;
  }
}
