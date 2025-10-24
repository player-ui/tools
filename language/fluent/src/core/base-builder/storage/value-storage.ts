import type {
  BaseBuildContext,
  FluentBuilder,
  MixedArrayMetadata,
} from "../types";
import { isFluentBuilder } from "../guards";

/**
 * Manages storage for builder property values
 *
 * Values are stored in three different maps based on their type:
 * - values: Static values (strings, numbers, plain objects without builders)
 * - builders: FluentBuilder instances and objects containing builders
 * - mixedArrays: Arrays containing both static values and builders
 *
 * This separation allows efficient resolution during the build process
 */
export class ValueStorage<T> {
  private values: Partial<T> = {};
  private builders: Map<
    string,
    FluentBuilder<unknown, BaseBuildContext> | Record<string, unknown>
  > = new Map();
  private mixedArrays: Map<string, MixedArrayMetadata> = new Map();

  constructor(initial?: Partial<T>) {
    if (initial) {
      this.values = { ...initial };
    }
  }

  /**
   * Sets a property value, intelligently routing it to the appropriate storage
   *
   * This method performs runtime type checking to determine how to store the value:
   * - FluentBuilder instances → builders Map
   * - Arrays with builders → mixedArrays Map
   * - Objects with builders → builders Map
   * - Everything else → values (static storage)
   */
  set<K extends keyof T>(key: K, value: unknown): void {
    const keyStr = String(key);

    if (isFluentBuilder(value)) {
      this.builders.set(keyStr, value);
      delete this.values[key];
      this.mixedArrays.delete(keyStr);
    } else if (Array.isArray(value)) {
      this.handleArrayValue(key, keyStr, value);
    } else if (
      typeof value === "object" &&
      value !== null &&
      this.containsBuilder(value)
    ) {
      this.builders.set(keyStr, value as Record<string, unknown>);
      delete this.values[key];
      this.mixedArrays.delete(keyStr);
    } else {
      this.setStaticValue(key, keyStr, value);
    }
  }

  /**
   * Handles array value storage, detecting mixed arrays with builders
   */
  private handleArrayValue<K extends keyof T>(
    key: K,
    keyStr: string,
    value: readonly unknown[],
  ): void {
    const builderIndices = new Set<number>();
    const objectIndices = new Set<number>();

    value.forEach((item, index) => {
      if (isFluentBuilder(item)) {
        builderIndices.add(index);
      } else if (
        typeof item === "object" &&
        item !== null &&
        this.containsBuilder(item)
      ) {
        objectIndices.add(index);
      }
    });

    const hasBuilders = builderIndices.size > 0 || objectIndices.size > 0;

    if (hasBuilders) {
      this.mixedArrays.set(keyStr, {
        array: value,
        builderIndices,
        objectIndices,
      });
      delete this.values[key];
    } else {
      this.setStaticValue(key, keyStr, value);
      this.mixedArrays.delete(keyStr);
    }

    this.builders.delete(keyStr);
  }

  /**
   * Sets a static value with proper type handling
   */
  private setStaticValue<K extends keyof T>(
    key: K,
    keyStr: string,
    value: unknown,
  ): void {
    // For known types in T, TypeScript will validate at compile time
    // At runtime, we trust the caller has provided a compatible type
    this.values[key] = value as T[K];
    this.builders.delete(keyStr);
    this.mixedArrays.delete(keyStr);
  }

  /**
   * Checks if an object contains any builders recursively
   * Handles circular references gracefully
   */
  private containsBuilder(
    obj: unknown,
    visited: WeakSet<object> = new WeakSet(),
  ): boolean {
    if (isFluentBuilder(obj)) return true;

    if (!obj || typeof obj !== "object") return false;

    if (visited.has(obj)) return false;
    visited.add(obj);

    if (Array.isArray(obj)) {
      return obj.some((item) => this.containsBuilder(item, visited));
    }

    const proto = Object.getPrototypeOf(obj);
    if (proto === Object.prototype || proto === null) {
      return Object.values(obj).some((val) =>
        this.containsBuilder(val, visited),
      );
    }

    return false;
  }

  /**
   * Checks if a property has been set
   */
  has<K extends keyof T>(key: K): boolean {
    const keyStr = String(key);
    return (
      key in this.values ||
      this.builders.has(keyStr) ||
      this.mixedArrays.has(keyStr)
    );
  }

  /**
   * Peeks at a property value without resolving builders
   * Returns the raw value if it's static, the array if it's mixed, or undefined if it's a builder
   */
  peek<K extends keyof T>(key: K): T[K] | undefined {
    const keyStr = String(key);

    const mixedArray = this.mixedArrays.get(keyStr);
    if (mixedArray) {
      return mixedArray.array as T[K];
    }

    if (this.builders.has(keyStr)) {
      return undefined;
    }

    return this.values[key];
  }

  /**
   * Gets builder for a property if one is set
   */
  peekBuilder<K extends keyof T, C extends BaseBuildContext>(
    key: K,
  ): FluentBuilder<T[K], C> | undefined {
    const keyStr = String(key);
    const entry = this.builders.get(keyStr);
    if (!entry) return undefined;

    if (isFluentBuilder<T[K], C>(entry)) {
      return entry;
    }

    return undefined;
  }

  /**
   * Gets the type of value stored for a property
   */
  getValueType<K extends keyof T>(
    key: K,
  ): "static" | "builder" | "mixed-array" | "unset" {
    const keyStr = String(key);

    if (this.mixedArrays.has(keyStr)) {
      return "mixed-array";
    }

    if (this.builders.has(keyStr)) {
      return "builder";
    }

    if (key in this.values) {
      return "static";
    }

    return "unset";
  }

  /**
   * Gets all static values for the build pipeline
   */
  getValues(): Readonly<Partial<T>> {
    return this.values;
  }

  /**
   * Gets all builder entries for the build pipeline
   */
  getBuilders(): ReadonlyMap<
    string,
    FluentBuilder<unknown, BaseBuildContext> | Record<string, unknown>
  > {
    return this.builders;
  }

  /**
   * Gets all mixed array entries for the build pipeline
   */
  getMixedArrays(): ReadonlyMap<string, MixedArrayMetadata> {
    return this.mixedArrays;
  }

  /**
   * Unsets a property, removing it from storage
   */
  unset<K extends keyof T>(key: K): void {
    const keyStr = String(key);
    delete this.values[key];
    this.builders.delete(keyStr);
    this.mixedArrays.delete(keyStr);
  }

  /**
   * Clears all properties from storage
   */
  clear(): void {
    this.values = {};
    this.builders.clear();
    this.mixedArrays.clear();
  }

  /**
   * Clones the storage, creating an independent copy
   */
  clone(): ValueStorage<T> {
    const cloned = new ValueStorage<T>();
    cloned.values = { ...this.values };
    cloned.builders = new Map(this.builders);
    cloned.mixedArrays = new Map(
      Array.from(this.mixedArrays.entries()).map(([key, metadata]) => [
        key,
        {
          array: metadata.array,
          builderIndices: new Set(metadata.builderIndices),
          objectIndices: new Set(metadata.objectIndices),
        },
      ]),
    );
    return cloned;
  }
}
