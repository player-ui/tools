import { isTaggedTemplateValue, TAGGED_TEMPLATE_MARKER } from "../types";
import type { TaggedTemplateValue, TemplateRefOptions } from "../types";

/**
 * Tagged template for creating expression literals
 * Used for generating expressions with proper validation and formatting
 * @param strings - Template string parts
 * @param expressions - Values to interpolate
 * @returns TaggedTemplateValue with expression context
 * @throws Error if expression syntax is invalid
 */
export function expression<T = unknown>(
  strings: TemplateStringsArray,
  ...expressions: Array<unknown>
): TaggedTemplateValue<T> {
  /**
   * Validates expression syntax with balanced parentheses
   * @throws Error if parentheses are unbalanced
   */
  const validateSyntax = (expr: string): void => {
    let openParens = 0;
    // Use position counter to match original behavior exactly
    let position = 0;

    // Validation loop using position counter
    for (const char of expr) {
      if (char === "(") openParens++;
      if (char === ")") openParens--;
      position++;

      if (openParens < 0) {
        throw new Error(
          `Error: Unexpected ) at character ${position} in expression: \n ${expr.slice(
            0,
            position,
          )}█${expr.slice(position)}`,
        );
      }
    }

    if (openParens > 0) {
      throw new Error(
        `Error: Expected ) at character ${position} in expression: \n ${expr}█`,
      );
    }
  };

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

  validateSyntax(result);

  return {
    [TAGGED_TEMPLATE_MARKER]: true,

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
