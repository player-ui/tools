import type { Schema } from "@player-ui/types";

type SchemaDataType = Schema.DataType | Schema.RecordType | Schema.ArrayType;
export type SchemaGeneratorInput = Record<
  string,
  SchemaDataType | Record<string, unknown> | unknown[]
>;
