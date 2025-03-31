import type { NamedType, NodeType } from "@player-tools/xlr";
import type { XLRRegistry, Filters, TypeMetadata } from "./types";

/**
 * Basic example of a XLRs Registry
 */
export class BasicXLRRegistry implements XLRRegistry {
  private typeMap: Map<string, NamedType<NodeType>>;
  private pluginMap: Map<string, Map<string, Array<string>>>;
  private infoMap: Map<string, TypeMetadata>;

  constructor() {
    this.typeMap = new Map();
    this.pluginMap = new Map();
    this.infoMap = new Map();
  }

  /** Returns a copy of the XLR to guard against unexpected type modification */
  get(id: string): NamedType<NodeType> | undefined {
    const value = this.typeMap.get(id);
    return value ? JSON.parse(JSON.stringify(value)) : undefined;
  }

  add(type: NamedType<NodeType>, plugin: string, capability: string): void {
    this.typeMap.set(type.name, type);
    this.infoMap.set(type.name, { plugin, capability });

    if (!this.pluginMap.has(plugin)) {
      this.pluginMap.set(plugin, new Map());
    }

    const pluginsCapabilities = this.pluginMap.get(plugin) as Map<
      string,
      Array<string>
    >;

    if (!pluginsCapabilities.has(capability)) {
      pluginsCapabilities.set(capability, []);
    }

    const providedCapabilities = pluginsCapabilities.get(
      capability,
    ) as string[];
    providedCapabilities.push(type.name);
  }

  has(id: string): boolean {
    return this.typeMap.has(id);
  }

  list(filterArgs?: Filters): NamedType<NodeType>[] {
    const validTypes: Array<string> = [];

    this.pluginMap.forEach((manifest, pluginName) => {
      if (
        !filterArgs?.pluginFilter ||
        !pluginName.match(filterArgs.pluginFilter)
      ) {
        manifest.forEach((types, capabilityName) => {
          if (
            !filterArgs?.capabilityFilter ||
            !capabilityName.match(filterArgs.capabilityFilter)
          ) {
            types.forEach((type) => {
              if (
                !filterArgs?.typeFilter ||
                !type.match(filterArgs.typeFilter)
              ) {
                validTypes.push(type);
              }
            });
          }
        });
      }
    });
    return validTypes.map((type) => this.get(type) as NamedType);
  }

  info(id: string): TypeMetadata | undefined {
    return this.infoMap.get(id);
  }
}
