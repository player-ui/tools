import { test, expect, describe } from "vitest";
import {
  getObjectReferences,
  mapExpressionHandlersToFunctions,
  wrapFunctionInType,
} from "../utils";
import { Binding, Expression, ExpressionHandler } from "@player-ui/player";
import { binding, expression } from "../string-templates";
import { LocalBazType } from "./helpers/mock-data-refs";
import { DataTypeRefs } from "../types";
import { makeBindingsForObject } from "../compiler/schema";

describe("Testing the 'getObjectReferences' helper that creates same property references into a new object", () => {
  test("should return the object properties in referenced format", () => {
    const dataTypes = {
      LocalBazType,
    };

    const validators = {
      required: {
        type: "required",
      },
    };

    type DTREF = DataTypeRefs<typeof dataTypes>;

    const dataReferences = getObjectReferences<typeof dataTypes, DTREF>(
      dataTypes,
    );

    type VALREF = DataTypeRefs<typeof validators>;
    const validatorReferences = getObjectReferences<typeof validators, VALREF>(
      validators,
    );

    expect(dataReferences.LocalBazTypeRef).toStrictEqual({
      type: "LocalBazType",
    });
    expect(validatorReferences.requiredRef).toStrictEqual({ type: "required" });
  });
});

describe("DSL Expression Generation Helper", () => {
  test("Returns the correct serialization for bindings", () => {
    const mockFunction: ExpressionHandler<[Binding], boolean> = (ctx, val) => {
      return false;
    };

    const mockFunctionDSL = wrapFunctionInType(mockFunction);

    const foo = binding`some.binding`;
    const test = expression`${mockFunctionDSL(foo)} == true`;

    expect(test.toValue()).toEqual("mockFunction('some.binding') == true");
  });

  test("Returns the correct serialization for mixed values and bindings", () => {
    const mockFunction: ExpressionHandler<[string, string, number], boolean> = (
      ctx,
      val,
    ) => {
      return false;
    };

    const mockFunctionDSL = wrapFunctionInType(mockFunction);

    const foo = binding`some.binding`;
    const test = expression`${mockFunctionDSL(foo.toRefString(), "test", 1)} == true`;

    expect(test.toValue()).toEqual(
      "mockFunction('{{some.binding}}', 'test', 1) == true",
    );
  });

  test("Returns the correct serialization for array items", () => {
    const mockFunction: ExpressionHandler<[Array<unknown>], boolean> = (
      ctx,
      val,
    ) => {
      return false;
    };

    const mockFunctionDSL = wrapFunctionInType(mockFunction);

    const foo = binding`some.binding`;
    const test = expression`${mockFunctionDSL([1, "2", foo])}`;

    expect(test.toValue()).toEqual(
      "mockFunction([1, '2', '{{some.binding}}'])",
    );
  });

  test("Can Dereferenced Binding", () => {
    const mockFunction: ExpressionHandler<[boolean], boolean> = (ctx, val) => {
      return false;
    };

    const mockFunctionDSL = wrapFunctionInType(mockFunction);

    const foo = binding`some.binding`;
    const test = expression`${mockFunctionDSL(foo.toRefString())} == true`;

    expect(test.toValue()).toEqual("mockFunction('{{some.binding}}') == true");
  });

  test("Can Pass Nested Expressions", () => {
    const mockFunction: ExpressionHandler<[Expression, number], boolean> = (
      ctx,
      val,
    ) => {
      return false;
    };

    const mockFunctionDSL = wrapFunctionInType(mockFunction);

    const foo = binding`foo.bar`;
    const bar = expression`${foo} != 1`;
    const test = expression`${mockFunctionDSL(bar, 1)}`;

    expect(test.toValue()).toEqual("mockFunction('{{foo.bar}} != 1', 1)");
  });

  test("Export Generator", () => {
    const mockFunction: ExpressionHandler<[string, number], boolean> = (
      ctx,
      val,
    ) => {
      return false;
    };
    const expressionFunctions = { mockFunction };

    const usableFunctions =
      mapExpressionHandlersToFunctions<typeof expressionFunctions>(
        expressionFunctions,
      );

    expect(usableFunctions.mockFunction("1", 0).toValue()).toMatch(
      "mockFunction('1', 0)",
    );
  });

  test("Return Type Chaining", () => {
    const mockFunction: ExpressionHandler<[string, number], string> = (
      ctx,
      val,
    ) => {
      return "false";
    };

    const mockFunction2: ExpressionHandler<[string], boolean> = (ctx, val) => {
      return false;
    };
    const expressionFunctions = { mockFunction, mockFunction2 };

    const usableFunctions =
      mapExpressionHandlersToFunctions<typeof expressionFunctions>(
        expressionFunctions,
      );

    expect(
      usableFunctions
        .mockFunction2(usableFunctions.mockFunction("1", 0).toValue())
        .toValue(),
    ).toMatch("mockFunction2('mockFunction('1', 0)')");
  });

  test("Works with DSL Schema", () => {
    const mockFunction: ExpressionHandler<[string, boolean], string> = (
      ctx,
      val,
    ) => {
      return "false";
    };

    const dataTypes = { LocalBazType };

    type DTREF = DataTypeRefs<typeof dataTypes>;

    const refableTypes = getObjectReferences<typeof dataTypes, DTREF>(
      dataTypes,
    );

    const data = {
      some: {
        value: refableTypes.LocalBazTypeRef,
      },
    };

    const schema = makeBindingsForObject(data);
    const expressionFunctions = { mockFunction };

    const usableFunctions =
      mapExpressionHandlersToFunctions<typeof expressionFunctions>(
        expressionFunctions,
      );

    expect(
      usableFunctions
        .mockFunction("1", schema.some.value.toRefString())
        .toValue(),
    ).toMatch("mockFunction('1', '{{some.value}}')");
  });
});
