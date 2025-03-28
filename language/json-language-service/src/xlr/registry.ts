import type { Filters, TypeMetadata } from "@player-tools/xlr-sdk";
import { BasicXLRRegistry } from "@player-tools/xlr-sdk";
import type { NamedType, NodeType } from "@player-tools/xlr";

/**
 * Player specific implementation of a XLRs Registry
 */
export class PlayerXLRRegistry extends BasicXLRRegistry {
  /** Keeps the mapping of how a type is referenced by Player to the underlying XLR */
  private registrationMap: Map<string, string | Array<string>>;

  constructor() {
    super();
    this.registrationMap = new Map();
  }

  get(id: string): NamedType<NodeType> | undefined {
    const realNames = this.registrationMap.get(id);
    if (realNames === undefined) {
      return undefined;
    }

    if (Array.isArray(realNames)) {
      return {
        name: `${id}PartialMatchType`,
        source: "registry.ts",
        type: "or",
        or: realNames.map(
          (partialMatchID) => super.get(partialMatchID) as NamedType,
        ),
      };
    }

    return super.get(realNames);
  }

  add(type: NamedType<NodeType>, plugin: string, capability: string): void {
    let registeredName = type.name;
    // Figure out how the Asset/View will be referenced from the type argument that will fill in Asset
    if (
      (capability === "Assets" || capability === "Views") &&
      type.type === "object" &&
      type.extends?.genericArguments?.[0]?.type === "string" &&
      type.extends?.genericArguments?.[0]?.const
    ) {
      this.registrationMap.set(registeredName, type.name);
      registeredName = type.extends.genericArguments[0].const;
    }

    if (this.registrationMap.has(registeredName)) {
      const current = this.registrationMap.get(registeredName) as
        | string
        | string[];
      if (Array.isArray(current)) {
        current.push(registeredName);
      } else {
        this.registrationMap.set(registeredName, [current, type.name]);
      }
    } else {
      this.registrationMap.set(registeredName, type.name);
    }

    super.add(type, plugin, capability);
  }

  has(id: string): boolean {
    return this.registrationMap.has(id);
  }

  list(filterArgs?: Filters): NamedType<NodeType>[] {
    return super.list(filterArgs);
  }

  info(id: string): TypeMetadata | undefined {
    const realNames = this.registrationMap.get(id);
    if (realNames === undefined) {
      return undefined;
    }

    if (Array.isArray(realNames)) {
      const metaDataArrays = realNames.map((name) => super.info(name));
      const firstElement = metaDataArrays[0];
      const equal = metaDataArrays.every(
        (metaData) =>
          metaData?.plugin === firstElement?.plugin &&
          metaData?.capability === firstElement?.capability,
      );
      if (equal) {
        return firstElement;
      }

      throw Error(
        `Error: can't determine accurate info for type ${id} as it is provided by multiple plugins/capabilities`,
      );
    }

    return super.info(realNames);
  }
}
