import { test, expect } from "vitest";
import { expression as e } from "..";

test("works with nested expressions", () => {
  const exp1 = e`foo() == bar()`;
  const exp2 = e`conditional(${exp1})`;

  expect(exp2.toString()).toBe(`@[conditional(foo() == bar())]@`);
});

test("throws errors for syntactically wrong expressions", () => {
  expect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const exp = e`something(1,2`;
  }).toThrowErrorMatchingInlineSnapshot(`
    [Error: Error: Expected ) at character 13 in expression: 
     something(1,2█]
  `);
});
