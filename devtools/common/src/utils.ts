/** Utility structure defining the base interface for a discriminated union */
export interface DiscriminatedType<T extends string> {
  /** Unique type associated with the type */
  type: T;
}

/** Utility for patternizing union discrimination */
export type DiscriminateByType<Types, T extends string> = Extract<
  Types,
  { type: T }
>;

/** Higher order utility for determining what types things are */
export const isKnownType = <Types extends DiscriminatedType<T>, T extends string>(types: readonly T[]) => 
  <Provided extends T>(value: any, type?: Provided): value is DiscriminateByType<Types, Provided> =>
    typeof value === 'object' &&
    types.includes(value.type) &&
    (!type || value.type === type);
