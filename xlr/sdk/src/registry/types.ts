import type { NamedType } from '@player-tools/xlr';

export interface Filters {
  /** filter based on plugin name */
  pluginFilter?: string | RegExp;

  /** filter based on capability name */
  capabilityFilter?: string | RegExp;

  /** filter based on type name */
  typeFilter?: string | RegExp;
}

export interface TypeMetadata {
  /** The Plugin the Type comes from */
  plugin: string;

  /** The Capability of the Type */
  capability: string;
}

export interface XLRRegistry {
  get(id: string): NamedType | undefined;
  add(type: NamedType, from: string, capability: string): void;
  has(id: string): boolean;
  list(filterArgs?: Filters): Array<NamedType>;
  info(id: string): TypeMetadata | undefined;
}
