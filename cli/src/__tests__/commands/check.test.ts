import process from 'process';
import fse from 'fs-extra';
import * as globApi from 'glob';
import child_process from 'child_process';
import stdMocks from 'std-mocks';
import DependencyVersionsCheck from '../../commands/dependency-versions/check';

const mocktopLevelDependencies = {
  many: [
    'node_modules/@player-ui/binding-grammar/package.json',
    'node_modules/@player-ui/metrics/package.json',
    'node_modules/@player-ui/types/package.json',
    'node_modules/@player-ui/data/package.json',
    'node_modules/@player-ui/logger/package.json',
    'node_modules/@player-ui/asset-provider/package.json',
    'node_modules/@player-ui/shared-constants/package.json',
  ],
  single: ['node_modules/@player-ui/binding-grammar/package.json'],
  zero: [],
};

const mocknestedDependencies = {
  many: [
    'node_modules/@player-ui/core/node_modules/@player-ui/expressions/package.json',
    'node_modules/@cg-player/image/node_modules/@player-ui/link/package.json',
    'node_modules/@cg-player/image-capture/node_modules/@player-ui/beacon/package.json',
    'node_modules/@cg-player/point-of-need/node_modules/@player-ui/link/package.json',
    'node_modules/@player-ui/base-assets/node_modules/@player-ui/data/package.json',
    'node_modules/@player-ui/player/node_modules/@player-ui/metrics-plugin/package.json',
    'node_modules/@player-ui/text/node_modules/@player-ui/utils/package.json',
  ],
  single: [
    'node_modules/@player-ui/core/node_modules/@player-ui/expressions/package.json',
  ],
  zero: [],
};

const arbitraryPlayerVersions = [
  { version: '3.11.0' },
  { version: '3.30.1' },
  { version: '3.9.6' },
  { version: '4.20.5' },
  { version: '4.37.3' },
];

const runCommand = async (args: string[]) => {
  stdMocks.use();
  process.stdout.isTTY = false;
  const result = await DependencyVersionsCheck.run(args);
  stdMocks.restore();

  const output = stdMocks.flush();

  return {
    ...result,
    stdout: output.stdout.join('\n'),
  };
};

let cwdSpy: jest.SpyInstance;
let child_processSpy: jest.SpyInstance;
let logSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  cwdSpy = jest.spyOn(process, 'cwd');
  child_processSpy = jest.spyOn(child_process, 'execSync');
  logSpy = jest.spyOn(console, 'log');

  cwdSpy.mockReturnValue('/Users/username/Desktop/Projects/player');
  child_processSpy.mockReturnValue(
    '/Users/username/Desktop/Projects/player' as any
  );
});

