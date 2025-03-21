// Define the JSX namespace for TypeScript to recognize our custom JSX elements
declare namespace JSX {
  // Define the intrinsic elements (the built-in tags)
  interface IntrinsicElements {
    obj: {
      type?: string;
      id?: string;
      children?: unknown;
      [key: string]: unknown;
    };
    array: {
      items?: unknown[];
      children?: unknown;
      [key: string]: unknown;
    };
    property: {
      name: string;
      value?: unknown;
      children?: unknown;
    };
    value: {
      value?: unknown;
      children?: unknown;
    };
  }

  interface Element {
    type:
      | string
      | ((...args: unknown[]) => unknown)
      | symbol
      | { $$typeof: symbol; _context?: unknown };
    props: Record<string, unknown>;
    $$typeof: symbol;
  }
}
