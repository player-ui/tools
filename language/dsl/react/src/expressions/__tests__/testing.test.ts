import { describe, expect, test } from "vitest";
import { expression as e } from "../../string-templates";
import { testExpression } from "../testing";
import { ExpressionHandler, withoutContext } from "@player-ui/player";

describe("expression testing", () => {
  const initialModel = {
    foo: {
      bar: {
        a: "1",
        b: 2,
        c: false,
      },
    },
  };

  test("basic operations", () => {
    const exp = e`{{foo.bar.a}} = "test"`;
    const result = testExpression(exp, initialModel);
    expect(result).toStrictEqual({
      foo: { bar: { a: "test", b: 2, c: false } },
    });
  });

  test("custom function", () => {
    const exp = e`{{foo.bar.c}} = not({{foo.bar.c}})`;

    const mockExpression: ExpressionHandler<[boolean], boolean> =
      withoutContext((arg) => {
        return !arg;
      });
    const expressionMap = new Map([["not", mockExpression]]);
    const result = testExpression(exp, initialModel, expressionMap);
    expect(result).toStrictEqual({
      foo: { bar: { a: "1", b: 2, c: true } },
    });
  });
});
