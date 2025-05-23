import {
  expression as e,
  BindingTemplateInstance,
  ExpressionTemplateInstance,
  isTemplateStringInstance,
  isBindingTemplateInstance,
} from "..";

type Argument<T> =
  | string
  | boolean
  | number
  | undefined
  | BindingTemplateInstance<T>
  | ExpressionTemplateInstance<T>;

const escapePrimitive = <T>(
  val: Exclude<
    Argument<T>,
    BindingTemplateInstance<T> | ExpressionTemplateInstance<T>
  >,
): string => {
  switch (typeof val) {
    case "string": {
      return `'${val}'`;
    }
    case "undefined": {
      return "null";
    }
    default: {
      return `${val}`;
    }
  }
};

const handleBindingOrExpression = (
  val: BindingTemplateInstance | ExpressionTemplateInstance,
) => {
  if (isBindingTemplateInstance(val)) {
    return val.toRefString();
  } else {
    return `(${val.toValue()})`;
  }
};

const handleArgument = <T>(arg: Argument<T>): string => {
  return isTemplateStringInstance(arg)
    ? handleBindingOrExpression(arg)
    : escapePrimitive(arg);
};

/**
 * Performs an assigment of a value to a binding by returning the expression
 * {{<binding>}} = <value>
 * @param binding
 * @param value
 */
export const assign = <T>(
  binding: BindingTemplateInstance<any>,
  value: Argument<T>,
): ExpressionTemplateInstance<void> => {
  return e`${binding} = ${isTemplateStringInstance(value) ? value : escapePrimitive(value)}`;
};

/**
 * Returns an equality comparison between the two values
 */
export const equals = <A, B>(
  a: Argument<A>,
  b: Argument<B>,
): ExpressionTemplateInstance<boolean> => {
  return e`${handleArgument(a)} == ${handleArgument(b)}`;
};

/**
 * Returns the negated version of the binding/expression
 * by returning !(<value>)
 * @param binding Binding/Expression to invert
 * @returns Negated binding/expression
 */
export const not = (
  value: BindingTemplateInstance<boolean> | ExpressionTemplateInstance<boolean>,
): ExpressionTemplateInstance<boolean> => {
  return e<boolean>`!(${value})`;
};

/**
 * Creates an expression for the logical or'ing of the provided values
 * e.g: <exp1> || <exp2> || ...
 * @param values Array of bindings/expressions to logically or
 * @returns boolean
 */
export const or = (
  ...values: Array<
    BindingTemplateInstance<boolean> | ExpressionTemplateInstance<boolean>
  >
): ExpressionTemplateInstance<boolean> => {
  return e`${values.map(handleBindingOrExpression).join(" || ")}` as ExpressionTemplateInstance<boolean>;
};

/**
 * Creates an expression for the logical nor'ing of the provided values
 * e.g: !(<exp1> || <exp2> || ...)
 * @param values Array of bindings/expressions to logically nor
 * @returns boolean
 */
export const nor = (
  ...values: Array<
    BindingTemplateInstance<boolean> | ExpressionTemplateInstance<boolean>
  >
): ExpressionTemplateInstance<boolean> => {
  return not(or(...values));
};

/**
 * Creates an expression for the logical and'ing of the provided values
 * e.g: <exp1> && <exp2> && ...
 * @param values Array of bindings/expressions to logically and
 * @returns boolean
 */
export const and = (
  ...values: Array<
    BindingTemplateInstance<boolean> | ExpressionTemplateInstance<boolean>
  >
): ExpressionTemplateInstance<boolean> => {
  return e`${values.map(handleBindingOrExpression).join(" && ")}` as ExpressionTemplateInstance<boolean>;
};

/**
 * Creates an expression for the logical nand'ing of the provided values
 * e.g: !(<exp1> && <exp2> && ...)
 * @param values Array of bindings/expressions to logically nand
 * @returns boolean
 */
export const nand = (
  ...values: Array<
    BindingTemplateInstance<boolean> | ExpressionTemplateInstance<boolean>
  >
): ExpressionTemplateInstance<boolean> => {
  return not(and(...values));
};
