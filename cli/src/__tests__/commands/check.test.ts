import process from "process";
import fse from "fs-extra";
import child_process from "child_process";
import glob from "globby";
import stdMocks from "std-mocks";
import { vi, test, expect, describe, beforeEach } from "vitest";
import type { MockInstance } from "vitest";
import DependencyVersionsCheck from "../../commands/dependency-versions/check";

const mockTopLevelDependencies = {
  many: [
    "node_modules/@player-ui/binding-grammar/package.json",
    "node_modules/@player-ui/metrics/package.json",
    "node_modules/@player-ui/types/package.json",
    "node_modules/@player-ui/data/package.json",
    "node_modules/@player-ui/logger/package.json",
    "node_modules/@player-ui/asset-provider/package.json",
    "node_modules/@player-ui/shared-constants/package.json",
  ],
  single: ["node_modules/@player-ui/binding-grammar/package.json"],
  zero: [],
};

const mockNestedDependencies = {
  many: [
    "node_modules/@player-ui/core/node_modules/@player-ui/expressions/package.json",
    "node_modules/@cg-player/image/node_modules/@player-ui/link/package.json",
    "node_modules/@cg-player/image-capture/node_modules/@player-ui/beacon/package.json",
    "node_modules/@cg-player/point-of-need/node_modules/@player-ui/link/package.json",
    "node_modules/@player-ui/base-assets/node_modules/@player-ui/data/package.json",
    "node_modules/@player-ui/player/node_modules/@player-ui/metrics-plugin/package.json",
    "node_modules/@player-ui/text/node_modules/@player-ui/utils/package.json",
  ],
  single: [
    "node_modules/@player-ui/core/node_modules/@player-ui/expressions/package.json",
  ],
  zero: [],
};

const arbitraryPlayerVersions = [
  { version: "3.11.0" },
  { version: "3.30.1" },
  { version: "3.9.6" },
  { version: "4.20.5" },
  { version: "4.37.3" },
];

const runCommand = async (args: string[]) => {
  stdMocks.use();
  process.stdout.isTTY = false;
  const result = await DependencyVersionsCheck.run(args);
  stdMocks.restore();

  const output = stdMocks.flush();

  return {
    ...result,
    stdout: output.stdout.join("\n"),
  };
};

let cwdSpy: MockInstance;
let child_processSpy: MockInstance;
let logSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  cwdSpy = vi.spyOn(process, "cwd");
  child_processSpy = vi.spyOn(child_process, "execSync");
  logSpy = vi.spyOn(console, "log");

  cwdSpy.mockReturnValue("/Users/username/Desktop/Projects/player");
  child_processSpy.mockReturnValue(
    "/Users/username/Desktop/Projects/player" as any
  );
});