describe('checks @player-ui/@player-tools versions and outputs warnings/recommendations', () => {
  it('should issue error message due to not being run in the root directory', async () => {
    cwdSpy.mockReturnValue(
      '/Users/username/player/utilities/cli/src/__tests__'
    );
    await runCommand([]);
    expect(logSpy.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "[41m[37mERROR:[39m[49m cannot run the CLI in /Users/username/player/utilities/cli/src/__tests__",
        ],
        Array [
          "Please run the CLI in the root of the repository, /Users/username/Desktop/Projects/player",
        ],
      ]
    `);
  });

  describe('valid versions', () => {
    it('should log for 1 nested version and 1 top-level version that match', async () => {
      jest
        .spyOn(globApi, 'globSync')
        .mockImplementation((_input: string | string[]) => {
          return [
            'node_modules/@player-ui/binding-grammar/package.json',
            'node_modules/@player-ui/core/node_modules/@player-ui/expressions/package.json',
          ];
        });
      jest
        .spyOn(fse, 'readFileSync')
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]));

      await runCommand([]);
      expect(logSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "Consider using the --help flag for more information about this command.",
          ],
          Array [
            "For more comprehensive logging, consider adding the -v flag.",
          ],
          Array [
            "For logging with full path to the dependency rather than with \\"➡\\", consider adding the -p flag.",
          ],
          Array [
            "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
          ],
          Array [
            "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
          ],
          Array [
            "
        TOP-LEVEL @player-ui/@player-tools DEPENDENCIES:",
          ],
          Array [
            "Version  How to find dependency       
        -------  -----------------------------
        3.11.0    ➡ @player-ui/binding-grammar
        ",
          ],
          Array [
            "
        NESTED @player-ui/@player-tools DEPENDENCIES:",
          ],
          Array [
            "Version  How to find dependency                      
        -------  --------------------------------------------
        3.11.0    ➡ @player-ui/core/ ➡ @player-ui/expressions
        ",
          ],
          Array [
            "Unique top-level and nested @player-ui/@player-tools versions match. ",
          ],
          Array [
            "There are no issues related to @player-ui/@player-tools dependency versioning. You are good to go! ",
          ],
        ]
      `);
    });

    it('should log for 1 top-level version, 0 nested version', async () => {
      jest
        .spyOn(globApi, 'globSync')
        .mockImplementation((_input: string | string[]) => {
          return [
            ...mocktopLevelDependencies.single,
            ...mocknestedDependencies.zero,
          ];
        });
      jest
        .spyOn(fse, 'readFileSync')
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]));
      await runCommand([]);
      expect(logSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "Consider using the --help flag for more information about this command.",
          ],
          Array [
            "For more comprehensive logging, consider adding the -v flag.",
          ],
          Array [
            "For logging with full path to the dependency rather than with \\"➡\\", consider adding the -p flag.",
          ],
          Array [
            "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
          ],
          Array [
            "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
          ],
          Array [
            "
        TOP-LEVEL @player-ui/@player-tools DEPENDENCIES:",
          ],
          Array [
            "Version  How to find dependency       
        -------  -----------------------------
        3.11.0    ➡ @player-ui/binding-grammar
        ",
          ],
          Array [
            "No nested @player-ui/@player-tools dependencies exist. Only a single top-level @player-ui/@player-tools version exists, 3.11.0",
          ],
          Array [
            "There are no issues related to @player-ui/@player-tools dependency versioning. You are good to go! ",
          ],
        ]
      `);
    });

    it('should log for 0 top-level version, 1 nested version', async () => {
      jest
        .spyOn(globApi, 'globSync')
        .mockImplementation((_input: string | string[]) => {
          return [
            ...mocktopLevelDependencies.zero,
            ...mocknestedDependencies.single,
          ];
        });
      jest
        .spyOn(fse, 'readFileSync')
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]));
      await runCommand([]);
      expect(logSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "Consider using the --help flag for more information about this command.",
          ],
          Array [
            "For more comprehensive logging, consider adding the -v flag.",
          ],
          Array [
            "For logging with full path to the dependency rather than with \\"➡\\", consider adding the -p flag.",
          ],
          Array [
            "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
          ],
          Array [
            "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
          ],
          Array [
            "
        NESTED @player-ui/@player-tools DEPENDENCIES:",
          ],
          Array [
            "Version  How to find dependency                      
        -------  --------------------------------------------
        3.11.0    ➡ @player-ui/core/ ➡ @player-ui/expressions
        ",
          ],
          Array [
            "No top-level @player-ui/@player-tools dependencies exist. Only a single nested @player-ui/@player-tools version exists, 3.11.0",
          ],
          Array [
            "There are no issues related to @player-ui/@player-tools dependency versioning. You are good to go! ",
          ],
        ]
      `);
    });

    it('should log for 0 top-level version, 0 nested version', async () => {
      jest
        .spyOn(globApi, 'globSync')
        .mockImplementation((_input: string | string[]) => {
          return [];
        });
      await runCommand([]);
      expect(logSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "Consider using the --help flag for more information about this command.",
          ],
          Array [
            "For more comprehensive logging, consider adding the -v flag.",
          ],
          Array [
            "For logging with full path to the dependency rather than with \\"➡\\", consider adding the -p flag.",
          ],
          Array [
            "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
          ],
          Array [
            "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
          ],
          Array [
            "No @player-ui/@player-tools dependencies exist.",
          ],
          Array [
            "There are no issues related to @player-ui/@player-tools dependency versioning. You are good to go! ",
          ],
        ]
      `);
    });
  });

  describe('invalid versions', () => {
    it('should issue error message due to not being run in the root directory', async () => {
      cwdSpy.mockReturnValue(
        '/Users/username/player/utilities/cli/src/__tests__'
      );
      await runCommand([]);
      expect(logSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "[41m[37mERROR:[39m[49m cannot run the CLI in /Users/username/player/utilities/cli/src/__tests__",
          ],
          Array [
            "Please run the CLI in the root of the repository, /Users/username/Desktop/Projects/player",
          ],
        ]
      `);
    });

    it('should log for 1 top-level version, 1 nested version, with mismatch', async () => {
      jest
        .spyOn(globApi, 'globSync')
        .mockImplementation((_input: string | string[]) => {
          return [
            ...mocktopLevelDependencies.single,
            ...mocknestedDependencies.single,
          ];
        });
      jest
        .spyOn(fse, 'readFileSync')
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]));

      await runCommand([]);
      expect(logSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "Consider using the --help flag for more information about this command.",
          ],
          Array [
            "For more comprehensive logging, consider adding the -v flag.",
          ],
          Array [
            "For logging with full path to the dependency rather than with \\"➡\\", consider adding the -p flag.",
          ],
          Array [
            "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
          ],
          Array [
            "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
          ],
          Array [
            "
        TOP-LEVEL @player-ui/@player-tools DEPENDENCIES:",
          ],
          Array [
            "Version  How to find dependency       
        -------  -----------------------------
        3.11.0    ➡ @player-ui/binding-grammar
        ",
          ],
          Array [
            "
        NESTED @player-ui/@player-tools DEPENDENCIES:",
          ],
          Array [
            "Version  How to find dependency                      
        -------  --------------------------------------------
        3.30.1    ➡ @player-ui/core/ ➡ @player-ui/expressions
        ",
          ],
          Array [
            "[41m[37mWARNINGS:[39m[49m",
          ],
          Array [
            "- Mismatch between the top-level and the nested @player-ui/@player-tools dependency.",
          ],
          Array [
            "[42mRECOMMENDATIONS:[49m",
          ],
          Array [
            "- The highest @player-ui/@player-tools version is 3.30.1 at the nested level. Please bump the top-level version, 3.11.0, to 3.30.1.",
          ],
        ]
      `);
    });

    it('should log for multiple top-level versions, multiple nested versions', async () => {
      jest
        .spyOn(globApi, 'globSync')
        .mockImplementation((_input: string | string[]) => {
          return [
            ...mocktopLevelDependencies.many,
            ...mocknestedDependencies.many,
          ];
        });
      jest
        .spyOn(fse, 'readFileSync') // 14 mockReturnValues
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
        Array [
          Array [
            "Consider using the --help flag for more information about this command.",
          ],
          Array [
            "For more comprehensive logging, consider adding the -v flag.",
          ],
          Array [
            "For logging with full path to the dependency rather than with \\"➡\\", consider adding the -p flag.",
          ],
          Array [
            "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
          ],
          Array [
            "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
          ],
          Array [
            "
        TOP-LEVEL @player-ui/@player-tools DEPENDENCIES:",
          ],
          Array [
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
          Array [
            "
        NESTED @player-ui/@player-tools DEPENDENCIES:",
          ],
          Array [
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
          Array [
            "[41m[37mWARNINGS:[39m[49m",
          ],
          Array [
            "- There are multiple top-level @player-ui/@player-tools dependency versions.",
          ],
          Array [
            "- There are multiple nested @player-ui/@player-tools dependency versions.",
          ],
          Array [
            "[42mRECOMMENDATIONS:[49m",
          ],
          Array [
            "- Resolve all top-level @player-ui/@player-tools dependencies to the same version. Consider updating them to the latest player version you have, 4.37.3. When all top-level @player-ui/@player-tools dependencies are resolved, run the current CLI again to obtain recommendations about nested @player-ui/@player-tools dependencies.",
          ],
        ]
      `);
    });

    it('should log for 0 top-level version, multiple nested versions', async () => {
      jest
        .spyOn(globApi, 'globSync')
        .mockImplementation((_input: string | string[]) => {
          return [
            ...mocktopLevelDependencies.zero,
            ...mocknestedDependencies.many,
          ];
        });
      jest
        .spyOn(fse, 'readFileSync') // 7 mockReturnValues
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[2]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[3]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[4]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]));

      await runCommand([]);
      expect(logSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "Consider using the --help flag for more information about this command.",
          ],
          Array [
            "For more comprehensive logging, consider adding the -v flag.",
          ],
          Array [
            "For logging with full path to the dependency rather than with \\"➡\\", consider adding the -p flag.",
          ],
          Array [
            "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
          ],
          Array [
            "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
          ],
          Array [
            "
        NESTED @player-ui/@player-tools DEPENDENCIES:",
          ],
          Array [
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
          Array [
            "[41m[37mWARNINGS:[39m[49m",
          ],
          Array [
            "- There are multiple nested @player-ui/@player-tools dependency versions.",
          ],
          Array [
            "[42mRECOMMENDATIONS:[49m",
          ],
          Array [
            "- The highest @player-ui/@player-tools version is 4.37.3 at the nested level. Please add resolutions for all nested @player-ui/@player-tools versions to this version or bump the nested versions to it.",
          ],
        ]
      `);
    });

    it('should log for 1 top-level version, multiple nested versions, top-level version is highest', async () => {
      jest
        .spyOn(globApi, 'globSync')
        .mockImplementation((_input: string | string[]) => {
          return [
            ...mocktopLevelDependencies.single,
            ...mocknestedDependencies.many,
          ];
        });
      jest
        .spyOn(fse, 'readFileSync') // 8 mockReturnValues
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
        Array [
          Array [
            "Consider using the --help flag for more information about this command.",
          ],
          Array [
            "For more comprehensive logging, consider adding the -v flag.",
          ],
          Array [
            "For logging with full path to the dependency rather than with \\"➡\\", consider adding the -p flag.",
          ],
          Array [
            "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
          ],
          Array [
            "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
          ],
          Array [
            "
        TOP-LEVEL @player-ui/@player-tools DEPENDENCIES:",
          ],
          Array [
            "Version  How to find dependency       
        -------  -----------------------------
        4.37.3    ➡ @player-ui/binding-grammar
        ",
          ],
          Array [
            "
        NESTED @player-ui/@player-tools DEPENDENCIES:",
          ],
          Array [
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
          Array [
            "[41m[37mWARNINGS:[39m[49m",
          ],
          Array [
            "- There are multiple nested @player-ui/@player-tools dependency versions.",
          ],
          Array [
            "[42mRECOMMENDATIONS:[49m",
          ],
          Array [
            "- The highest @player-ui/@player-tools version is 4.37.3 at the top level. Please add resolutions for all nested @player-ui/@player-tools versions to this version or bump the nested versions to it.",
          ],
        ]
      `);
    });

    it('should log for 1 top-level version, multiple nested versions, nested-level version is highest', async () => {
      jest
        .spyOn(globApi, 'globSync')
        .mockImplementation((_input: string | string[]) => {
          return [
            ...mocktopLevelDependencies.single,
            ...mocknestedDependencies.many,
          ];
        });
      jest
        .spyOn(fse, 'readFileSync') // 8 mockReturnValues
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
        Array [
          Array [
            "Consider using the --help flag for more information about this command.",
          ],
          Array [
            "For more comprehensive logging, consider adding the -v flag.",
          ],
          Array [
            "For logging with full path to the dependency rather than with \\"➡\\", consider adding the -p flag.",
          ],
          Array [
            "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
          ],
          Array [
            "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
          ],
          Array [
            "
        TOP-LEVEL @player-ui/@player-tools DEPENDENCIES:",
          ],
          Array [
            "Version  How to find dependency       
        -------  -----------------------------
        3.11.0    ➡ @player-ui/binding-grammar
        ",
          ],
          Array [
            "
        NESTED @player-ui/@player-tools DEPENDENCIES:",
          ],
          Array [
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
          Array [
            "[41m[37mWARNINGS:[39m[49m",
          ],
          Array [
            "- There are multiple nested @player-ui/@player-tools dependency versions.",
          ],
          Array [
            "[42mRECOMMENDATIONS:[49m",
          ],
          Array [
            "- The highest @player-ui/@player-tools version is 4.37.3 at the nested level. Please bump the top-level version, 3.11.0, to 4.37.3.",
          ],
          Array [
            "- Also, please add resolutions or bump the versions for nested @player-ui/@player-tools dependencies whose version is not 4.37.3.",
          ],
        ]
      `);
    });

    it('should log for multiple top-level versions, 0 nested version', async () => {
      jest
        .spyOn(globApi, 'globSync')
        .mockImplementation((_input: string | string[]) => {
          return [
            ...mocktopLevelDependencies.many,
            ...mocknestedDependencies.zero,
          ];
        });
      jest
        .spyOn(fse, 'readFileSync') // 7 mockReturnValues
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[2]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[3]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[4]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]));

      await runCommand([]);
      expect(logSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "Consider using the --help flag for more information about this command.",
          ],
          Array [
            "For more comprehensive logging, consider adding the -v flag.",
          ],
          Array [
            "For logging with full path to the dependency rather than with \\"➡\\", consider adding the -p flag.",
          ],
          Array [
            "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
          ],
          Array [
            "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
          ],
          Array [
            "
        TOP-LEVEL @player-ui/@player-tools DEPENDENCIES:",
          ],
          Array [
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
          Array [
            "[41m[37mWARNINGS:[39m[49m",
          ],
          Array [
            "- There are multiple top-level @player-ui/@player-tools dependency versions.",
          ],
          Array [
            "[42mRECOMMENDATIONS:[49m",
          ],
          Array [
            "- Resolve all top-level @player-ui/@player-tools dependencies to the same version. Consider updating them to the latest player version you have, 4.37.3. When all top-level @player-ui/@player-tools dependencies are resolved, run the current CLI again to obtain recommendations about nested @player-ui/@player-tools dependencies.",
          ],
        ]
      `);
    });

    it('should log for multiple top-level versions, 1 nested version, top-level version is highest', async () => {
      jest
        .spyOn(globApi, 'globSync')
        .mockImplementation((_input: string | string[]) => {
          return [
            ...mocktopLevelDependencies.many,
            ...mocknestedDependencies.single,
          ];
        });
      jest
        .spyOn(fse, 'readFileSync') // 8 mockReturnValues
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
        Array [
          Array [
            "Consider using the --help flag for more information about this command.",
          ],
          Array [
            "For more comprehensive logging, consider adding the -v flag.",
          ],
          Array [
            "For logging with full path to the dependency rather than with \\"➡\\", consider adding the -p flag.",
          ],
          Array [
            "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
          ],
          Array [
            "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
          ],
          Array [
            "
        TOP-LEVEL @player-ui/@player-tools DEPENDENCIES:",
          ],
          Array [
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
          Array [
            "
        NESTED @player-ui/@player-tools DEPENDENCIES:",
          ],
          Array [
            "Version  How to find dependency                      
        -------  --------------------------------------------
        3.9.6     ➡ @player-ui/core/ ➡ @player-ui/expressions
        ",
          ],
          Array [
            "[41m[37mWARNINGS:[39m[49m",
          ],
          Array [
            "- There are multiple top-level @player-ui/@player-tools dependency versions.",
          ],
          Array [
            "[42mRECOMMENDATIONS:[49m",
          ],
          Array [
            "- Resolve all top-level @player-ui/@player-tools dependencies to the same version. Consider updating them to the latest player version you have, 4.37.3. When all top-level @player-ui/@player-tools dependencies are resolved, run the current CLI again to obtain recommendations about nested @player-ui/@player-tools dependencies.",
          ],
        ]
      `);
    });

    it('should log for multiple top-level versions, 1 nested version, nested-level version is highest', async () => {
      jest
        .spyOn(globApi, 'globSync')
        .mockImplementation((_input: string | string[]) => {
          return [
            ...mocktopLevelDependencies.many,
            ...mocknestedDependencies.single,
          ];
        });
      jest
        .spyOn(fse, 'readFileSync') // 8 mockReturnValues
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
        Array [
          Array [
            "Consider using the --help flag for more information about this command.",
          ],
          Array [
            "For more comprehensive logging, consider adding the -v flag.",
          ],
          Array [
            "For logging with full path to the dependency rather than with \\"➡\\", consider adding the -p flag.",
          ],
          Array [
            "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
          ],
          Array [
            "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
          ],
          Array [
            "
        TOP-LEVEL @player-ui/@player-tools DEPENDENCIES:",
          ],
          Array [
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
          Array [
            "
        NESTED @player-ui/@player-tools DEPENDENCIES:",
          ],
          Array [
            "Version  How to find dependency                      
        -------  --------------------------------------------
        4.37.3    ➡ @player-ui/core/ ➡ @player-ui/expressions
        ",
          ],
          Array [
            "[41m[37mWARNINGS:[39m[49m",
          ],
          Array [
            "- There are multiple top-level @player-ui/@player-tools dependency versions.",
          ],
          Array [
            "[42mRECOMMENDATIONS:[49m",
          ],
          Array [
            "- Resolve all top-level @player-ui/@player-tools dependencies to the same version. Consider updating them to the latest player version you have, 4.20.5. When all top-level @player-ui/@player-tools dependencies are resolved, run the current CLI again to obtain recommendations about nested @player-ui/@player-tools dependencies.",
          ],
        ]
      `);
    });
  });
});
