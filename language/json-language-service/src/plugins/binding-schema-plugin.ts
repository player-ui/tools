import type { Location } from "vscode-languageserver-types";
import { CompletionItemKind } from "vscode-languageserver-types";
import type { NodeType } from "@player-tools/xlr";
import type { PlayerLanguageService, PlayerLanguageServicePlugin } from "..";
import type {
  DocumentContext,
  EnhancedDocumentContextWithPosition,
} from "../types";
import { getLSLocationOfNode, getProperty, isValueCompletion } from "../utils";
import type { PropertyASTNode, StringASTNode } from "../parser";
import { getContentNode } from "../parser";

interface SchemaInfo {
  /** mapping of binding to schema path */
  bindingToSchemaType: Map<
    string,
    {
      /** the binding */
      binding: string;

      /** the type name */
      typeName: string;

      /** the name of the key */
      key: string;
    }
  >;

  /** JSON AST mapping of type to the node */
  typeToNode: Map<
    string,
    {
      /** the type  */
      type: string;

      /** the json node */
      typeNode: PropertyASTNode;
    }
  >;
}

/** parse the document for the schema info */
function getBindingInfo(ctx: DocumentContext): SchemaInfo {
  const info: SchemaInfo = {
    bindingToSchemaType: new Map(),
    typeToNode: new Map(),
  };

  if (ctx.PlayerContent.root.type !== "content") {
    return info;
  }

  const schemaRoot = ctx.PlayerContent.root.properties?.find(
    (child) => child.keyNode.value === "schema",
  );

  if (!schemaRoot || schemaRoot.valueNode?.type !== "object") {
    return info;
  }

  const schemaTypeQueue: Array<{
    /** the current path  */
    currentPath: string;

    /** the next type to visit */
    typeToVisit: string;

    /** list of visited types (to prevent loops) */
    visited: Set<string>;
  }> = [
    {
      currentPath: "",
      typeToVisit: "ROOT",
      visited: new Set(),
    },
  ];

  while (schemaTypeQueue.length > 0) {
    const next = schemaTypeQueue.shift();
    if (!next) {
      break;
    }

    if (next.visited.has(next.typeToVisit)) {
      continue;
    }

    const visited = new Set(...next.visited, next.typeToVisit);
    const { currentPath, typeToVisit } = next;

    const typeNode = schemaRoot.valueNode.properties.find(
      (child) => child.keyNode.value === typeToVisit,
    );

    if (!typeNode || typeNode.valueNode?.type !== "object") {
      continue;
    }

    info.typeToNode.set(typeToVisit, { type: typeToVisit, typeNode });

    typeNode.valueNode.properties.forEach((prop) => {
      // PropName is the path
      // { type: TYPE } is the next nested type

      const nextPath = [currentPath, prop.keyNode.value].join(
        currentPath === "" ? "" : ".",
      );

      info.bindingToSchemaType.set(nextPath, {
        binding: nextPath,
        typeName: typeToVisit,
        key: prop.keyNode.value,
      });

      if (prop.valueNode?.type === "object") {
        const nestedTypeName = prop.valueNode.properties.find(
          (c) => c.keyNode.value === "type",
        );

        if (nestedTypeName && nestedTypeName.valueNode?.type === "string") {
          schemaTypeQueue.push({
            currentPath: nextPath,
            typeToVisit: nestedTypeName.valueNode.value,
            visited,
          });
        }
      }
    });
  }

  return info;
}

/**
 * Checks to see if there is a Binding ref node somewhere at this level
 *
 * - @param nodes Array of nodes to check for an AssetWrapper ref
 */
const checkTypesForBinding = (nodes: Array<NodeType>): boolean => {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.type === "string" && node.name === "Binding") return true;
    if (node.type === "or") return checkTypesForBinding(node.or);
    if (node.type === "and") return checkTypesForBinding(node.and);
  }

  return false;
};

/** check if the property is of type Binding */
function isBindingPropertyAssignment(
  ctx: EnhancedDocumentContextWithPosition,
): boolean {
  if (ctx.node.type !== "string" || ctx.node.parent?.type !== "property") {
    return false;
  }

  if (checkTypesForBinding(ctx.XLR?.nodes ?? [])) {
    return true;
  }

  return false;
}

/** find where in the document the type def is located */
function getLocationForBindingTypeDefinition(
  ctx: EnhancedDocumentContextWithPosition,
  schemaInfo: SchemaInfo,
): Location | undefined {
  if (!isBindingPropertyAssignment(ctx)) {
    return;
  }

  const existingBindingValue = (ctx.node as StringASTNode).value;
  const info = schemaInfo.bindingToSchemaType.get(existingBindingValue);

  if (!info) {
    return;
  }

  const nodeLocation = schemaInfo.typeToNode.get(info.typeName);

  if (!nodeLocation || nodeLocation.typeNode.valueNode?.type !== "object") {
    return;
  }

  const prop = getProperty(nodeLocation.typeNode.valueNode, info.key);

  if (!prop) {
    return;
  }

  return getLSLocationOfNode(ctx.document, prop);
}

/** find where the schema is for a type */
function getLocationForSchemaType(
  ctx: EnhancedDocumentContextWithPosition,
  schemaInfo: SchemaInfo,
): Location | undefined {
  if (isValueCompletion(ctx.node)) {
    // See if we're the "type" prop of a schema lookup

    if (
      ctx.node.parent?.type === "property" &&
      ctx.node.type === "string" &&
      ctx.node.parent.keyNode.value === "type"
    ) {
      const typeName = ctx.node.value;
      const node = schemaInfo.typeToNode.get(typeName);

      if (!node) {
        return;
      }

      const schemaPropNode = getContentNode(ctx.node)?.properties.find(
        (p) => p.keyNode.value === "schema",
      );

      if (schemaPropNode?.valueNode?.type !== "object") {
        return;
      }

      const schemaTypeNode = schemaPropNode.valueNode.properties.find(
        (p) => p.keyNode.value === typeName,
      );

      if (schemaTypeNode !== node.typeNode) {
        return;
      }

      return getLSLocationOfNode(ctx.document, node.typeNode);
    }
  }
}

/**
 *
 * Adds completions for:
 * - any `Binding` type from TS
 * - "type" and "key" for non-defined types
 *
 * Adds definitions for:
 * - any `Binding` reference to the schema def
 */
export class SchemaInfoPlugin implements PlayerLanguageServicePlugin {
  name = "view-node";

  apply(service: PlayerLanguageService): void {
    let schemaInfo: SchemaInfo | undefined;

    service.hooks.onDocumentUpdate.tap(this.name, (ctx) => {
      schemaInfo = getBindingInfo(ctx);
    });

    service.hooks.complete.tap(this.name, async (ctx, completionCtx) => {
      // Is this a `binding` type
      if (!isBindingPropertyAssignment(ctx)) {
        return;
      }

      const existingBindingValue = (ctx.node as StringASTNode).value;

      const bindings = Array.from(
        schemaInfo?.bindingToSchemaType.keys() ?? [],
      ).filter((k) => k.startsWith(existingBindingValue));

      bindings.forEach((b) => {
        completionCtx.addCompletionItem({
          kind: CompletionItemKind.Value,
          label: b.substring(existingBindingValue.length),
        });
      });

      // get bindings from schema
    });

    service.hooks.definition.tap(this.name, (ctx) => {
      if (!schemaInfo) {
        return;
      }

      return (
        getLocationForSchemaType(ctx, schemaInfo) ||
        getLocationForBindingTypeDefinition(ctx, schemaInfo)
      );
    });
  }
}
