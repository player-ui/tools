import type { TopLevelNode } from "@player-tools/xlr-utils";
import { isNodeExported, isTopLevelNode } from "@player-tools/xlr-utils";
import path from "path";
import ts from "typescript";
import fs from "fs";
import type { Manifest, NamedType, RefNode } from "@player-tools/xlr";
import type { TsConverter } from "@player-tools/xlr-converters";
import type { VisitorProps } from "./types";
import { PLAYER_PLUGIN_INTERFACE_NAME } from "../consts";

/**
 * Follows references to get the actual underlying declaration
 */
function getUnderlyingNode(
  element: ts.TypeQueryNode | ts.TypeReferenceNode,
  checker: ts.TypeChecker,
): TopLevelNode | undefined {
  let referencedSymbol;
  if (ts.isTypeReferenceNode(element)) {
    referencedSymbol = checker.getSymbolAtLocation(element.typeName);
  } else {
    referencedSymbol = checker.getSymbolAtLocation(element.exprName);
  }

  const alias = referencedSymbol
    ? checker.getAliasedSymbol(referencedSymbol)
    : undefined;
  let varDecl;
  /**
   * The TypeChecker will return the interface/type declaration or the variable statement
   * so if we are getting a variable, we need to grab the variable declaration
   */
  if (ts.isTypeReferenceNode(element)) {
    varDecl = alias?.declarations?.[0];
  } else {
    varDecl = alias?.declarations?.[0].parent.parent;
  }

  if (varDecl && isTopLevelNode(varDecl)) {
    return varDecl;
  }
}

/**
 * Fixes ExpressionHandler ref nodes that don't have argument names because some way of writing ExpressionHandler prevent the ts compiler from inferring them
 */
function fixExpressionArgNames(
  sourceNode: ts.VariableStatement,
  generatedTypeRef: NamedType<RefNode>,
  checker: ts.TypeChecker,
): NamedType {
  const typeRefCopy = { ...generatedTypeRef };
  const { initializer } = sourceNode.declarationList.declarations[0];
  let offset: number;
  let arrowFunction: ts.ArrowFunction;

  if (
    initializer &&
    ts.isCallExpression(initializer) &&
    ts.isArrowFunction(initializer.arguments[0])
  ) {
    // handles the case of `withoutContext` expression where the types are provided by the generic
    offset = 0;
    arrowFunction = initializer.arguments[0] as ts.ArrowFunction;
  } else {
    // handles the case of a direct `ExpressionHandler` where the types are provided by the generic
    offset = 1;
    arrowFunction = initializer as ts.ArrowFunction;
  }

  const paramsNode = typeRefCopy.genericArguments?.[0];

  if (paramsNode && paramsNode.type === "array") {
    const functionArg = arrowFunction.parameters?.[offset];
    if (!paramsNode.name && functionArg) {
      paramsNode.name = functionArg.name.getText();
    }
  } else if (paramsNode && paramsNode.type === "tuple") {
    paramsNode.elementTypes?.forEach((gArg, index) => {
      const functionArg = arrowFunction.parameters?.[index + offset];
      if (!gArg.name && functionArg) {
        gArg.name = functionArg.name.getText();
      }
    });
  }

  return typeRefCopy;
}

/**
 * Player specific modifications that we need to do to massage generic XLR conversion because of our weird types
 * Most of this is _definitely not_ best practice.
 */
function runPlayerPostProcessing(
  node: TopLevelNode,
  xlr: NamedType,
  checker: ts.TypeChecker,
): NamedType {
  if (
    xlr.type === "ref" &&
    xlr.ref.includes("ExpressionHandler") &&
    ts.isVariableStatement(node)
  ) {
    return fixExpressionArgNames(node, xlr, checker);
  }

  return xlr;
}

/**
 * Generated the XLR for a Capability, writes it to the specified path, and returns the name
 */
function generateXLR(
  node: ts.Node,
  checker: ts.TypeChecker,
  converter: TsConverter,
  outputDirectory: string,
): string {
  if (ts.isTypeReferenceNode(node) || ts.isTypeQueryNode(node)) {
    const varDecl = getUnderlyingNode(node, checker);

    if (varDecl) {
      let capabilityDescription = converter.convertTopLevelNode(varDecl);
      capabilityDescription = runPlayerPostProcessing(
        varDecl,
        capabilityDescription,
        checker,
      );
      const capabilityName = capabilityDescription?.name ?? "error";
      fs.writeFileSync(
        path.join(outputDirectory, `${capabilityName}.json`),
        JSON.stringify(capabilityDescription, undefined, 4),
      );
      return capabilityName;
    }
  }

  throw new Error(`Can't export non reference type ${node.getText()}`);
}

/** visit nodes finding exported classes */
export function pluginVisitor(args: VisitorProps): Manifest | undefined {
  const { sourceFile, checker, converter, outputDirectory } = args;

  let capabilities: Manifest | undefined;

  ts.forEachChild(sourceFile, (node) => {
    // Only consider exported nodes
    if (!isNodeExported(node)) {
      return;
    }

    // Plugins are classes so filter those
    if (ts.isClassDeclaration(node) && node.name) {
      const symbol = checker.getSymbolAtLocation(node.name);
      if (symbol) {
        // look at what they implement
        node.heritageClauses?.forEach((heritage) => {
          heritage.types.forEach((hInterface) => {
            // check if heritage is right one
            if (
              hInterface.expression.getText() !== PLAYER_PLUGIN_INTERFACE_NAME
            ) {
              return;
            }

            capabilities = {
              pluginName: "Unknown Plugin",
            };

            // Get registration name of plugin
            const nameProperty = node.members.find(
              (member) =>
                ts.isPropertyDeclaration(member) &&
                member.name?.getText() === "name",
            ) as ts.PropertyDeclaration | undefined;
            if (nameProperty && nameProperty.initializer) {
              capabilities.pluginName = nameProperty.initializer
                ?.getText()
                .replace(/[""]+/g, "");
            }

            const provides: Map<string, Array<string>> = new Map();
            const typeArgs = hInterface.typeArguments;

            const pluginDec = checker.getTypeAtLocation(hInterface).symbol
              ?.declarations?.[0] as ts.InterfaceDeclaration | undefined;
            // process type parameters to figure out what capabilities are provided
            pluginDec?.typeParameters?.forEach((param, index) => {
              const capabilityType = param.name.getText();
              if (index < (typeArgs?.length ?? 0)) {
                const exportedCapabilities = typeArgs?.[index] as ts.TypeNode;
                // if its an array process each type
                if (ts.isTupleTypeNode(exportedCapabilities)) {
                  const capabilityNames = exportedCapabilities.elements.map(
                    (element) =>
                      generateXLR(element, checker, converter, outputDirectory),
                  );

                  provides.set(capabilityType, capabilityNames);
                } else if (
                  ts.isTypeReferenceNode(exportedCapabilities) ||
                  ts.isTypeQueryNode(exportedCapabilities)
                ) {
                  const capabilityName = generateXLR(
                    exportedCapabilities,
                    checker,
                    converter,
                    outputDirectory,
                  );
                  provides.set(capabilityType, [capabilityName]);
                } else {
                  throw new Error(`Can't figure out type ${capabilityType}`);
                }
              }
            });
            capabilities.capabilities = provides;
          });
        });
      }
    }
  });

  return capabilities;
}
