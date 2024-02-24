import type { PropItem, PropItemType } from "react-docgen-typescript";
import type { NamedType, NodeType, ObjectType } from "@player-tools/xlr";
import { isPrimitiveTypeNode } from "@player-tools/xlr-utils";

export type Props = Record<string, Omit<PropItem, "defaultValue" | "parent">>;

export interface AssetDoc {
  /** name of the asset */
  name: string;

  /** description of the asset */
  description: string;

  /** prop info for the asset */
  props: Props;
}

/**
 * Converts a `NodeType` object to a descriptive `PropItemType` object
 */
function determinePropertyType(node: NodeType): PropItemType {
  if (node.type === "ref") {
    return { name: node.ref };
  }

  if (node.type === "or") {
    return {
      name: node.or
        .map((subnode) => determinePropertyType(subnode).name)
        .join(" | "),
    };
  }

  if (node.type === "and") {
    return {
      name: node.and
        .map((subnode) => determinePropertyType(subnode).name)
        .join(" & "),
    };
  }

  if (node.type === "array") {
    return { name: `Array<${determinePropertyType(node.elementType).name}>` };
  }

  if (node.type === "record") {
    return {
      name: `Record<${determinePropertyType(node.keyType).name}, ${
        determinePropertyType(node.valueType).name
      }>`,
    };
  }

  if (isPrimitiveTypeNode(node) && node.type !== "null") {
    return { name: node.type, value: node.const };
  }

  if (node.type === "object" && node.name) {
    return { name: node.name };
  }

  return { name: node.type };
}

/** processes an object to get the property docs */
function processObject(object: ObjectType, path: string[] = []): Props {
  let properties: Props = {};

  Object.getOwnPropertyNames(object.properties).forEach((propertyName) => {
    const propertyPath = [...path, propertyName].join(".");
    const propertyObject = object.properties[propertyName];
    properties[propertyPath] = {
      name: propertyName,
      required: propertyObject.required,
      type: determinePropertyType(propertyObject.node),
      description: propertyObject.node.description ?? "",
    };

    if (propertyObject.node.type === "object") {
      const subObjectProperties = processObject(propertyObject.node, [
        ...path,
        propertyName,
      ]);
      properties = { ...properties, ...subObjectProperties };
    }
  });

  return properties;
}

/**
 * Coverts a XLR to a set of props
 *
 * - @param type the XLR to convert
 */
export function covertXLRtoAssetDoc(type: NamedType<ObjectType>): AssetDoc {
  return {
    name: type.title ?? type.name,
    description: type.description ?? type.comment ?? "",
    props: processObject(type),
  };
}
