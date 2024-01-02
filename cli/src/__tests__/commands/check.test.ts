import process from 'process';
import fse from 'fs-extra';
import child_process from 'child_process';
import fg from 'fast-glob';
import stdMocks from 'std-mocks';
import DependencyVersionsCheck from '../../commands/dependency-versions/check';

// Sampled from SBG-Plugins/Basilisk repository.
const topLevelDependencies = {
  many: [
    'node_modules/@player/binding-grammar/package.json',
    'node_modules/@web-player/metrics/package.json',
    'node_modules/@player/types/package.json',
    'node_modules/@player/data/package.json',
    'node_modules/@player/logger/package.json',
    'node_modules/@web-player/asset-provider/package.json',
    'node_modules/@web-player/shared-constants/package.json',
  ],
  single: ['node_modules/@player/binding-grammar/package.json'],
  zero: [],
};

// Sampled from SBG-Plugins/Basilisk repository.
const nestedDependencies = {
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
    'node_modules/@player/core/node_modules/@player/expressions/package.json',
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

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  const cwdSpy = jest.spyOn(process, 'cwd');
  cwdSpy.mockReturnValue('/Users/username/Desktop/Projects/player');
  const child_processSpy = jest.spyOn(child_process, 'execSync');
  child_processSpy.mockReturnValue(
    '/Users/username/Desktop/Projects/player' as any
  );
});

