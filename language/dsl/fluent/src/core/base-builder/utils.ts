export function createInspectMethod(
  builderName: string,
  properties: Record<string, unknown>,
): string {
  return `${builderName} { properties: ${JSON.stringify(
    properties,
    null,
    2,
  )} }`;
}