describe("checks @player-ui/@player-tools versions and outputs warnings/recommendations", () => {
  test("should issue error message due to not being run in the root directory", async () => {
    cwdSpy.mockReturnValue(
      "/Users/username/player/utilities/cli/src/__tests__"
    );
    await runCommand([]);
    expect(logSpy.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "[41m[37mERROR:[39m[49m cannot run the CLI in /Users/username/player/utilities/cli/src/__tests__",
        ],
        [
          "Please run the CLI in the root of the repository, /Users/username/Desktop/Projects/player",
        ],
      ]
    `);
  });

  describe("valid versions", () => {
    test("should log for 1 nested version and 1 top-level version that match", async () => {
      vi.spyOn(glob, "sync").mockReturnValueOnce([
        ...mockTopLevelDependencies.single,
        ...mockNestedDependencies.single,
      ]);

      vi.spyOn(fse, "readFileSync")
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]));

      await runCommand([]);
      expect(logSpy.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "Consider using the --help flag for more information about this command.",
          ],
          [
            "For more comprehensive logging, consider adding the -v flag.",
          ],
          [
            "For logging with full path to the dependency rather than with '➡', consider adding the -p flag.",
          ],
          [
            "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
          ],
          [
            "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
          ],
          [
            "
        TOP-LEVEL @player-ui/@player-tools DEPENDENCIES:",
          ],
          [
            "Version  How to find dependency       
        -------  -----------------------------
        3.11.0    ➡ @player-ui/binding-grammar
        ",
          ],
          [
            "
        NESTED @player-ui/@player-tools DEPENDENCIES:",
          ],
          [
            "Version  How to find dependency                      
        -------  --------------------------------------------
        3.11.0    ➡ @player-ui/core/ ➡ @player-ui/expressions
        ",
          ],
          [
            "Unique top-level and nested @player-ui/@player-tools versions match. ",
          ],
          [
            "There are no issues related to @player-ui/@player-tools dependency versioning. You are good to go! ",
          ],
        ]
      `);
    });

    test("should log for 1 top-level version, 0 nested version", async () => {
      vi.spyOn(glob, "sync").mockReturnValueOnce([
        ...mockTopLevelDependencies.single,
        ...mockNestedDependencies.zero,
      ]);

      vi.spyOn(fse, "readFileSync").mockReturnValueOnce(
        JSON.stringify(arbitraryPlayerVersions[0])
      );
      await runCommand([]);
      expect(logSpy.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "Consider using the --help flag for more information about this command.",
          ],
          [
            "For more comprehensive logging, consider adding the -v flag.",
          ],
          [
            "For logging with full path to the dependency rather than with '➡', consider adding the -p flag.",
          ],
          [
            "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
          ],
          [
            "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
          ],
          [
            "
        TOP-LEVEL @player-ui/@player-tools DEPENDENCIES:",
          ],
          [
            "Version  How to find dependency       
        -------  -----------------------------
        3.11.0    ➡ @player-ui/binding-grammar
        ",
          ],
          [
            "No nested @player-ui/@player-tools dependencies exist. Only a single top-level @player-ui/@player-tools version exists, 3.11.0",
          ],
          [
            "There are no issues related to @player-ui/@player-tools dependency versioning. You are good to go! ",
          ],
        ]
      `);
    });

    test("should log for 0 top-level version, 1 nested version", async () => {
      vi.spyOn(glob, "sync").mockReturnValueOnce([
        ...mockTopLevelDependencies.zero,
        ...mockNestedDependencies.single,
      ]);
      vi.spyOn(fse, "readFileSync").mockReturnValueOnce(
        JSON.stringify(arbitraryPlayerVersions[0])
      );
      await runCommand([]);
      expect(logSpy.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "Consider using the --help flag for more information about this command.",
          ],
          [
            "For more comprehensive logging, consider adding the -v flag.",
          ],
          [
            "For logging with full path to the dependency rather than with '➡', consider adding the -p flag.",
          ],
          [
            "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
          ],
          [
            "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
          ],
          [
            "
        NESTED @player-ui/@player-tools DEPENDENCIES:",
          ],
          [
            "Version  How to find dependency                      
        -------  --------------------------------------------
        3.11.0    ➡ @player-ui/core/ ➡ @player-ui/expressions
        ",
          ],
          [
            "No top-level @player-ui/@player-tools dependencies exist. Only a single nested @player-ui/@player-tools version exists, 3.11.0",
          ],
          [
            "There are no issues related to @player-ui/@player-tools dependency versioning. You are good to go! ",
          ],
        ]
      `);
    });

    test("should log for 0 top-level version, 0 nested version", async () => {
      vi.spyOn(glob, "sync").mockReturnValueOnce([]);
      await runCommand([]);
      expect(logSpy.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "Consider using the --help flag for more information about this command.",
          ],
          [
            "For more comprehensive logging, consider adding the -v flag.",
          ],
          [
            "For logging with full path to the dependency rather than with '➡', consider adding the -p flag.",
          ],
          [
            "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
          ],
          [
            "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
          ],
          [
            "No @player-ui/@player-tools dependencies exist.",
          ],
          [
            "There are no issues related to @player-ui/@player-tools dependency versioning. You are good to go! ",
          ],
        ]
      `);
    });
  });

  describe("invalid versions", () => {
    test("should issue error message due to not being run in the root directory", async () => {
      cwdSpy.mockReturnValue(
        "/Users/username/player/utilities/cli/src/__tests__"
      );
      await runCommand([]);
      expect(logSpy.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "[41m[37mERROR:[39m[49m cannot run the CLI in /Users/username/player/utilities/cli/src/__tests__",
          ],
          [
            "Please run the CLI in the root of the repository, /Users/username/Desktop/Projects/player",
          ],
        ]
      `);
    });

    test("should log for 1 top-level version, 1 nested version, with mismatch", async () => {
      vi.spyOn(glob, "sync").mockReturnValueOnce([
        ...mockTopLevelDependencies.single,
        ...mockNestedDependencies.single,
      ]);
      vi.spyOn(fse, "readFileSync")
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]));

      await runCommand([]);
      expect(logSpy.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "Consider using the --help flag for more information about this command.",
          ],
          [
            "For more comprehensive logging, consider adding the -v flag.",
          ],
          [
            "For logging with full path to the dependency rather than with '➡', consider adding the -p flag.",
          ],
          [
            "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
          ],
          [
            "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
          ],
          [
            "
        TOP-LEVEL @player-ui/@player-tools DEPENDENCIES:",
          ],
          [
            "Version  How to find dependency       
        -------  -----------------------------
        3.11.0    ➡ @player-ui/binding-grammar
        ",
          ],
          [
            "
        NESTED @player-ui/@player-tools DEPENDENCIES:",
          ],
          [
            "Version  How to find dependency                      
        -------  --------------------------------------------
        3.30.1    ➡ @player-ui/core/ ➡ @player-ui/expressions
        ",
          ],
          [
            "[41m[37mWARNINGS:[39m[49m",
          ],
          [
            "- Mismatch between the top-level and the nested @player-ui/@player-tools dependency.",
          ],
          [
            "[42mRECOMMENDATIONS:[49m",
          ],
          [
            "- The highest @player-ui/@player-tools version is 3.30.1 at the nested level. Please bump the top-level version, 3.11.0, to 3.30.1.",
          ],
        ]
      `);
    });

    test("should log for multiple top-level versions, multiple nested versions", async () => {
      vi.spyOn(glob, "sync").mockReturnValueOnce([
        ...mockTopLevelDependencies.many,
        ...mockNestedDependencies.many,
      ]);
      vi.spyOn(fse, "readFileSync") // 14 mockReturnValues
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[2]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[3]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[4]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[2]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[3]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[4]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[2]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[3]));

      await runCommand([]);
      expect(logSpy.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "Consider using the --help flag for more information about this command.",
          ],
          [
            "For more comprehensive logging, consider adding the -v flag.",
          ],
          [
            "For logging with full path to the dependency rather than with '➡', consider adding the -p flag.",
          ],
          [
            "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
          ],
          [
            "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
          ],
          [
            "
        TOP-LEVEL @player-ui/@player-tools DEPENDENCIES:",
          ],
          [
            "Version  How to find dependency        
        -------  ------------------------------
        3.9.6     ➡ @player-ui/types           
        3.11.0    ➡ @player-ui/binding-grammar 
                  ➡ @player-ui/asset-provider  
        3.30.1    ➡ @player-ui/metrics         
                  ➡ @player-ui/shared-constants
        4.20.5    ➡ @player-ui/data            
        4.37.3    ➡ @player-ui/logger          
        ",
          ],
          [
            "
        NESTED @player-ui/@player-tools DEPENDENCIES:",
          ],
          [
            "Version  How to find dependency                           
        -------  -------------------------------------------------
        3.9.6     ➡ @player-ui/core/ ➡ @player-ui/expressions     
                  ➡ @player-ui/player/ ➡ @player-ui/metrics-plugin
        3.11.0    ➡ @cg-player/point-of-need/ ➡ @player-ui/link   
        3.30.1    ➡ @player-ui/base-assets/ ➡ @player-ui/data     
        4.20.5    ➡ @cg-player/image/ ➡ @player-ui/link           
                  ➡ @player-ui/text/ ➡ @player-ui/utils           
        4.37.3    ➡ @cg-player/image-capture/ ➡ @player-ui/beacon 
        ",
          ],
          [
            "[41m[37mWARNINGS:[39m[49m",
          ],
          [
            "- There are multiple top-level @player-ui/@player-tools dependency versions.",
          ],
          [
            "- There are multiple nested @player-ui/@player-tools dependency versions.",
          ],
          [
            "[42mRECOMMENDATIONS:[49m",
          ],
          [
            "- Resolve all top-level @player-ui/@player-tools dependencies to the same version. Consider updating them to the latest player version you have, 4.37.3. When all top-level @player-ui/@player-tools dependencies are resolved, run the current CLI again to obtain recommendations about nested @player-ui/@player-tools dependencies.",
          ],
        ]
      `);
    });

    test("should log for 0 top-level version, multiple nested versions", async () => {
      vi.spyOn(glob, "sync").mockReturnValueOnce([
        ...mockTopLevelDependencies.zero,
        ...mockNestedDependencies.many,
      ]);
      vi.spyOn(fse, "readFileSync") // 7 mockReturnValues
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[2]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[3]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[4]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]));

      await runCommand([]);
      expect(logSpy.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "Consider using the --help flag for more information about this command.",
          ],
          [
            "For more comprehensive logging, consider adding the -v flag.",
          ],
          [
            "For logging with full path to the dependency rather than with '➡', consider adding the -p flag.",
          ],
          [
            "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
          ],
          [
            "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
          ],
          [
            "
        NESTED @player-ui/@player-tools DEPENDENCIES:",
          ],
          [
            "Version  How to find dependency                           
        -------  -------------------------------------------------
        3.9.6     ➡ @cg-player/image-capture/ ➡ @player-ui/beacon 
        3.11.0    ➡ @player-ui/core/ ➡ @player-ui/expressions     
                  ➡ @player-ui/player/ ➡ @player-ui/metrics-plugin
        3.30.1    ➡ @cg-player/image/ ➡ @player-ui/link           
                  ➡ @player-ui/text/ ➡ @player-ui/utils           
        4.20.5    ➡ @cg-player/point-of-need/ ➡ @player-ui/link   
        4.37.3    ➡ @player-ui/base-assets/ ➡ @player-ui/data     
        ",
          ],
          [
            "[41m[37mWARNINGS:[39m[49m",
          ],
          [
            "- There are multiple nested @player-ui/@player-tools dependency versions.",
          ],
          [
            "[42mRECOMMENDATIONS:[49m",
          ],
          [
            "- The highest @player-ui/@player-tools version is 4.37.3 at the nested level. Please add resolutions for all nested @player-ui/@player-tools versions to this version or bump the nested versions to it.",
          ],
        ]
      `);
    });

    test("should log for 1 top-level version, multiple nested versions, top-level version is highest", async () => {
      vi.spyOn(glob, "sync").mockReturnValueOnce([
        ...mockTopLevelDependencies.single,
        ...mockNestedDependencies.many,
      ]);
      vi.spyOn(fse, "readFileSync") // 8 mockReturnValues
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[4])) // 1 top-level
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[2]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[3]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0])) // nested-level highest
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[2]));
      await runCommand([]);
      expect(logSpy.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "Consider using the --help flag for more information about this command.",
          ],
          [
            "For more comprehensive logging, consider adding the -v flag.",
          ],
          [
            "For logging with full path to the dependency rather than with '➡', consider adding the -p flag.",
          ],
          [
            "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
          ],
          [
            "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
          ],
          [
            "
        TOP-LEVEL @player-ui/@player-tools DEPENDENCIES:",
          ],
          [
            "Version  How to find dependency       
        -------  -----------------------------
        4.37.3    ➡ @player-ui/binding-grammar
        ",
          ],
          [
            "
        NESTED @player-ui/@player-tools DEPENDENCIES:",
          ],
          [
            "Version  How to find dependency                           
        -------  -------------------------------------------------
        3.9.6     ➡ @cg-player/image-capture/ ➡ @player-ui/beacon 
                  ➡ @player-ui/text/ ➡ @player-ui/utils           
        3.11.0    ➡ @player-ui/core/ ➡ @player-ui/expressions     
                  ➡ @player-ui/base-assets/ ➡ @player-ui/data     
        3.30.1    ➡ @cg-player/image/ ➡ @player-ui/link           
                  ➡ @player-ui/player/ ➡ @player-ui/metrics-plugin
        4.20.5    ➡ @cg-player/point-of-need/ ➡ @player-ui/link   
        ",
          ],
          [
            "[41m[37mWARNINGS:[39m[49m",
          ],
          [
            "- There are multiple nested @player-ui/@player-tools dependency versions.",
          ],
          [
            "[42mRECOMMENDATIONS:[49m",
          ],
          [
            "- The highest @player-ui/@player-tools version is 4.37.3 at the top level. Please add resolutions for all nested @player-ui/@player-tools versions to this version or bump the nested versions to it.",
          ],
        ]
      `);
    });

    test("should log for 1 top-level version, multiple nested versions, nested-level version is highest", async () => {
      vi.spyOn(glob, "sync").mockReturnValueOnce([
        ...mockTopLevelDependencies.single,
        ...mockNestedDependencies.many,
      ]);
      vi.spyOn(fse, "readFileSync") // 8 mockReturnValues
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[2]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[3]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[4]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[2]));

      await runCommand([]);
      expect(logSpy.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "Consider using the --help flag for more information about this command.",
          ],
          [
            "For more comprehensive logging, consider adding the -v flag.",
          ],
          [
            "For logging with full path to the dependency rather than with '➡', consider adding the -p flag.",
          ],
          [
            "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
          ],
          [
            "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
          ],
          [
            "
        TOP-LEVEL @player-ui/@player-tools DEPENDENCIES:",
          ],
          [
            "Version  How to find dependency       
        -------  -----------------------------
        3.11.0    ➡ @player-ui/binding-grammar
        ",
          ],
          [
            "
        NESTED @player-ui/@player-tools DEPENDENCIES:",
          ],
          [
            "Version  How to find dependency                           
        -------  -------------------------------------------------
        3.9.6     ➡ @cg-player/image/ ➡ @player-ui/link           
                  ➡ @player-ui/text/ ➡ @player-ui/utils           
        3.11.0    ➡ @player-ui/base-assets/ ➡ @player-ui/data     
        3.30.1    ➡ @player-ui/core/ ➡ @player-ui/expressions     
                  ➡ @player-ui/player/ ➡ @player-ui/metrics-plugin
        4.20.5    ➡ @cg-player/image-capture/ ➡ @player-ui/beacon 
        4.37.3    ➡ @cg-player/point-of-need/ ➡ @player-ui/link   
        ",
          ],
          [
            "[41m[37mWARNINGS:[39m[49m",
          ],
          [
            "- There are multiple nested @player-ui/@player-tools dependency versions.",
          ],
          [
            "[42mRECOMMENDATIONS:[49m",
          ],
          [
            "- The highest @player-ui/@player-tools version is 4.37.3 at the nested level. Please bump the top-level version, 3.11.0, to 4.37.3.",
          ],
          [
            "- Also, please add resolutions or bump the versions for nested @player-ui/@player-tools dependencies whose version is not 4.37.3.",
          ],
        ]
      `);
    });

    test("should log for multiple top-level versions, 0 nested version", async () => {
      vi.spyOn(glob, "sync").mockReturnValueOnce([
        ...mockTopLevelDependencies.many,
        ...mockNestedDependencies.zero,
      ]);
      vi.spyOn(fse, "readFileSync") // 7 mockReturnValues
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[2]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[3]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[4]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]));

      await runCommand([]);
      expect(logSpy.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "Consider using the --help flag for more information about this command.",
          ],
          [
            "For more comprehensive logging, consider adding the -v flag.",
          ],
          [
            "For logging with full path to the dependency rather than with '➡', consider adding the -p flag.",
          ],
          [
            "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
          ],
          [
            "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
          ],
          [
            "
        TOP-LEVEL @player-ui/@player-tools DEPENDENCIES:",
          ],
          [
            "Version  How to find dependency        
        -------  ------------------------------
        3.9.6     ➡ @player-ui/types           
        3.11.0    ➡ @player-ui/binding-grammar 
                  ➡ @player-ui/asset-provider  
        3.30.1    ➡ @player-ui/metrics         
                  ➡ @player-ui/shared-constants
        4.20.5    ➡ @player-ui/data            
        4.37.3    ➡ @player-ui/logger          
        ",
          ],
          [
            "[41m[37mWARNINGS:[39m[49m",
          ],
          [
            "- There are multiple top-level @player-ui/@player-tools dependency versions.",
          ],
          [
            "[42mRECOMMENDATIONS:[49m",
          ],
          [
            "- Resolve all top-level @player-ui/@player-tools dependencies to the same version. Consider updating them to the latest player version you have, 4.37.3. When all top-level @player-ui/@player-tools dependencies are resolved, run the current CLI again to obtain recommendations about nested @player-ui/@player-tools dependencies.",
          ],
        ]
      `);
    });

    test("should log for multiple top-level versions, 1 nested version, top-level version is highest", async () => {
      vi.spyOn(glob, "sync").mockReturnValueOnce([
        ...mockTopLevelDependencies.many,
        ...mockNestedDependencies.single,
      ]);
      vi.spyOn(fse, "readFileSync") // 8 mockReturnValues
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[2]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[3]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[4]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[2])); // nested version

      await runCommand([]);
      expect(logSpy.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "Consider using the --help flag for more information about this command.",
          ],
          [
            "For more comprehensive logging, consider adding the -v flag.",
          ],
          [
            "For logging with full path to the dependency rather than with '➡', consider adding the -p flag.",
          ],
          [
            "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
          ],
          [
            "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
          ],
          [
            "
        TOP-LEVEL @player-ui/@player-tools DEPENDENCIES:",
          ],
          [
            "Version  How to find dependency        
        -------  ------------------------------
        3.9.6     ➡ @player-ui/types           
        3.11.0    ➡ @player-ui/binding-grammar 
                  ➡ @player-ui/asset-provider  
        3.30.1    ➡ @player-ui/metrics         
                  ➡ @player-ui/shared-constants
        4.20.5    ➡ @player-ui/data            
        4.37.3    ➡ @player-ui/logger          
        ",
          ],
          [
            "
        NESTED @player-ui/@player-tools DEPENDENCIES:",
          ],
          [
            "Version  How to find dependency                      
        -------  --------------------------------------------
        3.9.6     ➡ @player-ui/core/ ➡ @player-ui/expressions
        ",
          ],
          [
            "[41m[37mWARNINGS:[39m[49m",
          ],
          [
            "- There are multiple top-level @player-ui/@player-tools dependency versions.",
          ],
          [
            "[42mRECOMMENDATIONS:[49m",
          ],
          [
            "- Resolve all top-level @player-ui/@player-tools dependencies to the same version. Consider updating them to the latest player version you have, 4.37.3. When all top-level @player-ui/@player-tools dependencies are resolved, run the current CLI again to obtain recommendations about nested @player-ui/@player-tools dependencies.",
          ],
        ]
      `);
    });

    test("should log for multiple top-level versions, 1 nested version, nested-level version is highest", async () => {
      vi.spyOn(glob, "sync").mockReturnValueOnce([
        ...mockTopLevelDependencies.many,
        ...mockNestedDependencies.single,
      ]);
      vi.spyOn(fse, "readFileSync") // 8 mockReturnValues
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[2]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[3]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[2]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[4])); // nested version

      await runCommand([]);
      expect(logSpy.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "Consider using the --help flag for more information about this command.",
          ],
          [
            "For more comprehensive logging, consider adding the -v flag.",
          ],
          [
            "For logging with full path to the dependency rather than with '➡', consider adding the -p flag.",
          ],
          [
            "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
          ],
          [
            "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
          ],
          [
            "
        TOP-LEVEL @player-ui/@player-tools DEPENDENCIES:",
          ],
          [
            "Version  How to find dependency        
        -------  ------------------------------
        3.9.6     ➡ @player-ui/types           
                  ➡ @player-ui/shared-constants
        3.11.0    ➡ @player-ui/binding-grammar 
                  ➡ @player-ui/logger          
        3.30.1    ➡ @player-ui/metrics         
                  ➡ @player-ui/asset-provider  
        4.20.5    ➡ @player-ui/data            
        ",
          ],
          [
            "
        NESTED @player-ui/@player-tools DEPENDENCIES:",
          ],
          [
            "Version  How to find dependency                      
        -------  --------------------------------------------
        4.37.3    ➡ @player-ui/core/ ➡ @player-ui/expressions
        ",
          ],
          [
            "[41m[37mWARNINGS:[39m[49m",
          ],
          [
            "- There are multiple top-level @player-ui/@player-tools dependency versions.",
          ],
          [
            "[42mRECOMMENDATIONS:[49m",
          ],
          [
            "- Resolve all top-level @player-ui/@player-tools dependencies to the same version. Consider updating them to the latest player version you have, 4.20.5. When all top-level @player-ui/@player-tools dependencies are resolved, run the current CLI again to obtain recommendations about nested @player-ui/@player-tools dependencies.",
          ],
        ]
      `);
    });
  });
});
