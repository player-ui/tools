import type {
  Asset,
  Expression,
  Navigation as PlayerNav,
  Schema,
  Validation,
} from "@player-ui/types";
import type {
  BindingTemplateInstance,
  ExpressionTemplateInstance,
} from "./string-templates";
import { ExpressionHandler } from "@player-ui/player";

export type WithChildren<T = Record<string, unknown>> = T & {
  /** child nodes */
  children?: React.ReactNode;
};

export type RemoveUnknownIndex<T> = {
  [P in keyof T as T[P] extends unknown
    ? unknown extends T[P]
      ? never
      : P
    : P]: T[P];
};

export type AddUnknownIndex<T> = T & {
  [key: string]: unknown;
};

/** Make an ID prop optional an a type */
export type OmitProp<T, K extends string> = {
  [P in keyof T as P extends K ? never : P]: T[P];
};

export interface PlayerApplicability {
  /** An expression to evaluate to determine if this node should appear in a view or not */
  applicability?:
    | BindingTemplateInstance
    | ExpressionTemplateInstance
    | boolean;
}

export type WithApplicability<T = Record<string, unknown>> = T &
  PlayerApplicability;

export type WithPlayerTypes<T> = WithApplicability<WithTemplateTypes<T>>;

export type AssetPropsWithChildren<T extends Asset> = WithChildren<
  WithTemplateTypes<
    OmitProp<RemoveUnknownIndex<T>, "id" | "type"> & Partial<Pick<Asset, "id">>
  > &
    PlayerApplicability
>;

export type SwapKeysToType<T, K extends keyof T, NewType> = {
  [P in keyof T]: P extends K ? NewType : T[P];
};

export type WithTemplateTypes<T> =
  T extends Record<any, any>
    ? {
        [P in keyof T]: WithTemplateTypes<T[P]>;
      }
    : T | BindingTemplateInstance | ExpressionTemplateInstance;

type ValidKeys = "exp" | "onStart" | "onEnd";

type DeepReplace<T, Old, New> = {
  [P in keyof T]: T[P] extends Old
    ? P extends ValidKeys
      ? New
      : DeepReplace<T[P], Old, New> // Set to new if one of the valid keys: replace with `? New` for all keys
    : T[P] extends (infer R)[] // Is this a Tuple or array
      ? DeepReplace<R, Old, New>[] // Replace the type of the tuple/array
      : T[P] extends object
        ? DeepReplace<T[P], Old, New>
        : Extract<T[P], Old> extends Old // Is this a union with the searched for type?
          ?
              | DeepReplace<Extract<T[P], object>, Old, New> // Replace all object types of the union
              | Exclude<T[P], Old | object> // Get all types that are not objects (handled above) or Old (handled below
              | New // Direct Replacement of Old
          : T[P];
};

export type Navigation = DeepReplace<
  PlayerNav,
  Expression,
  ExpressionTemplateInstance | ExpressionTemplateInstance[] | Expression
>;

export interface toJsonOptions {
  /**
   * List of string keys that should not be parsed in a special way
   * default is "applicability"
   */
  propertiesToSkip?: string[];
}

type RemoveIndexSignature<T> = {
  [K in keyof T as string extends K
    ? never
    : number extends K
      ? never
      : symbol extends K
        ? never
        : K]: T[K];
};

export type ValidationRefProps = RemoveIndexSignature<Validation.Reference>;

export type DataTypeRefs<
  DataTypeObjects extends Record<string, Schema.DataType>,
> = {
  /** Property name with DataType object */
  [Property in Extract<keyof DataTypeObjects, string> as `${Property}Ref`]: {
    /** DataType name */
    type: Property;
  };
};

export type ValidatorFunctionRefs<
  ValidatorObjects extends { [key: string]: (...args: any[]) => any },
> = {
  /** Property name with validator ref object */
  [Property in Extract<keyof ValidatorObjects, string> as `${Property}Ref`]: {
    /** Validator name */
    type: Property;
  } & Parameters<ValidatorObjects[Property]>[2] &
    ValidationRefProps;
};

export type DataTypeReference<
  DataTypeProp = { [key: string]: Schema.DataType },
  ValidationRef = { [key: string]: Validation.Reference },
  SymbolType = never,
> =
  | (Omit<Schema.DataType, "type" | "validation"> & {
      /** Handled data type */
      type: keyof DataTypeProp;
      /** Data type validation refs */
      validation?: ValidationRef[keyof ValidationRef][];
    })
  | SymbolType;

export interface DSLSchema<DataTypeRef = DataTypeReference> {
  [key: string]:
    | [DataTypeRef]
    | DataTypeRef
    | [DSLSchema<DataTypeRef>]
    | DSLSchema<DataTypeRef>;
}

type ExpressionHandlerToFunction<T extends ExpressionHandler> =
  T extends ExpressionHandler<infer A>
    ? (...args: A) => ExpressionTemplateInstance
    : undefined;

export type ExpressionArray<T> =
  T extends Record<any, any>
    ? {
        [P in keyof T]: ExpressionHandlerToFunction<T[P]>;
      }
    : undefined;
