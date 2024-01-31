import { test, expect, describe, vi } from "vitest";
import { setupTestEnv } from "@player-tools/xlr-utils";
import { TsConverter } from "..";

describe("Type Exports", () => {
  vi.setConfig({
    testTimeout: 60 * 10000,
  });

  test("Basic Array Type", () => {
    const sc = `
    export type Foo = Array<string>
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Basic Union Type", () => {
    const sc = `
    export type Foo = number | string
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });
});

describe("Interface Exports", () => {
  test("Basic Interface Type", () => {
    const sc = `
    export interface Foo {
      bar: string
      bax: number
    }
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Interface with Optional parameters", () => {
    const sc = `
    export interface Foo {
      bar: string
      bax?: number
    }
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Interface with Inheritance", () => {
    const sc = `

    interface Base {
      baw: any
    }

    export interface Foo extends Base {
      bar: string
      bax?: number
    }
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Implementing more than one Interfaces", () => {
    const sc = `

    interface Foo{
      foo: number
    }

    interface Bar{
      bar: string
    }

    export interface Test extends Foo, Bar {
      test: any
    }

    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });
});

describe("Generic Declarations", () => {
  test("Basic Generic Type", () => {
    const sc = `
    export type Foo<T> = string | T
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Generic with Constraints", () => {
    const sc = `
    export type Foo<T extends string = string > = number | T
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Implementing Generic Type", () => {
    const sc = `
    type Foo<T> = string | T

    export type Bar = boolean | Foo<number>
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Interface with Generics", () => {
    const sc = `

    export interface Foo<T>{
      bar: T
    }
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Interface with Generics and Constraints", () => {
    const sc = `

    export interface Foo<T extends string = string>{
      bar: T
    }
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Implementing Interface with Generics", () => {
    const sc = `

    interface Base<T extends string = string>{
      bar: T
    }

    interface Foo extends Bar<"test"> {
      bam: number
    }

    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Implementing an generic wrapped interface", () => {
    const sc = `

    interface base {
      foo: number
      bar: string
    }

    export interface Test extends Pick<base,"bar"> {
      test: any
    }

    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });
});

describe("Complex Types", () => {
  test("Pick", () => {
    const sc = `
    interface foo {
      bar: string
      bax: number
    }
    export type Bar = Pick<foo,"bar">
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Pick with interface union", () => {
    const sc = `
    interface foo {
      far: string
      fax: number
    }

    interface boo {
      far: number,
      bax: boolean
    }

    type test = foo | boo

    export type Bar = Pick<test,"far">
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Pick with interface intersection", () => {
    const sc = `
    interface foo {
      far: string
      fax: number
    }

    interface boo {
      far: string,
      bax: boolean
    }

    type test = foo | boo

    export type Bar = Pick<test,"far">
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Omit", () => {
    const sc = `
    interface foo {
      bar: string
      bax: number
    }
    export type Bar = Omit<foo,"bar">
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Omit with type union", () => {
    const sc = `
    interface foo {
      far: string
      fax: number
    }
    
    interface boo {
      far: string,
      bax: boolean
    }
    
    type test = foo |  boo
    
    export type Bar = Omit<test,"bax">
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Omit with type intersection", () => {
    const sc = `
    interface foo {
      far: string
      fax: number
    }
    
    interface boo {
      far: string,
      bax: boolean
    }
    
    type test = foo & boo
    
    export type Bar = Omit<test,"far">
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Exclude with primitives", () => {
    const sc = `
    const foo = ['a', 'b', 'c'] as const;

    type fooType = typeof foo[number];
    
    export type bar = Exclude<fooType, 'a'>;
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Exclude with objects", () => {
    const sc = `
    type foo = { type: 'a'; value: string } | { type: 'b'; value: number } | { type: 'c'; value: boolean };

    export type bar = Exclude<foo, { type: 'a' }>;
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Exclude with objects collapses single remaining element", () => {
    const sc = `
    type foo = { type: 'a'; value: string } | { type: 'b'; value: number };

    export type bar = Exclude<foo, { type: 'a' }>;
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });
});

