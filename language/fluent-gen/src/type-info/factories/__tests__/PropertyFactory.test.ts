import { test, expect } from "vitest";
import { PropertyFactory } from "../PropertyFactory.js";
import type { PropertyInfo } from "../../types.js";
import type { AnalysisOptions } from "../../analyzers/TypeAnalyzer.js";

// Helper function to create AnalysisOptions
function createOptions(
  overrides: Partial<AnalysisOptions> = {},
): AnalysisOptions {
  return {
    isOptional: false,
    isArray: false,
    maxDepth: 10,
    currentDepth: 0,
    ...overrides,
  };
}

test("creates basic object property", () => {
  const properties: PropertyInfo[] = [
    {
      kind: "terminal",
      type: "string",
      name: "name",
      typeAsString: "string",
    },
  ];

  const result = PropertyFactory.createObjectProperty({
    name: "user",
    typeAsString: "User",
    properties,
  });

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "user",
    typeAsString: "User",
    properties,
  });
});

test("creates object property with optional flag", () => {
  const properties: PropertyInfo[] = [];
  const options = createOptions({ isOptional: true });

  const result = PropertyFactory.createObjectProperty({
    name: "optionalUser",
    typeAsString: "User",
    properties,
    options,
  });

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "optionalUser",
    typeAsString: "User",
    properties,
    isOptional: true,
  });
});

test("creates object property with array flag", () => {
  const properties: PropertyInfo[] = [];
  const options = createOptions({ isArray: true });

  const result = PropertyFactory.createObjectProperty({
    name: "users",
    typeAsString: "User",
    properties,
    options,
  });

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "users",
    typeAsString: "User",
    properties,
    isArray: true,
  });
});

test("creates object property with both optional and array flags", () => {
  const properties: PropertyInfo[] = [];
  const options = createOptions({ isOptional: true, isArray: true });

  const result = PropertyFactory.createObjectProperty({
    name: "maybeUsers",
    typeAsString: "User",
    properties,
    options,
  });

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "maybeUsers",
    typeAsString: "User",
    properties,
    isOptional: true,
    isArray: true,
  });
});

test("creates object property with documentation", () => {
  const properties: PropertyInfo[] = [];
  const documentation = "User object with profile information";

  const result = PropertyFactory.createObjectProperty({
    name: "user",
    typeAsString: "User",
    properties,
    documentation,
  });

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "user",
    typeAsString: "User",
    properties,
    documentation,
  });
});

test("creates object property with acceptsUnknownProperties flag", () => {
  const properties: PropertyInfo[] = [];

  const result = PropertyFactory.createObjectProperty({
    name: "dynamicObject",
    typeAsString: "Record<string, unknown>",
    properties,
    acceptsUnknownProperties: true,
  });

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "dynamicObject",
    typeAsString: "Record<string, unknown>",
    properties,
    acceptsUnknownProperties: true,
  });
});

test("creates object property with all options", () => {
  const properties: PropertyInfo[] = [];
  const options = createOptions({ isOptional: true, isArray: true });
  const documentation = "Complex object property";

  const result = PropertyFactory.createObjectProperty({
    name: "complexObject",
    typeAsString: "ComplexType",
    properties,
    options,
    documentation,
    acceptsUnknownProperties: true,
  });

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "complexObject",
    typeAsString: "ComplexType",
    properties,
    isOptional: true,
    isArray: true,
    documentation,
    acceptsUnknownProperties: true,
  });
});

test("creates basic enum property", () => {
  const values = ["red", "green", "blue"];

  const result = PropertyFactory.createEnumProperty({
    name: "color",
    enumName: "Color",
    values,
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "enum",
    name: "color",
    typeAsString: "Color",
    values,
  });
});

test("creates enum property with mixed string and number values", () => {
  const values = ["active", 1, "inactive", 0];

  const result = PropertyFactory.createEnumProperty({
    name: "status",
    enumName: "Status",
    values,
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "enum",
    name: "status",
    typeAsString: "Status",
    values,
  });
});

