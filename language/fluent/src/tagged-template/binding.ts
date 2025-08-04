import {
  isTaggedTemplateValue,
  TAGGED_TEMPLATE_MARKER,
  type TaggedTemplateValue,
  type TemplateRefOptions,
} from "../types";

/**
 * Tagged template for creating binding expressions with optional type information
 * Used to generate template strings with proper binding syntax
 * @param strings - Template string parts
 * @param expressions - Values to interpolate
 * @returns TaggedTemplateValue with optional phantom type T
 *
 * @example
 * ```typescript
 * // Basic usage (backward compatible)
 * const basicBinding = binding`data.count`;
 *
 * // With phantom type for TypeScript type checking
 * const typedBinding = binding<number>`data.count`;
 * ```
 */
export function binding<T = unknown>(
  strings: TemplateStringsArray,
  ...expressions: Array<unknown>
): TaggedTemplateValue<T> {
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

  const templateValue: TaggedTemplateValue<T> = {
    [TAGGED_TEMPLATE_MARKER]: true,
    _phantomType: undefined as T | undefined,

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
