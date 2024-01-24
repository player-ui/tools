import process from 'process';
import fse from 'fs-extra';
import * as globApi from 'glob';
import child_process from 'child_process';
import stdMocks from 'std-mocks';
import DependencyVersionsCheck, {
  doSomething,
} from '../../commands/dependency-versions/check';

const mocktopLevelDependencies = {
  many: [
    'node_modules/@player/binding-grammar/package.json',
    'node_modules/@web-player/metrics/package.json',
    'node_modules/@player/types/package.json',
    'node_modules/@player/data/package.json',
    'node_modules/@player/logger/package.json',
    'node_modules/@web-player/asset-provider/package.json',
    'node_modules/@web-player/shared-constants/package.json',
  ],
  single: ['node_modules/@player-ui/binding-grammar/package.json'],
  zero: [],
};

const mocknestedDependencies = {
  many: [
    'node_modules/@player/core/node_modules/@player/expressions/package.json',
    'node_modules/@cg-player/image/node_modules/@web-player/link/package.json',
    'node_modules/@cg-player/image-capture/node_modules/@web-player/beacon/package.json',
    'node_modules/@cg-player/point-of-need/node_modules/@web-player/link/package.json',
    'node_modules/@web-player/base-assets/node_modules/@player/data/package.json',
    'node_modules/@web-player/player/node_modules/@player/metrics-plugin/package.json',
    'node_modules/@web-player/text/node_modules/@web-player/utils/package.json',
  ],
  single: [
    'node_modules/@player-ui/core/node_modules/@player/expressions/package.json',
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

// beforeEach(() => {
//   jest.clearAllMocks();
//   jest.restoreAllMocks();
//   const cwdSpy = jest.spyOn(process, 'cwd');
//   cwdSpy.mockReturnValue('/Users/username/Desktop/Projects/player');
//   const child_processSpy = jest.spyOn(child_process, 'execSync');
//   child_processSpy.mockReturnValue(
//     '/Users/username/Desktop/Projects/player' as any
//   );
// });

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

test('should issue error message due to not being run in the root directory', async () => {
  cwdSpy.mockReturnValue('/Users/username/player/utilities/cli/src/__tests__');
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

test('should log for 1 nested version and 1 top-level version that match', async () => {
  jest
    .spyOn(globApi, 'globSync')
    .mockImplementation((_input: string | string[]) => {
      return [
        'node_modules/@player-ui/binding-grammar/package.json',
        'node_modules/@player-ui/core/node_modules/@player/expressions/package.json',
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
        "Inspecting the @player/@web-player/@player-language dependencies in the current repository...",
      ],
      Array [
        "
    TOP-LEVEL @player/@web-player/@player-language DEPENDENCIES:",
      ],
      Array [
        "Version  How to find dependency       
    -------  -----------------------------
    3.11.0    ➡ @player-ui/binding-grammar
    ",
      ],
      Array [
        "
    NESTED @player/@web-player/@player-language DEPENDENCIES:",
      ],
      Array [
        "Version  How to find dependency                   
    -------  -----------------------------------------
    3.11.0    ➡ @player-ui/core/ ➡ @player/expressions
    ",
      ],
      Array [
        "Unique top-level and nested @player/@web-player/@player-language versions match. ",
      ],
      Array [
        "There are no issues related to @player/@web-player/@player-language dependency versioning. You are good to go! ",
      ],
    ]
  `);
});

test('should log for 1 top-level version, 0 nested version', async () => {
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
        "Inspecting the @player/@web-player/@player-language dependencies in the current repository...",
      ],
      Array [
        "
    TOP-LEVEL @player/@web-player/@player-language DEPENDENCIES:",
      ],
      Array [
        "Version  How to find dependency       
    -------  -----------------------------
    3.11.0    ➡ @player-ui/binding-grammar
    ",
      ],
      Array [
        "No nested @player/@web-player/@player-language dependencies exist. Only a single top-level @player/@web-player/@player-language version exists, 3.11.0",
      ],
      Array [
        "There are no issues related to @player/@web-player/@player-language dependency versioning. You are good to go! ",
      ],
    ]
  `);
});

test('should log for 0 top-level version, 1 nested version', async () => {
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
        "Inspecting the @player/@web-player/@player-language dependencies in the current repository...",
      ],
      Array [
        "
    NESTED @player/@web-player/@player-language DEPENDENCIES:",
      ],
      Array [
        "Version  How to find dependency                   
    -------  -----------------------------------------
    3.11.0    ➡ @player-ui/core/ ➡ @player/expressions
    ",
      ],
      Array [
        "No top-level @player/@web-player/@player-language dependencies exist. Only a single nested @player/@web-player/@player-language version exists, 3.11.0",
      ],
      Array [
        "There are no issues related to @player/@web-player/@player-language dependency versioning. You are good to go! ",
      ],
    ]
  `);
});

test('should log for 0 top-level version, 0 nested version', async () => {
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
        "Inspecting the @player/@web-player/@player-language dependencies in the current repository...",
      ],
      Array [
        "No @player/@web-player/@player-language dependencies exist.",
      ],
      Array [
        "There are no issues related to @player/@web-player/@player-language dependency versioning. You are good to go! ",
      ],
    ]
  `);
});

test('should log for 1 top-level version, 1 nested version, with mismatch', async () => {
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
        "Inspecting the @player/@web-player/@player-language dependencies in the current repository...",
      ],
      Array [
        "
    TOP-LEVEL @player/@web-player/@player-language DEPENDENCIES:",
      ],
      Array [
        "Version  How to find dependency       
    -------  -----------------------------
    3.11.0    ➡ @player-ui/binding-grammar
    ",
      ],
      Array [
        "
    NESTED @player/@web-player/@player-language DEPENDENCIES:",
      ],
      Array [
        "Version  How to find dependency                   
    -------  -----------------------------------------
    3.30.1    ➡ @player-ui/core/ ➡ @player/expressions
    ",
      ],
      Array [
        "[41m[37mWARNINGS:[39m[49m",
      ],
      Array [
        "- Mismatch between the top-level and the nested @player/@web-player/@player-language dependency.",
      ],
      Array [
        "[42mRECOMMENDATIONS:[49m",
      ],
      Array [
        "- The highest @player/@web-player/@player-language version is 3.30.1 at the nested level. Please bump the top-level version, 3.11.0, to 3.30.1.",
      ],
    ]
  `);
});

test('should log for multiple top-level versions, multiple nested versions', async () => {
  jest
    .spyOn(globApi, 'globSync')
    .mockImplementation((_input: string | string[]) => {
      return [...mocktopLevelDependencies.many, ...mocknestedDependencies.many];
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
        "Inspecting the @player/@web-player/@player-language dependencies in the current repository...",
      ],
      Array [
        "
    TOP-LEVEL @player/@web-player/@player-language DEPENDENCIES:",
      ],
      Array [
        "Version  How to find dependency         
    -------  -------------------------------
    3.9.6     ➡ @player/types               
    3.11.0    ➡ @player/binding-grammar     
              ➡ @web-player/asset-provider  
    3.30.1    ➡ @web-player/metrics         
              ➡ @web-player/shared-constants
    4.20.5    ➡ @player/data                
    4.37.3    ➡ @player/logger              
    ",
      ],
      Array [
        "
    NESTED @player/@web-player/@player-language DEPENDENCIES:",
      ],
      Array [
        "Version  How to find dependency                           
    -------  -------------------------------------------------
    3.9.6     ➡ @player/core/ ➡ @player/expressions           
              ➡ @web-player/player/ ➡ @player/metrics-plugin  
    3.11.0    ➡ @cg-player/point-of-need/ ➡ @web-player/link  
    3.30.1    ➡ @web-player/base-assets/ ➡ @player/data       
    4.20.5    ➡ @cg-player/image/ ➡ @web-player/link          
              ➡ @web-player/text/ ➡ @web-player/utils         
    4.37.3    ➡ @cg-player/image-capture/ ➡ @web-player/beacon
    ",
      ],
      Array [
        "[41m[37mWARNINGS:[39m[49m",
      ],
      Array [
        "- There are multiple top-level @player/@web-player/@player-language dependency versions.",
      ],
      Array [
        "- There are multiple nested @player/@web-player/@player-language dependency versions.",
      ],
      Array [
        "[42mRECOMMENDATIONS:[49m",
      ],
      Array [
        "- Resolve all top-level @player/@web-player/@player-language dependencies to the same version. Consider updating them to the latest player version you have, 4.37.3. When all top-level @player/@web-player/@player-language dependencies are resolved, run the current CLI again to obtain recommendations about nested @player/@web-player/@player-language dependencies.",
      ],
    ]
  `);
});

