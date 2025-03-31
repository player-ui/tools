import glob from "globby";
import chalk from "chalk";
import fse from "fs-extra"; // fse rather than fs makes unit testing easier with mocking
import Table from "easy-table";
import child_process from "child_process";
import { Flags } from "@oclif/core";
import { BaseCommand } from "../../utils/base-command";

interface DependencyMap {
  [dependencyVersion: string]: string[];
}

/** A command to get @player-ui/@player-tools dependency versions and issue warnings/recommendations based on them */
export default class DependencyVersionsCheck extends BaseCommand {
  static summary =
    "Checks for @player-ui/@player-tools dependency version mismatches and issues warnings/solutions accordingly";

  static description = `Consider the following:
  - The interpretation of TOP-LEVEL and NESTED dependencies is as follows:
    a. TOP-LEVEL dependencies only have one 'node_modules' in their path
    b. NESTED dependencies have more than one 'node_modules' in their path
  - @player-ui/@player-tools dependencies are fetched not only from inside the 'node_modules' at the top of the repository in which it is run but also from 'node_modules' in sub-directories.
  For example, if you have some 'node_modules' inside of a 'packages' folder that contains @player-ui/@player-tools dependencies, then these will also be fetched.
  The display of such dependencies also depends on the first bullet point.
  `;

  static flags = {
    ...BaseCommand.flags,
    verbose: Flags.boolean({
      char: "v",
      description: "Give verbose description",
    }),
    path: Flags.boolean({
      char: "p",
      description: "Outputs full path to dependency",
    }),
    ignore: Flags.string({
      char: "i",
      description:
        "Ignore the specified pattern(s) when outputting results. Note multiple patterns can be passed",
      multiple: true,
    }),
  };

  private async getOptions() {
    const { flags } = await this.parse(DependencyVersionsCheck);
    return {
      verbose: flags.verbose,
      path: flags.path,
      ignore: flags.ignore,
    };
  }

