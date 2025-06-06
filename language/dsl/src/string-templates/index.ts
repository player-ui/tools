import * as React from "react";
import { parseExpression, isErrorWithLocation } from "@player-ui/player";

export type TemplateInstanceRefStringContext = "binding" | "expression";
export interface TemplateRefStringOptions {
  /** If this template string is inside of another binding or expression */
  nestedContext?: TemplateInstanceRefStringContext;
}
export interface TemplateInstanceRefStringOptions {
  /** The array of strings for the template */
  strings: ReadonlyArray<string>;
  /** the other data that's present in the template */
  other: Array<string | TemplateStringType>;

  /** If this template string is inside of another binding or expression */
  nestedContext?: TemplateInstanceRefStringContext;

  /** Convert the value to a reference nested in the given context */
  toRefString: (
    options: TemplateRefStringOptions | undefined,
    value: string,
  ) => string;
}

const OpaqueIdentifier: unique symbol = Symbol("TemplateStringType");

export type TemplateStringType<
  T extends string | number | boolean | unknown = any,
> = React.ReactElement & {
  /** An identifier to show that this is a template type */
  [OpaqueIdentifier]: true;
  /** The value of the template string when in another string */
  toString: () => string;
  /** the raw value of the template string */
  toValue: () => string;
  /** the dereferenced value when used in another */
  toRefString: (options?: TemplateRefStringOptions) => T;
  /** Underlying type of this binding */
  type: T;
};

export type BindingTemplateInstance<
  DataType extends string | number | boolean | unknown = any,
> = TemplateStringType<DataType> & {
  /** An identifier for a binding instance */
  __type: "binding";
};

export type ExpressionTemplateInstance<
  ReturnType extends string | number | boolean | unknown = any,
> = TemplateStringType<ReturnType> & {
  /** The identifier for an expression instance */
  __type: "expression";
};

/** A react component for rendering a template string type */
export const TemplateStringComponent = (props: {
  /** The string value of the child template string */
  value: string;
}): React.ReactElement<{
  value: string;
}> => {
  return React.createElement(
    "value",
    {
      value: props.value,
    },
    null,
  );
};

/** The generic template string handler */
const createTemplateInstance = (
  options: TemplateInstanceRefStringOptions,
): TemplateStringType => {
  const value = options.strings.reduce((sum, next, i) => {
    const element = options.other[i];
    if (typeof element === "string") {
      return sum + next + element;
    }

    return sum + next + (element?.toRefString(options) ?? "");
  }, "");

  /** Try to parse the expression as valid */
  if (options.nestedContext === "expression") {
    try {
      parseExpression(value);
    } catch (e) {
      if (e instanceof Error) {
        let message: string;
        if (isErrorWithLocation(e)) {
          message = `${e} in expression: \r\n ${
            value.slice(0, e.index + 1) + "\u2588" + value.slice(e.index + 1)
          }`;
        } else {
          message = `${e} in expression ${value}`;
        }
        throw new Error(message);
      }

      throw new Error(`Unknown problem parsing expression ${e}`);
    }
  }

  /** get the unwrapped version */
  const toString = () => {
    return options.toRefString({}, value);
  };

  /** get the raw value of the template */
  const toValue = () => {
    return value;
  };

  /** This lets us use it directly as a child element in React */
  const element = React.createElement(
    TemplateStringComponent,
    {
      value: toString(),
    },
    null,
  ) as TemplateStringType;

  return {
    ...element,
    [OpaqueIdentifier]: true,
    toString,
    toValue,
    toRefString: (refStringOptions?: TemplateRefStringOptions) => {
      return options.toRefString(refStringOptions, value);
    },
  };
};

/** Helper for Iterating the binding to add a dynamic numeric value to each index found */
const addBindingIndexes = (binding: string): string => {
  let currentIndex = 0;

  return binding.replace(/_index_/g, () => {
    const result = `_index${currentIndex > 0 ? currentIndex : ""}_`;
    currentIndex += 1;

    return result;
  });
};

/** Creating an instance of a handler for bindings */
const createBindingTemplateInstance = (
  options: Omit<TemplateInstanceRefStringOptions, "toRefString">,
): BindingTemplateInstance => {
  const templateInstance = createTemplateInstance({
    ...options,
    strings: options.strings.map((element: string) =>
      addBindingIndexes(element),
    ),
    other: options.other.map((element) =>
      typeof element === "string" ? addBindingIndexes(element) : element,
    ),
    toRefString: (context, value) => {
      return `{{${value}}}`;
    },
  }) as BindingTemplateInstance;

  templateInstance.__type = "binding";

  return templateInstance;
};

/** Creating an instance of a handler for bindings */
const createExpressionTemplateInstance = (
  options: Omit<TemplateInstanceRefStringOptions, "toRefString">,
) => {
  const templateInstance = createTemplateInstance({
    ...options,
    toRefString: (contextOptions, value) => {
      if (contextOptions?.nestedContext === "expression") {
        return value;
      }

      const inBinding = contextOptions?.nestedContext === "binding";
      return `${inBinding ? "`" : "@["}${value}${inBinding ? "`" : "]@"}`;
    },
  }) as ExpressionTemplateInstance;

  templateInstance.__type = "expression";

  return templateInstance;
};

/** A tagged-template constructor for a binding  */
export const binding = <T>(
  strings: TemplateStringsArray,
  ...nested: Array<TemplateStringType | string>
): BindingTemplateInstance<T> => {
  return createBindingTemplateInstance({
    strings,
    other: nested,
    nestedContext: "binding",
  });
};

/** A tagged-template constructor for an expression */
export const expression = <T>(
  strings: TemplateStringsArray,
  ...nested: Array<
    ExpressionTemplateInstance | BindingTemplateInstance | string
  >
): ExpressionTemplateInstance<T> => {
  return createExpressionTemplateInstance({
    strings,
    other: nested,
    nestedContext: "expression",
  });
};

/** Check if a value is a template string */
export const isTemplateStringInstance = (
  val: unknown,
): val is ExpressionTemplateInstance | BindingTemplateInstance => {
  return (
    val !== null &&
    typeof val === "object" &&
    (val as any)[OpaqueIdentifier] === true
  );
};

/** Check if a value is a binding */
export const isBindingTemplateInstance = (
  val: unknown,
): val is BindingTemplateInstance => {
  return (
    val !== null &&
    typeof val === "object" &&
    (val as any)[OpaqueIdentifier] === true &&
    (val as BindingTemplateInstance).__type === "binding"
  );
};
