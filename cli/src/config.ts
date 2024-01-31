import type { PlayerCLIPlugin } from "./plugins";

export interface PlayerConfigFileShape {
  /** A base config to inherit defaults from */
  extends?: string | PlayerConfigFileShape;

  /** A list of plugins to apply */
  plugins?: Array<string | [string, any] | PlayerCLIPlugin>;

  /** A list of presets to apply */
  presets?: Array<PlayerConfigFileShape | string>;
}

export interface PlayerConfigResolvedShape {
  /** Options related to the DSL and compilation */
  dsl?: {
    /** An input directory for compilation */
    src?: string;

    /** An output directory to use */
    outDir?: string;

    /** Flag to omit validating the resulting JSON */
    skipValidation?: boolean;
  };

  /** Options related to JSON and validation */
  json?: {
    /** An input file, directory, glob, or list of any of the above to use as inputs for validation */
    src?: string | string[];
  };

  /** Options related to XLR compilation step */
  xlr?: {
    /** Path to start searching for types to import/export */
    input?: string;

    /** Where to write the resulting files */
    output?: string;

    /** When converting to XLR, what strategy to use */
    mode?: "plugin" | "types";
  };

  /** Flattened list of plugins */
  plugins: Array<PlayerCLIPlugin>;

  /** Catch for any other things that may be in the config for plugged in functionality */
  [key: string]: any;
}