test("creates enum property with options", () => {
  const values = ["small", "medium", "large"];
  const options = createOptions({ isOptional: true, isArray: true });

  const result = PropertyFactory.createEnumProperty({
    name: "sizes",
    enumName: "Size",
    values,
    options,
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "enum",
    name: "sizes",
    typeAsString: "Size",
    values,
    isOptional: true,
    isArray: true,
  });
});

test("creates enum property with documentation", () => {
  const values = ["admin", "user", "guest"];
  const documentation = "User role enumeration";

  const result = PropertyFactory.createEnumProperty({
    name: "role",
    enumName: "UserRole",
    values,
    documentation,
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "enum",
    name: "role",
    typeAsString: "UserRole",
    values,
    documentation,
  });
});

test("throws error for enum with empty values", () => {
  expect(() =>
    PropertyFactory.createEnumProperty({
      name: "emptyEnum",
      enumName: "EmptyEnum",
      values: [],
    }),
  ).toThrow("Enum EmptyEnum has no values");
});

test("creates basic string property", () => {
  const result = PropertyFactory.createStringProperty({
    name: "username",
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "username",
    typeAsString: "string",
  });
});

test("creates string property with custom type", () => {
  const result = PropertyFactory.createStringProperty({
    name: "id",
    typeAsString: "UUID",
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "id",
    typeAsString: "UUID",
  });
});

test("creates string property with literal value", () => {
  const result = PropertyFactory.createStringProperty({
    name: "status",
    typeAsString: '"active"',
    value: "active",
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "status",
    typeAsString: '"active"',
    value: "active",
  });
});

test("creates string property with options", () => {
  const options = createOptions({ isOptional: true, isArray: true });

  const result = PropertyFactory.createStringProperty({
    name: "tags",
    options,
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "tags",
    typeAsString: "string",
    isOptional: true,
    isArray: true,
  });
});

test("creates string property with documentation", () => {
  const documentation = "User's display name";

  const result = PropertyFactory.createStringProperty({
    name: "displayName",
    documentation,
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "displayName",
    typeAsString: "string",
    documentation,
  });
});

test("creates string property with all options", () => {
  const options = createOptions({ isOptional: true, isArray: true });
  const documentation = "Array of email addresses";

  const result = PropertyFactory.createStringProperty({
    name: "emails",
    typeAsString: "EmailAddress",
    value: "test@example.com",
    options,
    documentation,
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "emails",
    typeAsString: "EmailAddress",
    value: "test@example.com",
    isOptional: true,
    isArray: true,
    documentation,
  });
});

test("creates basic number property", () => {
  const result = PropertyFactory.createNumberProperty({
    name: "age",
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "number",
    name: "age",
    typeAsString: "number",
  });
});

test("creates number property with custom type", () => {
  const result = PropertyFactory.createNumberProperty({
    name: "price",
    typeAsString: "Currency",
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "number",
    name: "price",
    typeAsString: "Currency",
  });
});

test("creates number property with literal value", () => {
  const result = PropertyFactory.createNumberProperty({
    name: "maxRetries",
    typeAsString: "3",
    value: 3,
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "number",
    name: "maxRetries",
    typeAsString: "3",
    value: 3,
  });
});

test("creates number property with zero value", () => {
  const result = PropertyFactory.createNumberProperty({
    name: "count",
    value: 0,
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "number",
    name: "count",
    typeAsString: "number",
    value: 0,
  });
});

test("creates number property with options", () => {
  const options = createOptions({ isOptional: true, isArray: true });

  const result = PropertyFactory.createNumberProperty({
    name: "scores",
    options,
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "number",
    name: "scores",
    typeAsString: "number",
    isOptional: true,
    isArray: true,
  });
});

