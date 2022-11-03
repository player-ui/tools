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

  it('Implementing two Interfaces', () => {
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
