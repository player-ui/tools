import ts from "typescript";
import type { SymbolDisplayPart } from "typescript";
import type { NodeType } from "@player-tools/xlr";
import { isPrimitiveTypeNode } from "./type-checks";

const { SymbolDisplayPartKind, displayPartsToString } = ts;

/** Like `.join()` but for arrays */
function insertBetweenElements<T>(array: Array<T>, separator: T): T[] {
  return array.reduce((acc, item, index) => {
    if (index === 0) {
      return [item];
    }

    return [...acc, separator, item];
  }, [] as T[]);
}

/**
 * Generate a documentation string for a given node
 *
 * @param node - The source node to author the docs string for
 * @returns - documentation string
 */
export function createTSDocString(node: NodeType): Array<SymbolDisplayPart> {
  if (node.type === "ref") {
    return [
      {
        text: node.ref,
        kind: SymbolDisplayPartKind.keyword as any,
      },
    ];
  }

  if (node.type === "or" || node.type === "and") {
    const items = node.type === "and" ? node.and : node.or;

    return insertBetweenElements(
      items.map((subnode) => createTSDocString(subnode)),
      [
        {
          kind: SymbolDisplayPartKind.punctuation as any,
          text: node.type === "and" ? " & " : " | ",
        },
      ],
    ).flat();
  }

  if (node.type === "function") {
    return [
      {
        kind: SymbolDisplayPartKind.keyword as any,
        text: "function",
      },
      {
        kind: SymbolDisplayPartKind.space as any,
        text: " ",
      },
      ...(node.name
        ? [{ text: node.name, kind: SymbolDisplayPartKind.methodName }]
        : []),
      {
        kind: SymbolDisplayPartKind.punctuation as any,
        text: "(",
      },
      ...insertBetweenElements(
        node.parameters.map((p) => {
          if (p.name) {
            return [
              {
                kind: SymbolDisplayPartKind.parameterName as any,
                text: p.name,
              },
              {
                kind: SymbolDisplayPartKind.punctuation as any,
                text: p.optional ? "?" : "",
              },
              {
                kind: SymbolDisplayPartKind.punctuation as any,
                text: ": ",
              },
              ...createTSDocString(p.type),
            ];
          }

          return createTSDocString(p.type);
        }),
        [
          {
            kind: SymbolDisplayPartKind.punctuation as any,
            text: ", ",
          },
        ],
      ).flat(),
      {
        kind: SymbolDisplayPartKind.punctuation as any,
        text: ")",
      },
      ...(node.returnType
        ? [
            {
              kind: SymbolDisplayPartKind.punctuation as any,
              text: ": ",
            },
            ...createTSDocString(node.returnType),
          ]
        : []),
    ];
  }

  if (node.type === "tuple") {
    return [
      {
        kind: SymbolDisplayPartKind.punctuation as any,
        text: "[",
      },
      ...insertBetweenElements(
        node.elementTypes.map((t) => {
          if (t.name) {
            return [
              {
                kind: SymbolDisplayPartKind.propertyName as any,
                text: t.name,
              },
              {
                kind: SymbolDisplayPartKind.punctuation as any,
                text: ": ",
              },
              ...createTSDocString(t.type),
            ];
          }

          return createTSDocString(t.type);
        }),
        [
          {
            kind: SymbolDisplayPartKind.punctuation as any,
            text: ", ",
          },
        ],
      ).flat(),
      {
        kind: SymbolDisplayPartKind.punctuation as any,
        text: "]",
      },
    ];
  }

  if (node.type === "array") {
    return [
      {
        kind: SymbolDisplayPartKind.interfaceName as any,
        text: "Array",
      },
      {
        kind: SymbolDisplayPartKind.punctuation as any,
        text: "<",
      },
      ...createTSDocString(node.elementType),
      {
        kind: SymbolDisplayPartKind.punctuation as any,
        text: ">",
      },
    ];
  }

  if (node.type === "record") {
    return [
      {
        kind: SymbolDisplayPartKind.interfaceName as any,
        text: "Record",
      },
      {
        kind: SymbolDisplayPartKind.punctuation as any,
        text: "<",
      },
      ...createTSDocString(node.keyType),
      {
        kind: SymbolDisplayPartKind.punctuation as any,
        text: ", ",
      },
      ...createTSDocString(node.valueType),
      {
        kind: SymbolDisplayPartKind.punctuation as any,
        text: ">",
      },
    ];
  }

  if (
    (node.type === "string" ||
      node.type === "boolean" ||
      node.type === "number") &&
    node.const !== undefined
  ) {
    return [
      {
        kind: SymbolDisplayPartKind.keyword as any,
        text:
          typeof node.const === "string"
            ? `"${node.const}"`
            : String(node.const),
      },
    ];
  }

  if (isPrimitiveTypeNode(node) && node.type !== "null") {
    return [
      {
        kind: SymbolDisplayPartKind.keyword as any,
        text: node.type,
      },
    ];
  }

  if (node.type === "object" && node.name) {
    return [
      {
        kind: SymbolDisplayPartKind.interfaceName as any,
        text: node.name,
      },
    ];
  }

  return [
    {
      kind: SymbolDisplayPartKind.localName as any,
      text: node.type,
    },
  ];
}

/** Convert the TS SymbolDisplayParts into a single string */
export function symbolDisplayToString(
  displayParts: Array<SymbolDisplayPart>,
): string {
  return displayPartsToString(displayParts);
}

/** Create a documentation string from node */
export function createDocString(node: NodeType): string {
  return symbolDisplayToString(createTSDocString(node));
}
