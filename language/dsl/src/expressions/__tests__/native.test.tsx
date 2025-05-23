import { test, expect, describe } from "vitest";
import {
  and,
  assign,
  binding as b,
  expression as e,
  equals,
  nand,
  nor,
  not,
  or,
} from "../../";

describe("assign", () => {
  test("string", () => {
    const binding = b`foo.bar`;
    expect(assign(binding, "1").toValue()).toStrictEqual("{{foo.bar}} = '1'");
  });
  test("number", () => {
    const binding = b`foo.bar`;
    expect(assign(binding, 1).toValue()).toStrictEqual("{{foo.bar}} = 1");
  });
  test("boolean", () => {
    const binding = b`foo.bar`;
    expect(assign(binding, true).toValue()).toStrictEqual("{{foo.bar}} = true");
  });
  test("undefined", () => {
    const binding = b`foo.bar`;
    expect(assign(binding, undefined).toValue()).toStrictEqual(
      "{{foo.bar}} = null",
    );
  });
});

describe("not", () => {
  test("binding", () => {
    const binding = b<boolean>`foo.bar`;
    expect(not(binding).toValue()).toStrictEqual("!({{foo.bar}})");
  });
  test("expression", () => {
    const expression = e<boolean>`${b`foo.bar`} = true`;

    expect(not(expression).toValue()).toStrictEqual("!({{foo.bar}} = true)");
  });
});

describe("and", () => {
  test("bindings", () => {
    const binding = b<boolean>`foo.bar`;
    const binding2 = b<boolean>`foo.baz`;
    expect(and(binding, binding2).toValue()).toStrictEqual(
      "{{foo.bar}} && {{foo.baz}}",
    );
  });

  test("expressions", () => {
    const expression = e<boolean>`${b`foo.bar`} == true`;
    const expression2 = e<boolean>`${b`foo.baz`} == '1'`;
    expect(and(expression, expression2).toValue()).toStrictEqual(
      "({{foo.bar}} == true) && ({{foo.baz}} == '1')",
    );
  });
});

describe("or", () => {
  test("bindings", () => {
    const binding = b<boolean>`foo.bar`;
    const binding2 = b<boolean>`foo.baz`;
    expect(or(binding, binding2).toValue()).toStrictEqual(
      "{{foo.bar}} || {{foo.baz}}",
    );
  });

  test("expressions", () => {
    const expression = e<boolean>`${b`foo.bar`} == true`;
    const expression2 = e<boolean>`${b`foo.baz`} == '1'`;
    expect(or(expression, expression2).toValue()).toStrictEqual(
      "({{foo.bar}} == true) || ({{foo.baz}} == '1')",
    );
  });
});

describe("nand", () => {
  test("bindings", () => {
    const binding = b<boolean>`foo.bar`;
    const binding2 = b<boolean>`foo.baz`;
    expect(nand(binding, binding2).toValue()).toStrictEqual(
      "!({{foo.bar}} && {{foo.baz}})",
    );
  });

  test("expressions", () => {
    const expression = e<boolean>`${b`foo.bar`} == true`;
    const expression2 = e<boolean>`${b`foo.baz`} == '1'`;
    expect(nand(expression, expression2).toValue()).toStrictEqual(
      "!(({{foo.bar}} == true) && ({{foo.baz}} == '1'))",
    );
  });
});

describe("nor", () => {
  test("bindings", () => {
    const binding = b<boolean>`foo.bar`;
    const binding2 = b<boolean>`foo.baz`;
    expect(nor(binding, binding2).toValue()).toStrictEqual(
      "!({{foo.bar}} || {{foo.baz}})",
    );
  });

  test("expressions", () => {
    const expression = e<boolean>`${b`foo.bar`} == true`;
    const expression2 = e<boolean>`${b`foo.baz`} == '1'`;
    expect(nor(expression, expression2).toValue()).toStrictEqual(
      "!(({{foo.bar}} == true) || ({{foo.baz}} == '1'))",
    );
  });
});

describe("equals", () => {
  test("binding-string", () => {
    const binding = b`foo.bar`;
    expect(equals(binding, "1").toValue()).toStrictEqual("{{foo.bar}} == '1'");
  });

  test("binding-number", () => {
    const binding = b`foo.bar`;
    expect(equals(binding, 1).toValue()).toStrictEqual("{{foo.bar}} == 1");
  });

  test("binding-boolean", () => {
    const binding = b`foo.bar`;
    expect(equals(binding, true).toValue()).toStrictEqual(
      "{{foo.bar}} == true",
    );
  });

  test("binding-undefined", () => {
    const binding = b`foo.bar`;
    expect(equals(binding, undefined).toValue()).toStrictEqual(
      "{{foo.bar}} == null",
    );
  });

  test("bindings", () => {
    const binding = b<boolean>`foo.bar`;
    const binding2 = b<boolean>`foo.baz`;
    expect(equals(binding, binding2).toValue()).toStrictEqual(
      "{{foo.bar}} == {{foo.baz}}",
    );
  });

  test("expressions", () => {
    const expression = e<boolean>`${b`foo.bar`} == true`;
    const expression2 = e<boolean>`${b`foo.baz`} == '1'`;
    expect(equals(expression, expression2).toValue()).toStrictEqual(
      "({{foo.bar}} == true) == ({{foo.baz}} == '1')",
    );
  });
});
