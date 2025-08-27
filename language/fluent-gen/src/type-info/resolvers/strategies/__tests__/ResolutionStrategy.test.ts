import { test, expect } from "vitest";
import { Project } from "ts-morph";
import type { ResolutionStrategy } from "../ResolutionStrategy.js";
import type { ResolutionContext, ResolvedSymbol } from "../../../types.js";

function createMockProject(): Project {
  return new Project({ useInMemoryFileSystem: true });
}

// Mock implementation for testing
class MockResolutionStrategy implements ResolutionStrategy {
  constructor(
    public name: string,
    private canResolveResult: boolean = true,
    private resolveResult: ResolvedSymbol | null = null,
  ) {}

  canResolve(_context: ResolutionContext): boolean {
    return this.canResolveResult;
  }

  resolve(_context: ResolutionContext): ResolvedSymbol | null {
    return this.resolveResult;
  }
}

test("ResolutionStrategy interface has correct structure", () => {
  const mockStrategy = new MockResolutionStrategy("TestStrategy");

  // Test that interface properties exist
  expect(mockStrategy.name).toBe("TestStrategy");
  expect(typeof mockStrategy.canResolve).toBe("function");
  expect(typeof mockStrategy.resolve).toBe("function");
});

test("canResolve method returns boolean", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile("/test.ts", "interface Test {}");

  const context: ResolutionContext = {
    symbolName: "Test",
    sourceFile,
  };

  const trueStrategy = new MockResolutionStrategy("TrueStrategy", true);
  const falseStrategy = new MockResolutionStrategy("FalseStrategy", false);

  expect(trueStrategy.canResolve(context)).toBe(true);
  expect(falseStrategy.canResolve(context)).toBe(false);
});

test("resolve method returns ResolvedSymbol or null", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile("/test.ts", "interface Test {}");

  const context: ResolutionContext = {
    symbolName: "Test",
    sourceFile,
  };

  const mockResolvedSymbol: ResolvedSymbol = {
    declaration: sourceFile.getInterface("Test")!,
    target: { kind: "local", filePath: "/test.ts", name: "Test" },
    isLocal: true,
  };

  const successStrategy = new MockResolutionStrategy(
    "SuccessStrategy",
    true,
    mockResolvedSymbol,
  );
  const failStrategy = new MockResolutionStrategy("FailStrategy", true, null);

  expect(successStrategy.resolve(context)).toEqual(mockResolvedSymbol);
  expect(failStrategy.resolve(context)).toBeNull();
});

test("strategies can have different names", () => {
  const strategy1 = new MockResolutionStrategy("LocalDeclaration");
  const strategy2 = new MockResolutionStrategy("ImportResolution");
  const strategy3 = new MockResolutionStrategy("ExternalModule");

  expect(strategy1.name).toBe("LocalDeclaration");
  expect(strategy2.name).toBe("ImportResolution");
  expect(strategy3.name).toBe("ExternalModule");

  // Each strategy should be independent
  expect(strategy1.name).not.toBe(strategy2.name);
  expect(strategy2.name).not.toBe(strategy3.name);
});

test("strategies can handle different resolution contexts", () => {
  const project = createMockProject();

  const file1 = project.createSourceFile("/file1.ts", "interface A {}");
  const file2 = project.createSourceFile("/file2.ts", "interface B {}");

  const context1: ResolutionContext = {
    symbolName: "A",
    sourceFile: file1,
  };

  const context2: ResolutionContext = {
    symbolName: "B",
    sourceFile: file2,
  };

  const strategy = new MockResolutionStrategy("TestStrategy");

  // Strategy should handle different contexts
  expect(strategy.canResolve(context1)).toBe(true);
  expect(strategy.canResolve(context2)).toBe(true);
});

test("strategy interface supports polymorphic usage", () => {
  const strategies: ResolutionStrategy[] = [
    new MockResolutionStrategy("Strategy1", true),
    new MockResolutionStrategy("Strategy2", false),
    new MockResolutionStrategy("Strategy3", true),
  ];

  const project = createMockProject();
  const sourceFile = project.createSourceFile("/test.ts", "");
  const context: ResolutionContext = {
    symbolName: "Test",
    sourceFile,
  };

  // Should be able to call methods on all strategies polymorphically
  const results = strategies.map((strategy) => ({
    name: strategy.name,
    canResolve: strategy.canResolve(context),
    resolve: strategy.resolve(context),
  }));

  expect(results).toHaveLength(3);
  expect(results[0]!.name).toBe("Strategy1");
  expect(results[0]!.canResolve).toBe(true);
  expect(results[1]!.canResolve).toBe(false);
  expect(results[2]!.canResolve).toBe(true);
});

test("strategy can handle contexts with additional properties", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile("/test.ts", "interface Test {}");

  const contextWithExtra: ResolutionContext = {
    symbolName: "Test",
    sourceFile,
    visitedPaths: new Set(["/some/path"]),
  };

  const strategy = new MockResolutionStrategy("TestStrategy");

  // Should handle contexts with optional properties
  expect(() => strategy.canResolve(contextWithExtra)).not.toThrow();
  expect(() => strategy.resolve(contextWithExtra)).not.toThrow();
});

test("strategy interface allows for custom implementations", () => {
  class CustomStrategy implements ResolutionStrategy {
    name = "CustomStrategy";

    canResolve(context: ResolutionContext): boolean {
      return context.symbolName.startsWith("Custom");
    }

    resolve(context: ResolutionContext): ResolvedSymbol | null {
      if (this.canResolve(context)) {
        // Return a mock resolved symbol for testing
        const mockDeclaration = context.sourceFile.getInterfaces()[0];
        if (mockDeclaration) {
          return {
            declaration: mockDeclaration,
            target: {
              kind: "local",
              filePath: context.sourceFile.getFilePath(),
              name: context.symbolName,
            },
            isLocal: true,
          };
        }
      }
      return null;
    }
  }

  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    "interface CustomType {}",
  );

  const customStrategy = new CustomStrategy();

  expect(customStrategy.name).toBe("CustomStrategy");
  expect(
    customStrategy.canResolve({ symbolName: "CustomType", sourceFile }),
  ).toBe(true);
  expect(
    customStrategy.canResolve({ symbolName: "RegularType", sourceFile }),
  ).toBe(false);

  const result = customStrategy.resolve({
    symbolName: "CustomType",
    sourceFile,
  });
  expect(result).toBeDefined();
  expect(result!.target.name).toBe("CustomType");
});
