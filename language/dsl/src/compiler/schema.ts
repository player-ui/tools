import type { Schema, Language } from '@player-ui/types';
import { dequal } from 'dequal';
import { SyncWaterfallHook } from 'tapable-ts';
import type { LoggingInterface } from '..';
import { binding as b } from '..';
import type { BindingTemplateInstance } from '../string-templates';

const bindingSymbol = Symbol('binding');

/** Symbol to indicate that a schema node should be generated with a different name */
export const SchemaTypeName = Symbol('Schema Rename');

interface SchemaChildren {
  /** Object property that will be used to create the intermediate type */
  name: string;

  /** Object properties children that will be parsed */
  child: object;
}

type SchemaNode = Schema.DataType | Language.DataTypeRef | object;

interface GeneratedDataType {
  /** The SchemaNode that was generated */
  node: SchemaNode;
  /** How many times it has been generated */
  count: number;
}

/**
 * Type Guard for the `Schema.DataType` and `Language.DataTypeRef` type
 * A bit hacky but since `Schema.Schema` must have a `Schema.DataType` as
 * the final product we have to call it that even if it is a `Language.DataTypeRef`
 */
const isTypeDef = (property: SchemaNode): property is Schema.DataType => {
  return (property as Schema.DataType).type !== undefined;
};

/**
 * Generator for `Schema.Schema` Objects
 */
export class SchemaGenerator {
  private children: Array<SchemaChildren>;
  private generatedDataTypes: Map<string, GeneratedDataType>;
  private logger: LoggingInterface;

  public hooks = {
    createSchemaNode: new SyncWaterfallHook<
      [
        node: Schema.DataType,
        originalProperty: Record<string | symbol, unknown>
      ]
    >(),
  };

  constructor(logger?: LoggingInterface) {
    this.children = [];
    this.generatedDataTypes = new Map();
    this.logger = logger ?? console;
  }

  /**
   * Converts an object to a `Schema.Schema` representation
   * Note: uses iteration to prevent potentially very deep recursion on large objects
   */
  public toSchema = (schema: any): Schema.Schema => {
    const newSchema: Schema.Schema = {
      ROOT: {},
    };

    this.children = [];
    this.generatedDataTypes.clear();

    Object.keys(schema).forEach((property) => {
      const subType = schema[property] as SchemaNode;
      newSchema.ROOT[property] = this.hooks.createSchemaNode.call(
        this.processChild(property, subType),
        subType as any
      );
    });

    while (this.children.length > 0) {
      const c = this.children.pop();
      if (c === undefined) {
        break;
      }

      const { name, child } = c;
      const typeDef = {} as any;

      Object.keys(child).forEach((property) => {
        const subType = (child as any)[property] as SchemaNode;
        typeDef[property] = this.hooks.createSchemaNode.call(
          this.processChild(property, subType),
          subType as any
        );
      });
      newSchema[name] = typeDef;
    }

    return newSchema;
  };

  /**
   * Processes the children of an object Node
   * Newly discovered children get added to the provided array
   */
  private processChild(property: string, subType: SchemaNode): Schema.DataType {
    if (isTypeDef(subType)) {
      return subType;
    }

    let intermediateType;
    let child;

    if (Array.isArray(subType)) {
      if (subType.length > 1) {
        this.logger.warn(
          `Type ${property} has multiple types in array, should only contain one top level object type. Only taking first defined type`
        );
      }

      const subTypeName = subType[0][SchemaTypeName] ?? property;
      intermediateType = this.makePlaceholderArrayType(subTypeName);
      [child] = subType;
    } else {
      const subTypeName = subType[SchemaTypeName] ?? property;
      intermediateType = this.makePlaceholderType(subTypeName);
      child = subType;
    }

    this.children.push({ name: intermediateType.type, child });

    if (this.generatedDataTypes.has(intermediateType.type)) {
      const generatedType = this.generatedDataTypes.get(
        intermediateType.type
      ) as GeneratedDataType;
      if (
        !dequal(
          child,
          this.generatedDataTypes.get(intermediateType.type)?.node as object
        )
      ) {
        generatedType.count += 1;
        const newIntermediateType = {
          ...intermediateType,
          type: `${intermediateType.type}${generatedType.count}`,
        };
        this.logger.warn(
          `WARNING: Generated two intermediate types with the name: ${intermediateType.type} that are of different shapes, using artificial type ${newIntermediateType.type}`
        );
        intermediateType = newIntermediateType;
        this.children.pop();
        this.children.push({ name: intermediateType.type, child });
      }
    }

    this.generatedDataTypes.set(intermediateType.type, {
      node: subType,
      count: 1,
    });
    return intermediateType;
  }