  async run(): Promise<{
    /** the status code */
    exitCode: number;
  }> {
    const results = {
      exitCode: 0,
    };

    // Note: please do not easily change these exit codes, they are used for exit code detection in Jenkins pipeline(s)
    const WARNING_EXIT_CODE = 1;
    const NOT_RUN_AT_REPO_ROOT_EXIT_CODE = 2;

    const chalkNegative = chalk.bgRed.white;
    const chalkPositive = chalk.bgGreen;

    const localGithubRepoRoot = child_process
      .execSync("git rev-parse --show-toplevel")
      .toString()
      .trimEnd();
    const currentDirectory = process.cwd();
    if (localGithubRepoRoot !== currentDirectory) {
      console.log(
        `${chalkNegative("ERROR:")} cannot run the CLI in ${currentDirectory}`,
      );
      console.log(
        `Please run the CLI in the root of the repository, ${localGithubRepoRoot}`,
      );
      results.exitCode = NOT_RUN_AT_REPO_ROOT_EXIT_CODE;
      this.exit(results.exitCode);
      return results;
    }

    const { verbose, path, ignore } = await this.getOptions();

    console.log(
      "Consider using the --help flag for more information about this command.",
    );

    if (!verbose) {
      console.log(
        "For more comprehensive logging, consider adding the -v flag.",
      );
    }

    if (!path) {
      console.log(
        "For logging with full path to the dependency rather than with '➡', consider adding the -p flag.",
      );
    }

    if (ignore) {
      console.log(
        "All output based on the versions/dependencies yielded after eliminating the patterns specified by the -i flag.",
      );
    } else {
      console.log(
        "To add string pattern(s) for files to exclude, consider adding them after the -i flag.",
      );
    }

    console.log(
      "Inspecting the @player-ui/@player-tools dependencies in the current repository...",
    );

    let packageJsons = glob.sync(
      "**/node_modules/{@player,@player-language,@web-player}/*/package.json",
    );

    if (ignore) {
      // It is necessary to filter here rather than to pass extra options to globSync.
      // This is because we need want to filter based on partial matches of the file path string
      // whereas any filtering of globSync itself is heavily based on the file path as part of the system
      // and not the file as a simple string.
      packageJsons = packageJsons.filter((packageJson) => {
        return !ignore.some((patternToIgnore) =>
          packageJson.includes(patternToIgnore),
        );
      });
    }

    // Initialize the maps storing the dependency versions mapping to the packages with that version
    const versionToTopLevelDependencyMap: DependencyMap = {};
    const versionToNestedDependencyMap: DependencyMap = {};

    // Populate the dependency maps
    for (const packageJsonFile of packageJsons) {
      const { version } = JSON.parse(fse.readFileSync(packageJsonFile, "utf8"));

      // top-level dependencies only have `node_modules` occurring once in their path
      const isTopLevelDependency =
        (packageJsonFile.match(/node_modules/g) || []).length === 1;
      const mapToUpdate = isTopLevelDependency
        ? versionToTopLevelDependencyMap
        : versionToNestedDependencyMap;
      if (version in mapToUpdate) {
        mapToUpdate[version].push(packageJsonFile);
      } else {
        mapToUpdate[version] = [packageJsonFile];
      }
    }

    const topLevelVersions = Object.keys(versionToTopLevelDependencyMap);
    const nestedVersions = Object.keys(versionToNestedDependencyMap);

    /**
     * copied from https://www.npmjs.com/package/semver-compare?activeTab=code
     * rather than yarn-installed since its short.
     *
     * @returns the result of comparison
     */
    function cmp(a: string, b: string) {
      const pa = a.split(".");
      const pb = b.split(".");
      for (let i = 0; i < 3; i++) {
        const na = Number(pa[i]);
        const nb = Number(pb[i]);
        if (na > nb) return 1;
        if (nb > na) return -1;
        if (!isNaN(na) && isNaN(nb)) return 1;
        if (isNaN(na) && !isNaN(nb)) return -1;
      }

      return 0;
    }

    const sortedTopLevelVersions = topLevelVersions.sort(cmp);
    const sortedNestedVersions = nestedVersions.sort(cmp);

    const topLevelDependenciesTable = new Table();
    const nestedDependenciesTable = new Table();

    const highestTopLevelVersion =
      sortedTopLevelVersions[sortedTopLevelVersions.length - 1];
    const highestNestedVersion =
      sortedNestedVersions[sortedNestedVersions.length - 1];

    const singleVersionsExist =
      topLevelVersions.length === 1 && nestedVersions.length === 1;
    const singleVersionsMatch =
      singleVersionsExist && topLevelVersions[0] === nestedVersions[0];
    const singleVersionsMismatch =
      singleVersionsExist && topLevelVersions[0] !== nestedVersions[0];

    const topLevelVersionsExist = topLevelVersions.length > 0;
    const nestedVersionsExist = nestedVersions.length > 0;

    const multipleTopLevelVersionsDetected = topLevelVersions.length > 1;
    const multipleNestedVersionsDetected = nestedVersions.length > 1;

    /**
     * Formats the path to the dependency
     *
     * @param fullPath
     * @returns the formatted path with ➡ arrows for the CLI user to follow
     */
    function formatDependencyPath(fullPath: string) {
      const pathArrayWithoutNodeModules = fullPath.split("node_modules/");
      let formattedPath = "";
      for (let i = 0; i < pathArrayWithoutNodeModules.length; i++) {
        if (pathArrayWithoutNodeModules[i] !== "") {
          formattedPath += ` ➡ ${pathArrayWithoutNodeModules[i]}`;
        }
      }

      formattedPath = formattedPath.replace("/package.json", ""); // remove /package.json at the end
      return formattedPath;
    }

    /**
     * Prints the formatted dependencyTable
     *
     * @param printsTopLevelTable - whether to print the top-level table or not
     */
    function printTable(
      versionToDependencyMap: DependencyMap,
      sortedVersions: string[],
      table: Table,
    ) {
      sortedVersions.forEach(function (version) {
        const dependencies = versionToDependencyMap[version];
        const msg = path
          ? "Path to dependency's package.json"
          : "How to find dependency";
        const firstDependency = path
          ? dependencies[0]
          : formatDependencyPath(dependencies[0]);
        table.cell("Version", version);
        table.cell(msg, firstDependency);
        table.newRow();
        const maxNumberOfDepsToPrint = verbose
          ? dependencies.length
          : Math.min(3, dependencies.length); // in non-verbose, print out at most 3 dependencies
        const numberOfDepsNotPrintedInNonVerbose =
          dependencies.length - maxNumberOfDepsToPrint;
        for (let i = 1; i < maxNumberOfDepsToPrint; i++) {
          table.cell("Version", "");
          const dependency = path
            ? dependencies[i]
            : formatDependencyPath(dependencies[i]);
          table.cell(msg, dependency);
          table.newRow();
        }

        if (numberOfDepsNotPrintedInNonVerbose > 0) {
          table.cell("Version", "");
          const notPrintedMsg = `... ${numberOfDepsNotPrintedInNonVerbose} other dependencies not printed in non-verbose mode.`;
          table.cell(msg, notPrintedMsg);
          table.newRow();
        }
      });
      console.log(table.toString());
    }

    if (topLevelVersionsExist) {
      console.log("\nTOP-LEVEL @player-ui/@player-tools DEPENDENCIES:");
      printTable(
        versionToTopLevelDependencyMap,
        sortedTopLevelVersions,
        topLevelDependenciesTable,
      );
    }

    if (nestedVersionsExist) {
      console.log("\nNESTED @player-ui/@player-tools DEPENDENCIES:");
      printTable(
        versionToNestedDependencyMap,
        sortedNestedVersions,
        nestedDependenciesTable,
      );
    }

    if (
      (!topLevelVersionsExist && nestedVersions.length === 1) ||
      (!nestedVersionsExist && topLevelVersions.length === 1) ||
      (!nestedVersionsExist && !topLevelVersionsExist) ||
      singleVersionsMatch
    ) {
      if (singleVersionsMatch) {
        console.log(
          "Unique top-level and nested @player-ui/@player-tools versions match. ",
        );
      }

      if (!topLevelVersionsExist && nestedVersions.length === 1) {
        console.log(
          `No top-level @player-ui/@player-tools dependencies exist. Only a single nested @player-ui/@player-tools version exists, ${nestedVersions[0]}`,
        );
      }

      if (!nestedVersionsExist && topLevelVersions.length === 1) {
        console.log(
          `No nested @player-ui/@player-tools dependencies exist. Only a single top-level @player-ui/@player-tools version exists, ${topLevelVersions[0]}`,
        );
      }

      if (!nestedVersionsExist && !topLevelVersionsExist) {
        console.log("No @player-ui/@player-tools dependencies exist.");
      }

      console.log(
        "There are no issues related to @player-ui/@player-tools dependency versioning. You are good to go! ",
      );
      this.exit(results.exitCode);
      return results;
    }

    console.log(chalkNegative("WARNINGS:"));
    if (multipleTopLevelVersionsDetected) {
      console.log(
        "- There are multiple top-level @player-ui/@player-tools dependency versions.",
      );
    }

    if (multipleNestedVersionsDetected) {
      console.log(
        "- There are multiple nested @player-ui/@player-tools dependency versions.",
      );
    }

    if (singleVersionsMismatch) {
      console.log(
        "- Mismatch between the top-level and the nested @player-ui/@player-tools dependency.",
      );
    }

    console.log(chalkPositive("RECOMMENDATIONS:"));
    if (multipleTopLevelVersionsDetected) {
      console.log(
        `- Resolve all top-level @player-ui/@player-tools dependencies to the same version. Consider updating them to the latest player version you have, ${highestTopLevelVersion}. When all top-level @player-ui/@player-tools dependencies are resolved, run the current CLI again to obtain recommendations about nested @player-ui/@player-tools dependencies.`,
      );
    } else if (highestTopLevelVersion && highestNestedVersion) {
      // highestTopLevelVersion && highestNestedVersion defined means: single top-level version, one or more nested versions
      if (cmp(highestTopLevelVersion, highestNestedVersion) >= 1) {
        // when only a single top-level version is detected, it is simply the highest
        console.log(
          `- The highest @player-ui/@player-tools version is ${highestTopLevelVersion} at the top level. Please add resolutions for all nested @player-ui/@player-tools versions to this version or bump the nested versions to it.`,
        );
      } else {
        console.log(
          `- The highest @player-ui/@player-tools version is ${highestNestedVersion} at the nested level. Please bump the top-level version, ${highestTopLevelVersion}, to ${highestNestedVersion}.`,
        );
        if (multipleNestedVersionsDetected) {
          console.log(
            `- Also, please add resolutions or bump the versions for nested @player-ui/@player-tools dependencies whose version is not ${highestNestedVersion}.`,
          );
        }
      }
    } else if (highestNestedVersion && multipleNestedVersionsDetected) {
      // no top-level version defined, multiple nested versions
      console.log(
        `- The highest @player-ui/@player-tools version is ${highestNestedVersion} at the nested level. Please add resolutions for all nested @player-ui/@player-tools versions to this version or bump the nested versions to it.`,
      );
    }

    // Although no errors have occurred when the code reaches here, a non-zero exit code of WARNING_EXIT_CODE = 1 is still used to indicate
    // the idea of "warnings" being issued due to dependency version discrepancies
    results.exitCode = WARNING_EXIT_CODE;
    this.exit(results.exitCode);
    return results;
  }
}
