import {
  isTaggedTemplateValue,
  TaggedTemplateValueSymbol,
  type TemplateRefOptions,
  type TaggedTemplateValue,
} from "./types";
import { parseExpression, isErrorWithLocation } from "@player-ui/player";

/**
 * Tagged template for creating binding expressions
 * Used to generate template strings with proper binding syntax
 * @param strings - Template string parts
 * @param expressions - Values to interpolate
 * @returns TaggedTemplateValue with binding context
 */
export function binding(
  strings: TemplateStringsArray,
  ...expressions: Array<unknown>
): TaggedTemplateValue {
  // Index counter for replacements
  let indexCounter = 0;

  /**
   * Replaces index placeholders with unique identifiers
   */
  const processValue = (val: string): string => {
    if (!val.includes("_index_")) return val;

    return val.replace(/_index_/g, () => {
      const suffix = indexCounter > 0 ? indexCounter : "";
      indexCounter++;
      return `_index${suffix}_`;
    });
  };

  let result = "";
  const len = strings.length;

  for (let i = 0; i < len; i++) {
    result += processValue(strings[i]);

    if (i < expressions.length) {
      const expr = expressions[i];

      if (isTaggedTemplateValue(expr)) {
        const refStr = expr.toRefString();
        if (refStr.startsWith("@[")) {
          // Expression template in binding context
          result += expr.toRefString({ nestedContext: "binding" });
        } else {
          // Binding template retains braces
          result += expr.toString();
        }
      } else if (typeof expr === "string") {
        // Apply index replacements to string expressions
        result += processValue(expr);
      } else {
        // Convert other values to string
        result += String(expr);
      }
    }
  }

  const templateValue: TaggedTemplateValue = {
    [TaggedTemplateValueSymbol]: true,

    toValue(): string {
      return result;
    },

    toRefString(options?: TemplateRefOptions): string {
      // No additional braces needed in binding context
      if (options?.nestedContext === "binding") {
        return result;
      }
      // Add braces in other contexts
      return `{{${result}}}`;
    },

    toString(): string {
      return `{{${result}}}`;
    },
  };

  return templateValue;
}

/**
 * Tagged template for creating expression literals
 * Used for generating expressions with proper validation and formatting
 * @param strings - Template string parts
 * @param expressions - Values to interpolate
 * @returns TaggedTemplateValue with expression context
 * @throws Error if expression syntax is invalid
 */
export function expression(
  strings: TemplateStringsArray,
  ...expressions: Array<unknown>
): TaggedTemplateValue {
  let result = "";
  const len = strings.length;

  for (let i = 0; i < len; i++) {
    result += strings[i];

    if (i < expressions.length) {
      const expr = expressions[i];
      if (isTaggedTemplateValue(expr)) {
        // Use appropriate reference formatting for nested templates
        result += expr.toRefString({ nestedContext: "expression" });
      } else {
        // Convert other values to string
        result += String(expr);
      }
    }
  }

  /** Try to parse the expression as valid */
  try {
    parseExpression(result);
  } catch (e) {
    if (e instanceof Error) {
      let message: string;
      if (isErrorWithLocation(e)) {
        message = `${e} in expression: \r\n ${
          result.slice(0, e.index + 1) + "\u2588" + result.slice(e.index + 1)
        }`;
      } else {
        message = `${e} in expression ${result}`;
      }
      throw new Error(message);
    }

    throw new Error(`Unknown problem parsing expression ${e}`);
  }

  return {
    [TaggedTemplateValueSymbol]: true,

    toValue(): string {
      return result;
    },

    toRefString(options?: TemplateRefOptions): string {
      if (options?.nestedContext === "binding") {
        return `\`${result}\``;
      } else if (options?.nestedContext === "expression") {
        return result;
      }
      return `@[${result}]@`;
    },

    toString(): string {
      return `@[${result}]@`;
    },
  };
}
