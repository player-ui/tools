/* eslint-disable no-template-curly-in-string */
import { setupTestEnv } from '@player-tools/xlr-utils';
import { TsConverter } from '..';

describe('Type Exports', () => {
  it('Basic Array Type', () => {
    const sc = `
    export type Foo = Array<string>
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  it('Basic Union Type', () => {
    const sc = `
    export type Foo = number | string
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });
});

describe('Interface Exports', () => {
  it('Basic Interface Type', () => {
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

  it('Interface with Optional parameters', () => {
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

  it('Interface with Inheritance', () => {
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

  it('Implementing more than one Interfaces', () => {
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

describe('Generic Declarations', () => {
  it('Basic Generic Type', () => {
    const sc = `
    export type Foo<T> = string | T
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  it('Generic with Constraints', () => {
    const sc = `
    export type Foo<T extends string = string > = number | T
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  it('Implementing Generic Type', () => {
    const sc = `
    type Foo<T> = string | T

    export type Bar = boolean | Foo<number>
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  it('Interface with Generics', () => {
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

  it('Interface with Generics and Constraints', () => {
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

  it('Implementing Interface with Generics', () => {
    const sc = `

    interface Base<T extends string = string>{
      bar: T
    }

    interface Foo extends Bar<'test'> {
      bam: number
    }

    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  it('Implementing an generic wrapped interface', () => {
    const sc = `

    interface base {
      foo: number
      bar: string
    }

    export interface Test extends Pick<base,'bar'> {
      test: any
    }

    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });
});

describe('Complex Types', () => {
  it('Pick', () => {
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

  it('Pick with interface union', () => {
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

  it('Pick with interface intersection', () => {
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

  it('Omit', () => {
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

  it('Omit with type union', () => {
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

  it('Omit with type intersection', () => {
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

  it('Exclude with primitives', () => {
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

  it('Exclude with objects', () => {
    const sc = `
    type foo = { type: 'a'; value: string } | { type: 'b'; value: number } | { type: 'c'; value: boolean };

    export type bar = Exclude<foo, { type: 'a' }>;
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  it('Exclude with objects collapses single remaining element', () => {
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

describe('String Templates', () => {
  it('Basic', () => {
    const sc =
      'export type Bar = `String is a ${string}, number is a ${number} and boolean is a ${boolean}`';

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  it('Type References', () => {
    const sc =
      'type Foo = string; export type Bar = `String is a ${Foo}, number is a ${number} and boolean is a ${boolean}`';

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });
});

describe('Index Types', () => {
  it('Basic', () => {
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

  it('Complex Types', () => {
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

describe('Type with typeof', () => {
  it('Indexing', () => {
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

  it('Indexing (long)', () => {
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

describe('Edge Cases', () => {
  it('Modifying Cache References', () => {
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
    
    export type test = requiredTypes & Partial<Pick<requiredTypes, 'baz'>>;    

    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });
});

describe('Variable Exports', () => {
  it('Primitive const exports', () => {
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

  it('Object const exports', () => {
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

  it('Object const exports with spread', () => {
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

  it('Array const exports', () => {
    const sc = `
      export const foo = [1,2,3]
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  it('Array const exports with spread', () => {
    const sc = `
      const foo = [1,2,3]
      export const bar = [...foo, 4]
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  it('Function with primitive return type', () => {
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

  it('Function with object return type', () => {
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

  it('Arrow function with object return type', () => {
    const sc = `
      interface Bar {
        foo: string;
        fuz: number;
      }
      
      export const foo = (): Bar => {
        return {
          foo: '1',
          fuz: 1,
        };
      };
    
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  it('Aliased variable', () => {
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

  it('gets named tuple members', () => {
    const sc = `
      export type Foo = [argName: string, argValue: string];
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  it('Arrow function with parameters', () => {
    const sc = `
      interface Bar {
        foo: string
        fuz: number
      }

      export const foo = (input: number): Bar => {
        return {
          foo: '1',
          fuz: 1,
        };
      };
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  it('named tuples in generics', () => {
    const sc = `
      type Foo<T> = T;
      export type Bar = Foo<[argName: string, argValue: string]>;
    `;

    const { sf, tc } = setupTestEnv(sc);
    const converter = new TsConverter(tc);
    const XLR = converter.convertSourceFile(sf).data.types;

    expect(XLR).toMatchSnapshot();
  });

  it('Aliased Arrow function exports its own name', () => {
    const sc = `
      interface Bar {
        foo: string
        fuz: number
      }

      export const foo = (input: number): Bar => {
        return {
          foo: '1',
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
