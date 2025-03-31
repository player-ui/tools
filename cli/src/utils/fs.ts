import path from "path";
import fs from "fs";

/** To handle globby issue on windows https://github.com/sindresorhus/globby/issues/152 */
function forcePathSeparatorToPosix(input: string) {
  return path.sep === path.win32.sep
    ? input.split(path.sep).join(path.posix.sep)
    : input;
}

/** Check if an input is a directory, if it is, then swap it to a globbed path */
export const convertToFileGlob = (input: string[], glob: string): string[] => {
  return input.map((i) => {
    if (fs.statSync(i, { throwIfNoEntry: false })?.isDirectory()) {
      return forcePathSeparatorToPosix(path.join(i, glob));
    }
    return forcePathSeparatorToPosix(i);
  });
};

/** Normalize a path for display */
export const normalizePath = (p: string): string => {
  return path.relative(process.cwd(), p);
};

/**
 * Tries to load a source map file
 */
export const tryAndLoadSourceMap = (f: string): string | undefined => {
  const mapFileName = f + ".map";
  if (fs.existsSync(mapFileName)) {
    return fs.readFileSync(mapFileName, "utf8");
  }
  return undefined;
};
