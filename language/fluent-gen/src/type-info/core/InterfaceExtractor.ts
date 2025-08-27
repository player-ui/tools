import { Project, SourceFile, InterfaceDeclaration } from "ts-morph";
import type { ExtendsInfo, PropertyInfo, ExtractResult } from "../types.js";
import { ExtractorContext } from "./ExtractorContext.js";
import { TypeAnalyzer } from "../analyzers/TypeAnalyzer.js";
import { SymbolResolver } from "../resolvers/SymbolResolver.js";
import { extractJSDocFromNode } from "../utils/jsdoc.js";
import { GenericContext } from "./GenericContext.js";
import { resolveGenericParametersToDefaults } from "../utils/index.js";

/**
 * Main orchestrator for TypeScript interface extraction.
 * Coordinates all the extraction components to analyze an interface.
 */
export class InterfaceExtractor {
  private readonly context: ExtractorContext;
  private readonly typeAnalyzer: TypeAnalyzer;
  private readonly symbolResolver: SymbolResolver;

  constructor(project: Project, sourceFile: SourceFile) {
    this.context = new ExtractorContext(project, sourceFile);
    this.typeAnalyzer = new TypeAnalyzer();
    this.symbolResolver = new SymbolResolver(this.context);
  }

  /**
   * Extract complete information about an interface optimized for fluent builder generation.
   */
  extract(interfaceName: string): ExtractResult {
    const targetInterface = this.findInterface(interfaceName);
    if (!targetInterface) {
      const availableInterfaces = this.getAvailableInterfaces();
      throw new Error(
        `Interface '${interfaceName}' not found in '${this.context.getSourceFile().getFilePath()}'. ` +
          `Available interfaces: ${availableInterfaces.join(", ") || "none"}`,
      );
    }

    // Extract extends information first
    const extendsInfo = this.extractExtendsInfo(targetInterface);

    // Add extends dependencies
    this.addExtendsDependencies(extendsInfo);

    // Set current interface context for generic parameter resolution
    this.context.setCurrentInterface(targetInterface);

    // Extract properties with initial generic context for root interface defaults
    const properties = this.extractProperties(targetInterface);

    // Clear current interface context
    this.context.setCurrentInterface(null);

    // Extract JSDoc documentation
    const documentation = extractJSDocFromNode(targetInterface);

    return {
      kind: "non-terminal",
      type: "object",
      name: targetInterface.getName(),
      typeAsString: targetInterface.getText(),
      properties,
      filePath: this.context.getSourceFile().getFilePath(),
      dependencies: this.context.getDependencies(),
      ...(documentation ? { documentation } : {}),
    };
  }

  /**
   * Find an interface declaration by name in the current source file.
   */
  private findInterface(name: string): InterfaceDeclaration | null {
    const interfaces = this.context.getSourceFile().getInterfaces();
    return interfaces.find((iface) => iface.getName() === name) || null;
  }

  /**
   * Get names of all available interfaces in the current source file.
   */
  private getAvailableInterfaces(): string[] {
    const interfaces = this.context.getSourceFile().getInterfaces();
    return interfaces.map((iface) => iface.getName());
  }

  /**
   * Extract extends clause information from an interface.
   */
  private extractExtendsInfo(
    interfaceDecl: InterfaceDeclaration,
  ): ExtendsInfo[] {
    const extendsInfo: ExtendsInfo[] = [];

    for (const heritage of interfaceDecl.getExtends()) {
      const expression = heritage.getExpression();
      const typeAsString = expression.getText().split("<")[0]!.trim();

      // Extract type arguments
      const typeArgs = heritage.getTypeArguments();
      const typeArguments = typeArgs.map((arg) => {
        const text = arg.getText();
        // Remove quotes from string literals
        if (text.startsWith('"') && text.endsWith('"')) {
          return text.slice(1, -1);
        }
        return text;
      });

      extendsInfo.push({
        typeAsString,
        typeArguments,
      });
    }

    return extendsInfo;
  }

  /**
   * Add extends dependencies to the context.
   */
  private addExtendsDependencies(extendsInfo: ExtendsInfo[]): void {
    for (const extendsClause of extendsInfo) {
      const resolvedSymbol = this.symbolResolver.resolve(
        extendsClause.typeAsString,
      );
      if (resolvedSymbol) {
        this.context.addDependency({
          target: resolvedSymbol.target,
          dependency: extendsClause.typeAsString,
        });
      } else {
        // Check if it's an external module dependency
        const moduleName = this.symbolResolver.getExternalModuleName(
          extendsClause.typeAsString,
        );
        if (moduleName) {
          this.context.addDependency({
            target: { kind: "module", name: moduleName },
            dependency: extendsClause.typeAsString,
          });
        }
      }
    }
  }

  /**
   * Extract properties from an interface with circular dependency protection.
   */
  private extractProperties(
    interfaceDecl: InterfaceDeclaration,
  ): PropertyInfo[] {
    const properties: PropertyInfo[] = [];
    const typeName = interfaceDecl.getName();

    // Check for circular dependency
    if (!this.context.enterCircularCheck(typeName)) {
      console.warn(`Circular dependency detected for interface: ${typeName}`);
      return properties;
    }

    try {
      // Set up initial generic context for root interface with defaults
      let genericContext = GenericContext.empty();
      const defaultSubstitutions =
        resolveGenericParametersToDefaults(interfaceDecl);
      if (defaultSubstitutions.size > 0) {
        genericContext = genericContext.withSubstitutions(defaultSubstitutions);
      }

      for (const property of interfaceDecl.getProperties()) {
        const propertyName = property.getName();
        const typeNode = property.getTypeNode();
        const isOptional = property.hasQuestionToken();

        if (typeNode) {
          const propertyInfo = this.typeAnalyzer.analyze({
            name: propertyName,
            typeNode,
            context: this.context,
            options: {
              isOptional,
              // Pass the generic context with defaults to child analysis
              ...(defaultSubstitutions.size > 0 && { genericContext }),
            },
          });

          if (propertyInfo) {
            // Extract JSDoc documentation for this property
            const documentation = extractJSDocFromNode(property);
            if (documentation) {
              propertyInfo.documentation = documentation;
            }
            properties.push(propertyInfo);
          }
        }
      }
    } finally {
      this.context.exitCircularCheck(typeName);
    }

    return properties;
  }

  /**
   * Get extraction context for debugging.
   */
  getContext(): ExtractorContext {
    return this.context;
  }

  /**
   * Get type analyzer instance.
   */
  getTypeAnalyzer(): TypeAnalyzer {
    return this.typeAnalyzer;
  }

  /**
   * Get symbol resolver instance.
   */
  getSymbolResolver(): SymbolResolver {
    return this.symbolResolver;
  }
}
