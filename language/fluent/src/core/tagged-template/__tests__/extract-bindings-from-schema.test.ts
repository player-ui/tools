import { describe, test, expect } from "vitest";
import type { Schema } from "@player-ui/types";
import { extractBindingsFromSchema } from "../extract-bindings-from-schema";
import { binding } from "../binding";

describe("extractBindingsFromSchema", () => {
  describe("basic schema structure reconstruction", () => {
    test("handles simple type references", () => {
      const schema = {
        ROOT: {
          foo: { type: "fooType" },
        },
        fooType: {
          bar: { type: "StringType" },
        },
      } as const satisfies Schema.Schema;

      const expected = {
        foo: {
          bar: binding<string>`foo.bar`,
        },
      };

      const bindings = extractBindingsFromSchema(schema);

      expect(bindings.foo.bar.toString()).toBe(expected.foo.bar.toString());
    });

    test("reconstructs complex nested schema structure", () => {
      const schema = {
        ROOT: {
          foo: { type: "fooType" },
          other: { type: "otherType", isArray: true },
        },
        fooType: {
          bar: { type: "barType" },
        },
        barType: {
          baz: { type: "StringType" },
        },
        otherType: {
          item1: { type: "StringType" },
        },
      } as const satisfies Schema.Schema;

      const expected = {
        foo: {
          bar: {
            baz: binding<string>`foo.bar.baz`,
          },
        },
        other: {
          item1: binding<string>`other._current_.item1`,
        },
      };

      const bindings = extractBindingsFromSchema(schema);

      expect(bindings.foo.bar.baz.toString()).toBe(
        expected.foo.bar.baz.toString(),
      );
      expect(bindings.other.item1.toString()).toBe(
        expected.other.item1.toString(),
      );
    });

    test("handles primitive types directly in ROOT", () => {
      const schema = {
        ROOT: {
          name: { type: "StringType" },
          age: { type: "NumberType" },
          active: { type: "BooleanType" },
        },
      } as const satisfies Schema.Schema;

      const expected = {
        name: binding<string>`name`,
        age: binding<number>`age`,
        active: binding<boolean>`active`,
      };

      const bindings = extractBindingsFromSchema(schema);

      expect(bindings.name.toString()).toBe(expected.name.toString());
      expect(bindings.age.toString()).toBe(expected.age.toString());
      expect(bindings.active.toString()).toBe(expected.active.toString());
    });
  });

  describe("array handling with _current_ accessor", () => {
    test("converts array access to _current_ path", () => {
      const schema = {
        ROOT: {
          items: { type: "itemType", isArray: true },
        },
        itemType: {
          name: { type: "StringType" },
          value: { type: "NumberType" },
        },
      } as const satisfies Schema.Schema;

      const expected = {
        items: {
          name: binding<string>`items._current_.name`,
          value: binding<number>`items._current_.value`,
        },
      };

      const bindings = extractBindingsFromSchema(schema);

      expect(bindings.items.name.toString()).toBe(
        expected.items.name.toString(),
      );
      expect(bindings.items.value.toString()).toBe(
        expected.items.value.toString(),
      );
    });

    test("handles arrays of primitive types", () => {
      const schema = {
        ROOT: {
          tags: { type: "StringType", isArray: true },
          numbers: { type: "NumberType", isArray: true },
        },
      } as const satisfies Schema.Schema;

      const expected = {
        tags: {
          name: binding<string>`tags._current_`,
        },
        numbers: {
          value: binding<number>`numbers._current_`,
        },
      };

      const bindings = extractBindingsFromSchema(schema);

      expect(bindings.tags.name.toString()).toBe(expected.tags.name.toString());
      expect(bindings.numbers.value.toString()).toBe(
        expected.numbers.value.toString(),
      );
    });

    test("handles nested arrays", () => {
      const schema = {
        ROOT: {
          groups: { type: "groupType", isArray: true },
        },
        groupType: {
          name: { type: "StringType" },
          items: { type: "itemType", isArray: true },
        },
        itemType: {
          value: { type: "StringType" },
        },
      } as const satisfies Schema.Schema;

      const expected = {
        groups: {
          name: binding<string>`groups._current_.name`,
          items: {
            value: binding<string>`groups._current_.items._current_.value`,
          },
        },
      };

      const bindings = extractBindingsFromSchema(schema);

      expect(bindings.groups.name.toString()).toBe(
        expected.groups.name.toString(),
      );
      expect(bindings.groups.items.value.toString()).toBe(
        expected.groups.items.value.toString(),
      );
    });
  });

  describe("record types", () => {
    test("handles record types", () => {
      const schema = {
        ROOT: {
          metadata: { type: "metadataType", isRecord: true },
        },
        metadataType: {
          key1: { type: "StringType" },
          key2: { type: "NumberType" },
        },
      } as const satisfies Schema.Schema;

      const expected = {
        metadata: {
          key1: binding<string>`metadata.key1`,
          key2: binding<number>`metadata.key2`,
        },
      };

      const bindings = extractBindingsFromSchema(schema);

      expect(bindings.metadata.key1.toString()).toBe(
        expected.metadata.key1.toString(),
      );
      expect(bindings.metadata.key2.toString()).toBe(
        expected.metadata.key2.toString(),
      );
    });
  });
});