test('should log for 0 top-level version, multiple nested versions', async () => {
  jest
    .spyOn(globApi, 'globSync')
    .mockImplementation((_input: string | string[]) => {
      return [...mocktopLevelDependencies.zero, ...mocknestedDependencies.many];
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
        "Inspecting the @player/@web-player/@player-language dependencies in the current repository...",
      ],
      Array [
        "
    NESTED @player/@web-player/@player-language DEPENDENCIES:",
      ],
      Array [
        "Version  How to find dependency                           
    -------  -------------------------------------------------
    3.9.6     ➡ @cg-player/image-capture/ ➡ @web-player/beacon
    3.11.0    ➡ @player/core/ ➡ @player/expressions           
              ➡ @web-player/player/ ➡ @player/metrics-plugin  
    3.30.1    ➡ @cg-player/image/ ➡ @web-player/link          
              ➡ @web-player/text/ ➡ @web-player/utils         
    4.20.5    ➡ @cg-player/point-of-need/ ➡ @web-player/link  
    4.37.3    ➡ @web-player/base-assets/ ➡ @player/data       
    ",
      ],
      Array [
        "[41m[37mWARNINGS:[39m[49m",
      ],
      Array [
        "- There are multiple nested @player/@web-player/@player-language dependency versions.",
      ],
      Array [
        "[42mRECOMMENDATIONS:[49m",
      ],
      Array [
        "- The highest @player/@web-player/@player-language version is 4.37.3 at the nested level. Please add resolutions for all nested @player/@web-player/@player-language versions to this version or bump the nested versions to it.",
      ],
    ]
  `);
});

test('should log for 1 top-level version, multiple nested versions, top-level version is highest', async () => {
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
        "Inspecting the @player/@web-player/@player-language dependencies in the current repository...",
      ],
      Array [
        "
    TOP-LEVEL @player/@web-player/@player-language DEPENDENCIES:",
      ],
      Array [
        "Version  How to find dependency       
    -------  -----------------------------
    4.37.3    ➡ @player-ui/binding-grammar
    ",
      ],
      Array [
        "
    NESTED @player/@web-player/@player-language DEPENDENCIES:",
      ],
      Array [
        "Version  How to find dependency                           
    -------  -------------------------------------------------
    3.9.6     ➡ @cg-player/image-capture/ ➡ @web-player/beacon
              ➡ @web-player/text/ ➡ @web-player/utils         
    3.11.0    ➡ @player/core/ ➡ @player/expressions           
              ➡ @web-player/base-assets/ ➡ @player/data       
    3.30.1    ➡ @cg-player/image/ ➡ @web-player/link          
              ➡ @web-player/player/ ➡ @player/metrics-plugin  
    4.20.5    ➡ @cg-player/point-of-need/ ➡ @web-player/link  
    ",
      ],
      Array [
        "[41m[37mWARNINGS:[39m[49m",
      ],
      Array [
        "- There are multiple nested @player/@web-player/@player-language dependency versions.",
      ],
      Array [
        "[42mRECOMMENDATIONS:[49m",
      ],
      Array [
        "- The highest @player/@web-player/@player-language version is 4.37.3 at the top level. Please add resolutions for all nested @player/@web-player/@player-language versions to this version or bump the nested versions to it.",
      ],
    ]
  `);
});