describe("String Templates", () => {
  test("Basic", () => {
    const sc =
      "export type Bar = `String is a ${string}, number is a ${number} and boolean is a ${boolean}`";

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Type References", () => {
    const sc =
      "type Foo = string; export type Bar = `String is a ${Foo}, number is a ${number} and boolean is a ${boolean}`";

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });
});

describe("Index Types", () => {
  test("Basic", () => {
    const sc = `
    interface base {
      foo: string;
      bar: number;
    }

    export interface test {
      key: base["foo"];
    }

    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Complex Types", () => {
    const sc = `

    interface something {
      prop1: string;
      prop2: number
    }

    interface base {
      foo: something;
      bar: number;
    }

    export interface test {
      key: base["foo"]
    }

    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });
});

describe("Type with typeof", () => {
  test("Indexing", () => {
    const sc = `
    const options = [ 
      "one",
      "two",
      "three"
    ] as const
    
    export type options = typeof options[number];

    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Indexing (long)", () => {
    const sc = `
    const options = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
      23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41,
      42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58,
    ] as const;
    
    export type options = typeof options[number];    

    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });
});

describe("Edge Cases", () => {
  test("Modifying Cache References", () => {
    const sc = `
    interface foo {
      foo: string;
    }
    
    interface bar {
      bar: number;
    }
    
    type types = foo | bar;
    
    type requiredTypes = types & {
      baz: number;
    };
    
    export type test = requiredTypes & Partial<Pick<requiredTypes, "baz">>;    

    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });
});

describe("Variable Exports", () => {
  test("Primitive const exports", () => {
    const sc = `
      export const foo = 1;

      export const bar = "test";

      export const far = true;
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Object const exports", () => {
    const sc = `
      export const foo = {
        foo: 1,
        bar: "test",
        far: false
      }
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Object const exports with spread", () => {
    const sc = `
      const foo = {
        foo: 1,
        bar: "test",
        far: false
      }

      export const far = {
        ...foo,
        mar: 2
      }
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Array const exports", () => {
    const sc = `
      export const foo = [1,2,3]
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Array const exports with spread", () => {
    const sc = `
      const foo = [1,2,3]
      export const bar = [...foo, 4]
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Function with primitive return type", () => {
    const sc = `
      function test(arg1: string): string {
        return ""
      }

      export const foo = test("1")
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Function with object return type", () => {
    const sc = `
      interface Bar {
        foo: string
        fuz: number
      }

      function test(arg1: string): Bar {
        return {
            foo: "1",
            fuz: 1
        }
      }
      
      export const foo = test("1")
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Arrow function with object return type", () => {
    const sc = `
      interface Bar {
        foo: string;
        fuz: number;
      }
      
      export const foo = (): Bar => {
        return {
          foo: "1",
          fuz: 1,
        };
      };
    
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Aliased variable", () => {
    const sc = `
      interface Bar {
        foo: string
        fuz: number
      }

      function test(arg1: string): Bar {
        return {
            foo: "1",
            fuz: 1
        }
      }
      
      const foo = test("1")

      export const bar = foo
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("gets named tuple members", () => {
    const sc = `
      export type Foo = [argName: string, argValue: string];
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Arrow function with parameters", () => {
    const sc = `
      interface Bar {
        foo: string
        fuz: number
      }

      export const foo = (input: number): Bar => {
        return {
          foo: "1",
          fuz: 1,
        };
      };
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("named tuples in generics", () => {
    const sc = `
      type Foo<T> = T;
      export type Bar = Foo<[argName: string, argValue: string]>;
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  test("Aliased Arrow function exports its own name", () => {
    const sc = `
      interface Bar {
        foo: string
        fuz: number
      }

      export const foo = (input: number): Bar => {
        return {
          foo: "1",
          fuz: 1,
        };
      };

      export const baz = foo
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });
});