test("creates number property with documentation", () => {
  const documentation = "User's current score";

  const result = PropertyFactory.createNumberProperty({
    name: "score",
    documentation,
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "number",
    name: "score",
    typeAsString: "number",
    documentation,
  });
});

test("creates basic boolean property", () => {
  const result = PropertyFactory.createBooleanProperty({
    name: "isActive",
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "boolean",
    name: "isActive",
    typeAsString: "boolean",
  });
});

test("creates boolean property with custom type", () => {
  const result = PropertyFactory.createBooleanProperty({
    name: "isVerified",
    typeAsString: "VerificationStatus",
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "boolean",
    name: "isVerified",
    typeAsString: "VerificationStatus",
  });
});

test("creates boolean property with true value", () => {
  const result = PropertyFactory.createBooleanProperty({
    name: "isDefault",
    typeAsString: "true",
    value: true,
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "boolean",
    name: "isDefault",
    typeAsString: "true",
    value: true,
  });
});

test("creates boolean property with false value", () => {
  const result = PropertyFactory.createBooleanProperty({
    name: "isDisabled",
    typeAsString: "false",
    value: false,
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "boolean",
    name: "isDisabled",
    typeAsString: "false",
    value: false,
  });
});

test("creates boolean property with options", () => {
  const options = createOptions({ isOptional: true, isArray: true });

  const result = PropertyFactory.createBooleanProperty({
    name: "flags",
    options,
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "boolean",
    name: "flags",
    typeAsString: "boolean",
    isOptional: true,
    isArray: true,
  });
});

test("creates boolean property with documentation", () => {
  const documentation = "Whether user is currently online";

  const result = PropertyFactory.createBooleanProperty({
    name: "isOnline",
    documentation,
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "boolean",
    name: "isOnline",
    typeAsString: "boolean",
    documentation,
  });
});

test("creates basic unknown property", () => {
  const result = PropertyFactory.createUnknownProperty({
    name: "metadata",
    typeAsString: "UnknownType",
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "unknown",
    name: "metadata",
    typeAsString: "UnknownType",
  });
});

test("creates unknown property with options", () => {
  const options = createOptions({ isOptional: true, isArray: true });

  const result = PropertyFactory.createUnknownProperty({
    name: "dynamicData",
    typeAsString: "any[]",
    options,
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "unknown",
    name: "dynamicData",
    typeAsString: "any[]",
    isOptional: true,
    isArray: true,
  });
});

test("creates unknown property with documentation", () => {
  const documentation = "Dynamic configuration data";

  const result = PropertyFactory.createUnknownProperty({
    name: "config",
    typeAsString: "ConfigType",
    documentation,
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "unknown",
    name: "config",
    typeAsString: "ConfigType",
    documentation,
  });
});

test("creates fallback property", () => {
  const result = PropertyFactory.createFallbackProperty({
    name: "unresolved",
    typeAsString: "ComplexType",
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "unresolved",
    typeAsString: "ComplexType",
    documentation: "Fallback property for unresolved type: ComplexType",
  });
});

test("creates fallback property with options", () => {
  const options = createOptions({ isOptional: true, isArray: true });

  const result = PropertyFactory.createFallbackProperty({
    name: "fallbackArray",
    typeAsString: "UnresolvableType[]",
    options,
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "fallbackArray",
    typeAsString: "UnresolvableType[]",
    isOptional: true,
    isArray: true,
    documentation: "Fallback property for unresolved type: UnresolvableType[]",
  });
});

test("applies options to existing property", () => {
  const originalProperty: PropertyInfo = {
    kind: "terminal",
    type: "string",
    name: "test",
    typeAsString: "string",
  };

  const options = createOptions({ isOptional: true, isArray: true });

  const result = PropertyFactory.applyOptions(originalProperty, options);

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "test",
    typeAsString: "string",
    isOptional: true,
    isArray: true,
  });

  // Should not modify original
  expect(originalProperty).toEqual({
    kind: "terminal",
    type: "string",
    name: "test",
    typeAsString: "string",
  });
});

