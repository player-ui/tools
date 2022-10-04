import type { NamedType, NodeType } from '.';

export type TransformFunction = (
  input: NamedType<NodeType>,
  capabilityType: string
) => void;

export interface Capability {
  /** Name of the capability that is provided to Player */
  name: string;
  /** List of XLRs that are provided for the Capability */
  provides: Array<string>;
}

export interface Manifest {
  /** Name of the plugin */
  pluginName: string;
  /** Map of capabilities provided by the plugin to the name of the XLR for the capabilities */
  capabilities?: Map<string, Array<string>>;
}

export interface TSManifest {
  /** Name of the plugin */
  pluginName: string;

  /** Index of capabilities provided by the plugin to the name of the XLR for the capabilities */
  capabilities: {
    [capability: string]: Array<NamedType>;
  };
}