  /**
   * Make an intermediate `Schema.DataType` object given a name
   */
  private makePlaceholderType = (typeName: String): Schema.DataType => {
    return {
      type: `${typeName}Type`,
    };
  };

  /**
   * Make an intermediate `Schema.DataType` object with multicopy suport given a name
   */
  private makePlaceholderArrayType(typeName: String): Schema.DataType {
    return {
      type: `${typeName}Type`,
      isArray: true,
    };
  }
}

export type MakeArrayIntoIndexRef<T extends any[]> = {
  [key: number]: MakeBindingRefable<T[0]>;
  /** Used when referencing bindings from within a template */
  _index_: MakeBindingRefable<T[0]>;
} & BindingTemplateInstance;

export type MakeBindingRefable<T> = {
  [P in keyof T]: T[P] extends object[]
    ? MakeArrayIntoIndexRef<T[P]>
    : T[P] extends unknown[]
    ? T[P]
    : MakeBindingRefable<T[P]>;
} &
  BindingTemplateInstance;

/**
 * Adds bindings to an object so that the object can be directly used in JSX
 */
export function makeBindingsForObject<Type>(
  obj: Type,

  arrayAccessorKeys = ['_index_']
): MakeBindingRefable<Type> {
  /** Proxy to track binding callbacks */
  const accessor = (paths: string[]) => {
    const bindingMap = new WeakMap<any, BindingTemplateInstance>();

    return {
      ownKeys(target: any) {
        return Reflect.ownKeys(target);
      },

      get(target: any, key: any): any {
        const bindingKeys = Object.keys(target);

        // If there is an array of primitives, just return a copy of that array
        if (
          Array.isArray(target[key]) &&
          target[key].length > 0 &&
          target[key].every((it: any) => typeof it !== 'object')
        ) {
          return [...target[key]];
        }

        if (!bindingMap.has(target)) {
          bindingMap.set(target, b`${paths.join('.')}`);
        }

        if (key === bindingSymbol) {
          return paths;
        }

        if (
          Array.isArray(target) &&
          (arrayAccessorKeys.includes(key) || typeof key === 'number')
        ) {
          return new Proxy(target[0], accessor(paths.concat([key])));
        }

        if (bindingKeys.includes(key) && typeof target[key] === 'object') {
          return new Proxy(target[key], accessor(paths.concat([key])));
        }

        const createdInstance = bindingMap.get(target);
        return createdInstance?.[key];
      },
    };
  };

  return new Proxy(obj, accessor([])) as MakeBindingRefable<Type>;
}

/**
 * Generates binding for an object property
 */
export const getBindingFromObject = (obj: any) => {
  const baseBindings = obj[bindingSymbol] as string[];
  if (!Array.isArray(baseBindings) || baseBindings.length === 0) {
    throw new Error(`Unable to get binding for ${obj}`);
  }

  return b`${baseBindings.join('.')}`;
};

/**
 * Returns the binding string from an object path
 */
export const getBindingStringFromObject = (obj: any) => {
  return getBindingFromObject(obj).toString();
};

/**
 * Returns the ref string from an object path
 */
export const getRefStringFromObject = (obj: any) => {
  return getBindingFromObject(obj).toRefString();
};