test('should log for 1 top-level version, multiple nested versions, nested-level version is highest', async () => {
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
        "Inspecting the @player/@web-player/@player-language dependencies in the current repository...",
      ],
      Array [
        "
    TOP-LEVEL @player/@web-player/@player-language DEPENDENCIES:",
      ],
      Array [
        "Version  How to find dependency       
    -------  -----------------------------
    3.11.0    ➡ @player-ui/binding-grammar
    ",
      ],
      Array [
        "
    NESTED @player/@web-player/@player-language DEPENDENCIES:",
      ],
      Array [
        "Version  How to find dependency                           
    -------  -------------------------------------------------
    3.9.6     ➡ @cg-player/image/ ➡ @web-player/link          
              ➡ @web-player/text/ ➡ @web-player/utils         
    3.11.0    ➡ @web-player/base-assets/ ➡ @player/data       
    3.30.1    ➡ @player/core/ ➡ @player/expressions           
              ➡ @web-player/player/ ➡ @player/metrics-plugin  
    4.20.5    ➡ @cg-player/image-capture/ ➡ @web-player/beacon
    4.37.3    ➡ @cg-player/point-of-need/ ➡ @web-player/link  
    ",
      ],
      Array [
        "[41m[37mWARNINGS:[39m[49m",
      ],
      Array [
        "- There are multiple nested @player/@web-player/@player-language dependency versions.",
      ],
      Array [
        "[42mRECOMMENDATIONS:[49m",
      ],
      Array [
        "- The highest @player/@web-player/@player-language version is 4.37.3 at the nested level. Please bump the top-level version, 3.11.0, to 4.37.3.",
      ],
      Array [
        "- Also, please add resolutions or bump the versions for nested @player/@web-player/@player-language dependencies whose version is not 4.37.3.",
      ],
    ]
  `);
});

test('should log for multiple top-level versions, 0 nested version', async () => {
  jest
    .spyOn(globApi, 'globSync')
    .mockImplementation((_input: string | string[]) => {
      return [...mocktopLevelDependencies.many, ...mocknestedDependencies.zero];
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
        "Inspecting the @player/@web-player/@player-language dependencies in the current repository...",
      ],
      Array [
        "
    TOP-LEVEL @player/@web-player/@player-language DEPENDENCIES:",
      ],
      Array [
        "Version  How to find dependency         
    -------  -------------------------------
    3.9.6     ➡ @player/types               
    3.11.0    ➡ @player/binding-grammar     
              ➡ @web-player/asset-provider  
    3.30.1    ➡ @web-player/metrics         
              ➡ @web-player/shared-constants
    4.20.5    ➡ @player/data                
    4.37.3    ➡ @player/logger              
    ",
      ],
      Array [
        "[41m[37mWARNINGS:[39m[49m",
      ],
      Array [
        "- There are multiple top-level @player/@web-player/@player-language dependency versions.",
      ],
      Array [
        "[42mRECOMMENDATIONS:[49m",
      ],
      Array [
        "- Resolve all top-level @player/@web-player/@player-language dependencies to the same version. Consider updating them to the latest player version you have, 4.37.3. When all top-level @player/@web-player/@player-language dependencies are resolved, run the current CLI again to obtain recommendations about nested @player/@web-player/@player-language dependencies.",
      ],
    ]
  `);
});