describe('checks @player/@web-player/@player-language versions and outputs warnings/recommendations', () => {
  it('should issue error message due to not being run in the root directory', async () => {
    const cwdSpy = jest.spyOn(process, 'cwd');
    cwdSpy.mockReturnValue(
      '/Users/username/player/utilities/cli/src/__tests__'
    );
    // although child_process.execSync returns a Buffer type, for simplicity we will simply mock
    // its return value to be a string, which requires casting as any
    const child_processSpy = jest.spyOn(child_process, 'execSync');
    child_processSpy.mockReturnValue('/Users/username/player/' as any);
    const results = await runCommand([]);
    expect(results.stdout).toContain(
      'cannot run the CLI in /Users/username/player/utilities/cli/src/__tests__'
    );
  }, 60000);

  describe('valid @player/@web-player/@player-language versioning', () => {
    it('should log for 1 nested version and 1 top-level version that match', async () => {
      jest
        .spyOn(fg, 'sync')
        .mockReturnValueOnce([
          ...topLevelDependencies.single,
          ...nestedDependencies.single,
        ]);
      jest
        .spyOn(fse, 'readFileSync')
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]));
      const results = await runCommand([]);
      expect(results.stdout).toContain(
        'Unique top-level and nested @player/@web-player/@player-language versions match.'
      );
      expect(results.stdout).not.toContain(
        'No top-level @player/@web-player/@player-language dependencies exist.'
      );
      expect(results.stdout).not.toContain(
        'No nested @player/@web-player/@player-language dependencies exist.'
      );
    });
    it('should log for 1 top-level version, 0 nested version', async () => {
      jest
        .spyOn(fg, 'sync')
        .mockReturnValueOnce([
          ...topLevelDependencies.single,
          ...nestedDependencies.zero,
        ]);
      jest
        .spyOn(fse, 'readFileSync')
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]));
      const results = await runCommand([]);
      expect(results.stdout).not.toContain(
        'No top-level @player/@web-player/@player-language dependencies exist.'
      );
      expect(results.stdout).toContain(
        'No nested @player/@web-player/@player-language dependencies exist.'
      );
    });
    it('should log for 0 top-level version, 1 nested version', async () => {
      jest
        .spyOn(fg, 'sync')
        .mockReturnValueOnce([
          ...topLevelDependencies.zero,
          ...nestedDependencies.single,
        ]);
      jest
        .spyOn(fse, 'readFileSync')
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]));
      const results = await runCommand([]);
      expect(results.stdout).toContain(
        'No top-level @player/@web-player/@player-language dependencies exist.'
      );
      expect(results.stdout).not.toContain(
        'No nested @player/@web-player/@player-language dependencies exist.'
      );
    });
    it('should log for 0 top-level version, 0 nested version', async () => {
      jest.spyOn(fg, 'sync').mockReturnValueOnce([]);
      const results = await runCommand([]);
      expect(results.stdout).toContain(
        'No @player/@web-player/@player-language dependencies exist.'
      );
    });
  });

  describe('invalid @player/@web-player/@player-language versioning', () => {
    it('should log for 1 top-level version, 1 nested version, with mismatch', async () => {
      jest
        .spyOn(fg, 'sync')
        .mockReturnValueOnce([
          ...topLevelDependencies.single,
          ...nestedDependencies.single,
        ]);
      jest
        .spyOn(fse, 'readFileSync')
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]));
      const results = await runCommand([]);
      expect(results.stdout).toContain(
        '- Mismatch between the top-level and the nested @player/@web-player/@player-language dependency.'
      );
    });
    it('should log for multiple top-level versions, multiple nested versions', async () => {
      jest
        .spyOn(fg, 'sync')
        .mockReturnValueOnce([
          ...topLevelDependencies.many,
          ...nestedDependencies.many,
        ]);
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
      const results = await runCommand([]);
      expect(results.stdout).toContain(
        '- There are multiple top-level @player/@web-player/@player-language dependency versions.'
      );
      expect(results.stdout).toContain(
        '- There are multiple nested @player/@web-player/@player-language dependency versions.'
      );
      expect(results.stdout).toContain(
        '- Resolve all top-level @player/@web-player/@player-language dependencies to the same version.'
      );
    });
    it('should log for 0 top-level version, multiple nested versions', async () => {
      jest
        .spyOn(fg, 'sync')
        .mockReturnValueOnce([
          ...topLevelDependencies.zero,
          ...nestedDependencies.many,
        ]);
      jest
        .spyOn(fse, 'readFileSync') // 7 mockReturnValues
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[2]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[3]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[4]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]));
      const results = await runCommand([]);
      expect(results.stdout).toContain(
        '- There are multiple nested @player/@web-player/@player-language dependency versions.'
      );
      expect(results.stdout).toContain(
        `- The highest @player/@web-player/@player-language version is ${arbitraryPlayerVersions[4].version} at the nested level.`
      );
    });
    it('should log for 1 top-level version, multiple nested versions, top-level version is highest', async () => {
      jest
        .spyOn(fg, 'sync')
        .mockReturnValueOnce([
          ...topLevelDependencies.single,
          ...nestedDependencies.many,
        ]);
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
      const results = await runCommand([]);
      expect(results.stdout).toContain(
        '- There are multiple nested @player/@web-player/@player-language dependency versions.'
      );
      expect(results.stdout).toContain(
        `- The highest @player/@web-player/@player-language version is ${arbitraryPlayerVersions[4].version} at the top level.`
      );
    });
    it('should log for 1 top-level version, multiple nested versions, nested-level version is highest', async () => {
      jest
        .spyOn(fg, 'sync')
        .mockReturnValueOnce([
          ...topLevelDependencies.single,
          ...nestedDependencies.many,
        ]);
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
      const results = await runCommand([]);
      expect(results.stdout).toContain(
        '- There are multiple nested @player/@web-player/@player-language dependency versions.'
      );
      expect(results.stdout).toContain(
        `- The highest @player/@web-player/@player-language version is ${arbitraryPlayerVersions[4].version} at the nested level.`
      );
      expect(results.stdout).toContain(
        '- Also, please add resolutions or bump the versions for nested @player/@web-player/@player-language dependencies'
      );
    });
    it('should log for multiple top-level versions, 0 nested version', async () => {
      jest
        .spyOn(fg, 'sync')
        .mockReturnValueOnce([
          ...topLevelDependencies.many,
          ...nestedDependencies.zero,
        ]);
      jest
        .spyOn(fse, 'readFileSync') // 7 mockReturnValues
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[2]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[3]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[4]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[0]))
        .mockReturnValueOnce(JSON.stringify(arbitraryPlayerVersions[1]));
      const results = await runCommand([]);
      expect(results.stdout).toContain(
        '- There are multiple top-level @player/@web-player/@player-language dependency versions.'
      );
      expect(results.stdout).toContain(
        `- Resolve all top-level @player/@web-player/@player-language dependencies to the same version.`
      );
    });
    it('should log for multiple top-level versions, 1 nested version, top-level version is highest', async () => {
      jest
        .spyOn(fg, 'sync')
        .mockReturnValueOnce([
          ...topLevelDependencies.many,
          ...nestedDependencies.single,
        ]);
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
      const results = await runCommand([]);
      expect(results.stdout).toContain(
        '- There are multiple top-level @player/@web-player/@player-language dependency versions.'
      );
      expect(results.stdout).toContain(
        `- Resolve all top-level @player/@web-player/@player-language dependencies to the same version.`
      );
    });
    it('should log for multiple top-level versions, 1 nested version, nested-level version is highest', async () => {
      jest
        .spyOn(fg, 'sync')
        .mockReturnValueOnce([
          ...topLevelDependencies.many,
          ...nestedDependencies.single,
        ]);
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
      const results = await runCommand([]);
      expect(results.stdout).toContain(
        '- There are multiple top-level @player/@web-player/@player-language dependency versions.'
      );
      expect(results.stdout).toContain(
        `- Resolve all top-level @player/@web-player/@player-language dependencies to the same version.`
      );
    });
  });
});
