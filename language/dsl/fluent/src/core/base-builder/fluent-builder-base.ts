import type { template as easyDslTemplate } from "..";
import {
  type BaseBuildContext,
  type ConditionalValue,
  type SwitchMetadata,
  type FluentPartial,
  FLUENT_BUILDER_SYMBOL,
  StorageKeys,
} from "./types";
import { ValueStorage } from "./storage/value-storage";
import { AuxiliaryStorage } from "./storage/auxiliary-storage";
import { executeBuildPipeline } from "./resolution/pipeline";
import { resolveValueOrFunction, maybeWrapAsset } from "./conditional";
import { switch_ } from "../switch";

/**
 * Base class for all generated builders
 * Provides core functionality for the builder pattern with Player UI-specific features
 *
 * This class delegates to specialized components:
 * - ValueStorage: Manages property values, builders, and mixed arrays
 * - AuxiliaryStorage: Manages metadata (templates, switches)
 * - Build Pipeline: Orchestrates the 8-step build process
 * - Conditional Logic: Handles if/ifElse with auto-wrapping
 */
export abstract class FluentBuilderBase<
  T,
  C extends BaseBuildContext = BaseBuildContext,
> {
  readonly [FLUENT_BUILDER_SYMBOL]: true = true as const;

  protected valueStorage: ValueStorage<T>;
  protected auxiliaryStorage: AuxiliaryStorage;
  protected context?: C;

  /**
   * Creates a new builder instance
   * @param initial - Optional initial values (accepts FluentPartial for TaggedTemplateValue support)
   */
  constructor(initial?: FluentPartial<T, C>) {
    this.valueStorage = new ValueStorage(initial as Partial<T>);
    this.auxiliaryStorage = new AuxiliaryStorage();
  }

  /**
   * Accessor for generated builders to access values
   * This maintains backward compatibility with generated code
   */
  protected get values(): Partial<T> {
    return this.valueStorage.getValues() as Partial<T>;
  }

  /**
   * Setter for generated builders to set values in bulk
   * Used by withAdditionalProperties() in generated builders
   */
  protected set values(newValues: Partial<T>) {
    Object.entries(newValues).forEach(([key, value]) => {
      this.valueStorage.set(key as keyof T, value);
    });
  }

  /**
   * Sets additional properties in bulk that may not be defined in the type schema
   * Useful for extensibility and forward compatibility
   */
  public withAdditionalProperties(values: Partial<T>): this {
    this.values = values;
    return this;
  }

  /**
   * Sets a property value, intelligently routing it to the appropriate storage
   * @param key - The property key to set
   * @param value - The value to set
   * @returns This builder instance for chaining
   */
  protected set<K extends keyof T>(key: K, value: unknown): this {
    this.valueStorage.set(key, value);
    return this;
  }

  /**
   * Builds the final object with defaults and nested builder resolution
   * Executes the complete 8-step build pipeline
   *
   * @param defaults - Optional default values
   * @param context - Optional build context
   */
  protected buildWithDefaults(defaults?: Partial<T>, context?: C): T {
    const arrayProperties = this.getArrayPropertiesMetadata();
    return executeBuildPipeline(
      this.valueStorage,
      this.auxiliaryStorage,
      defaults,
      context,
      arrayProperties,
    );
  }

  /**
   * Gets array property metadata from the builder class
   * Generated builders include a static __arrayProperties__ set
   */
  private getArrayPropertiesMetadata(): ReadonlySet<string> {
    const constructor = this.constructor as typeof FluentBuilderBase & {
      __arrayProperties__?: ReadonlySet<string>;
    };

    return constructor.__arrayProperties__ ?? new Set();
  }

  /**
   * Conditionally sets a property based on a predicate
   *
   * Accepts unwrapped Asset builders and automatically wraps them in AssetWrapper format.
   *
   * @param predicate - Function to determine if the property should be set
   * @param property - The property key
   * @param value - The value, builder, or function returning either
   *
   * @example
   * action()
   *   .if(() => showLabel, "label", text().withValue("Submit"))
   */
  public if<K extends keyof T>(
    predicate: (builder: this) => boolean,
    property: K,
    value: ConditionalValue<T[K], C>,
  ): this {
    if (predicate(this)) {
      const resolved = resolveValueOrFunction(value);
      const wrapped = maybeWrapAsset(resolved);

      // SAFETY: Type assertion is necessary and safe here because:
      // 1. `maybeWrapAsset` uses type guards to check if wrapping is needed
      // 2. For AssetWrapper properties, unwrapped builders are wrapped as { asset: builder }
      // 3. For other properties, values pass through unchanged
      // 4. The runtime behavior ensures type safety that TypeScript can't statically verify
      this.set(property, wrapped as T[K]);
    }

    return this;
  }

  /**
   * Conditionally sets a property choosing between two values
   *
   * Accepts unwrapped Asset builders and automatically wraps them in AssetWrapper format.
   *
   * @param predicate - Function to determine which value to use
   * @param property - The property key
   * @param trueValue - Value to use if predicate is true
   * @param falseValue - Value to use if predicate is false
   *
   * @example
   * action()
   *   .ifElse(
   *     () => isActive,
   *     "label",
   *     text().withValue("Deactivate"),
   *     text().withValue("Activate")
   *   )
   */
  public ifElse<K extends keyof T>(
    predicate: (builder: this) => boolean,
    property: K,
    trueValue: ConditionalValue<T[K], C>,
    falseValue: ConditionalValue<T[K], C>,
  ): this {
    const valueToUse = predicate(this) ? trueValue : falseValue;
    const resolved = resolveValueOrFunction(valueToUse);
    const wrapped = maybeWrapAsset(resolved);

    // SAFETY: Type assertion is necessary and safe here because:
    // 1. `maybeWrapAsset` uses type guards to check if wrapping is needed
    // 2. For AssetWrapper properties, unwrapped builders are wrapped as { asset: builder }
    // 3. For other properties, values pass through unchanged
    // 4. The runtime behavior ensures type safety that TypeScript can't statically verify
    this.set(property, wrapped as T[K]);
    return this;
  }

  /**
   * Checks if a property has been set
   */
  public has<K extends keyof T>(key: K): boolean {
    return this.valueStorage.has(key);
  }

  /**
   * Peeks at a property value without resolving builders
   */
  public peek<K extends keyof T>(key: K): T[K] | undefined {
    return this.valueStorage.peek(key);
  }

  /**
   * Gets builder for a property if one is set
   */
  public peekBuilder<K extends keyof T>(
    key: K,
  ): import("./types").FluentBuilder<T[K], C> | undefined {
    return this.valueStorage.peekBuilder<K, C>(key);
  }

  /**
   * Gets the type of value stored for a property
   */
  public getValueType<K extends keyof T>(
    key: K,
  ): "static" | "builder" | "mixed-array" | "unset" {
    return this.valueStorage.getValueType(key);
  }

  /**
   * Clones the builder, creating an independent copy with the same state.
   *
   * Note: This method requires that the builder class has a constructor that
   * accepts an optional `initial` parameter (like all generated builders do).
   * If your custom builder has required constructor parameters, you must
   * override this method.
   */
  public clone(): this {
    // Generated builders have constructor signature: constructor(initial?: Partial<T>)
    // We create a new instance and copy the internal state
    const BuilderClass = this.constructor as new (initial?: unknown) => this;

    // Create new instance (passing undefined is safe for generated builders)
    let cloned: this;
    try {
      cloned = new BuilderClass();
    } catch (error) {
      throw new Error(
        `clone() failed: Builder class "${this.constructor.name}" requires constructor arguments. ` +
          `Override clone() in your subclass to handle this case.`,
      );
    }

    cloned.valueStorage = this.valueStorage.clone();
    cloned.auxiliaryStorage = this.auxiliaryStorage.clone();
    if (this.context) {
      cloned.context = this.context;
    }

    return cloned;
  }

  /**
   * Unsets a property, removing it from the builder
   */
  public unset<K extends keyof T>(key: K): this {
    this.valueStorage.unset(key);
    return this;
  }

  /**
   * Clears all properties from the builder, resetting it to initial state
   */
  public clear(): this {
    this.valueStorage.clear();
    return this;
  }

  /**
   * Adds a template to this builder
   */
  public template(templateFn: ReturnType<typeof easyDslTemplate>): this {
    this.auxiliaryStorage.push(StorageKeys.TEMPLATES, templateFn);
    return this;
  }

  /**
   * Adds a switch to this builder at a specific path
   */
  public switch(
    path: ReadonlyArray<string | number>,
    switchFnArgs: Parameters<typeof switch_>[0],
  ): this {
    this.auxiliaryStorage.push<SwitchMetadata<C>>(StorageKeys.SWITCHES, {
      path,
      switchFn: switch_(switchFnArgs),
    });
    return this;
  }

  /**
   * Abstract build method to be implemented by generated builders
   */
  abstract build(context?: C): T;
}