test("applies partial options to existing property", () => {
  const originalProperty: PropertyInfo = {
    kind: "terminal",
    type: "number",
    name: "count",
    typeAsString: "number",
  };

  const options = createOptions({ isOptional: true });

  const result = PropertyFactory.applyOptions(originalProperty, options);

  expect(result).toEqual({
    kind: "terminal",
    type: "number",
    name: "count",
    typeAsString: "number",
    isOptional: true,
  });
});

test("applies no options when options is undefined", () => {
  const originalProperty: PropertyInfo = {
    kind: "terminal",
    type: "boolean",
    name: "flag",
    typeAsString: "boolean",
  };

  const result = PropertyFactory.applyOptions(originalProperty, undefined);

  expect(result).toBe(originalProperty); // Same reference
});

test("applies no options when options is empty", () => {
  const originalProperty: PropertyInfo = {
    kind: "terminal",
    type: "string",
    name: "name",
    typeAsString: "string",
  };

  const options = createOptions(); // All false values

  const result = PropertyFactory.applyOptions(originalProperty, options);

  expect(result).toEqual(originalProperty);
  expect(result).not.toBe(originalProperty); // Different reference
});

test("preserves existing property options when applying new ones", () => {
  const originalProperty: PropertyInfo = {
    kind: "terminal",
    type: "string",
    name: "name",
    typeAsString: "string",
    documentation: "Original documentation",
    value: "test",
  };

  const options = createOptions({ isOptional: true });

  const result = PropertyFactory.applyOptions(originalProperty, options);

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "name",
    typeAsString: "string",
    documentation: "Original documentation",
    value: "test",
    isOptional: true,
  });
});

test("handles complex object property creation", () => {
  const nestedProperties: PropertyInfo[] = [
    {
      kind: "terminal",
      type: "string",
      name: "street",
      typeAsString: "string",
    },
    {
      kind: "terminal",
      type: "string",
      name: "city",
      typeAsString: "string",
    },
    {
      kind: "terminal",
      type: "number",
      name: "zipCode",
      typeAsString: "number",
    },
  ];

  const result = PropertyFactory.createObjectProperty({
    name: "address",
    typeAsString: "Address",
    properties: nestedProperties,
    documentation: "User's address information",
  });

  expect(result.properties).toEqual(nestedProperties);
  expect(result.properties).toHaveLength(3);
  expect(result.documentation).toBe("User's address information");
});

test("handles empty properties array in object property", () => {
  const result = PropertyFactory.createObjectProperty({
    name: "emptyObject",
    typeAsString: "EmptyInterface",
    properties: [],
  });

  expect(result.properties).toEqual([]);
  expect(result.kind).toBe("non-terminal");
  expect(result.type).toBe("object");
});

test("handles numeric enum values", () => {
  const values = [0, 1, 2, 3];

  const result = PropertyFactory.createEnumProperty({
    name: "priority",
    enumName: "Priority",
    values,
  });

  expect(result.values).toEqual([0, 1, 2, 3]);
  expect(result.typeAsString).toBe("Priority");
});

test("handles single enum value", () => {
  const values = ["singleton"];

  const result = PropertyFactory.createEnumProperty({
    name: "single",
    enumName: "SingleEnum",
    values,
  });

  expect(result.values).toEqual(["singleton"]);
});

test("preserves original property type when applying options", () => {
  const objectProperty: PropertyInfo = {
    kind: "non-terminal",
    type: "object",
    name: "nested",
    typeAsString: "NestedType",
    properties: [],
  };

  const options = createOptions({ isOptional: true });
  const result = PropertyFactory.applyOptions(objectProperty, options);

  expect(result.kind).toBe("non-terminal");
  expect(result.type).toBe("object");
  expect(result.properties).toEqual([]);
  expect(result.isOptional).toBe(true);
});
