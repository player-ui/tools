import { test, expect, describe } from "vitest";
import { getObjectReferences, wrapFunctionInType } from "../utils";
import { Expression, ExpressionHandler } from "@player-ui/player";
import { binding, expression } from "../string-templates";

describe("Testing the 'getObjectReferences' helper that creates same property references into a new object", () => {
  test("should return the object properties in referenced format", () => {
    const dataTypes = {
      BooleanType: {
        type: "BooleanType",
      },
    };

    const validators = {
      required: {
        type: "required",
      },
    };

    const dataReferences = getObjectReferences(dataTypes);
    const validatorReferences = getObjectReferences(validators);

    expect(dataReferences.BooleanTypeRef).toStrictEqual({
      type: "BooleanType",
    });
    expect(validatorReferences.requiredRef).toStrictEqual({ type: "required" });
  });
});

describe("DSL Generation Helper", () => {
  test("Returns the correct serialization for bindings", () => {
    const mockFunction: ExpressionHandler<[unknown], boolean> = (ctx, val) => {
      return false;
    };

    const mockFunctionDSL = wrapFunctionInType(mockFunction);

    const foo = binding`some.binding`;
    const test = expression`${mockFunctionDSL(foo)} == true`;

    expect(test.toValue()).toEqual("mockFunction('some.binding') == true");
  });

  test("Returns the correct serialization for mixed values and bindings", () => {
    const mockFunction: ExpressionHandler<
      [unknown, string, number],
      boolean
    > = (ctx, val) => {
      return false;
    };

    const mockFunctionDSL = wrapFunctionInType(mockFunction);

    const foo = binding`some.binding`;
    const test = expression`${mockFunctionDSL(foo, "test", 1)} == true`;

    expect(test.toValue()).toEqual(
      "mockFunction('some.binding', 'test', 1) == true",
    );
  });

  test("Returns the correct serialization for array items", () => {
    const mockFunction: ExpressionHandler<[Array<unknown>], boolean> = (ctx, val) => {
      return false;
    };

    const mockFunctionDSL = wrapFunctionInType(mockFunction);

    const foo = binding`some.binding`;
    const test = expression`${mockFunctionDSL([1, "2", foo.toRefString()])}`;

    expect(test.toValue()).toEqual(
      "mockFunction([1, '2', '{{some.binding}}'])",
    );
  });

  test("Can Pass dereferenced Binding", () => {
    const mockFunction: ExpressionHandler<[string], boolean> = (ctx, val) => {
      return false;
    };

    const mockFunctionDSL = wrapFunctionInType(mockFunction);

    const foo = binding`some.binding`;
    const test = expression`${mockFunctionDSL(foo.toRefString())} == true`;

    expect(test.toValue()).toEqual("mockFunction('{{some.binding}}') == true");
  });

  test("Can Pass nested Expressions", () => {
    const mockFunction: ExpressionHandler<[Expression, number], boolean> = (ctx, val) => {
      return false;
    };

    const mockFunctionDSL = wrapFunctionInType(mockFunction);

    const foo = binding`foo.bar`;
    const bar = expression`${foo} != 1`;
    const test = expression`${mockFunctionDSL(bar, 1)}`;

    expect(test.toValue()).toEqual("mockFunction('{{foo.bar}} != 1', 1)");
  });
});