test('should log for multiple top-level versions, 1 nested version, top-level version is highest', async () => {
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
        "Inspecting the @player/@web-player/@player-language dependencies in the current repository...",
      ],
      Array [
        "
    TOP-LEVEL @player/@web-player/@player-language DEPENDENCIES:",
      ],
      Array [
        "Version  How to find dependency         
    -------  -------------------------------
    3.9.6     ➡ @player/types               
    3.11.0    ➡ @player/binding-grammar     
              ➡ @web-player/asset-provider  
    3.30.1    ➡ @web-player/metrics         
              ➡ @web-player/shared-constants
    4.20.5    ➡ @player/data                
    4.37.3    ➡ @player/logger              
    ",
      ],
      Array [
        "
    NESTED @player/@web-player/@player-language DEPENDENCIES:",
      ],
      Array [
        "Version  How to find dependency                   
    -------  -----------------------------------------
    3.9.6     ➡ @player-ui/core/ ➡ @player/expressions
    ",
      ],
      Array [
        "[41m[37mWARNINGS:[39m[49m",
      ],
      Array [
        "- There are multiple top-level @player/@web-player/@player-language dependency versions.",
      ],
      Array [
        "[42mRECOMMENDATIONS:[49m",
      ],
      Array [
        "- Resolve all top-level @player/@web-player/@player-language dependencies to the same version. Consider updating them to the latest player version you have, 4.37.3. When all top-level @player/@web-player/@player-language dependencies are resolved, run the current CLI again to obtain recommendations about nested @player/@web-player/@player-language dependencies.",
      ],
    ]
  `);
});

test('should log for multiple top-level versions, 1 nested version, nested-level version is highest', async () => {
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
        "Inspecting the @player/@web-player/@player-language dependencies in the current repository...",
      ],
      Array [
        "
    TOP-LEVEL @player/@web-player/@player-language DEPENDENCIES:",
      ],
      Array [
        "Version  How to find dependency         
    -------  -------------------------------
    3.9.6     ➡ @player/types               
              ➡ @web-player/shared-constants
    3.11.0    ➡ @player/binding-grammar     
              ➡ @player/logger              
    3.30.1    ➡ @web-player/metrics         
              ➡ @web-player/asset-provider  
    4.20.5    ➡ @player/data                
    ",
      ],
      Array [
        "
    NESTED @player/@web-player/@player-language DEPENDENCIES:",
      ],
      Array [
        "Version  How to find dependency                   
    -------  -----------------------------------------
    4.37.3    ➡ @player-ui/core/ ➡ @player/expressions
    ",
      ],
      Array [
        "[41m[37mWARNINGS:[39m[49m",
      ],
      Array [
        "- There are multiple top-level @player/@web-player/@player-language dependency versions.",
      ],
      Array [
        "[42mRECOMMENDATIONS:[49m",
      ],
      Array [
        "- Resolve all top-level @player/@web-player/@player-language dependencies to the same version. Consider updating them to the latest player version you have, 4.20.5. When all top-level @player/@web-player/@player-language dependencies are resolved, run the current CLI again to obtain recommendations about nested @player/@web-player/@player-language dependencies.",
      ],
    ]
  `);
});

