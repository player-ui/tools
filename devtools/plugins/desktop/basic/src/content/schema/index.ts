import { dataTypes } from "@player-ui/common-types-plugin";
import type { Schema } from "@player-ui/types";
import { makeBindingsForObject } from "@player-tools/dsl";

const RecordType: Schema.DataType<Record<string, unknown>> = {
  type: "RecordType",
};

export const schema = {
  data: RecordType,
  flow: RecordType,
  logs: [
    {
      severity: dataTypes.StringType,
      message: dataTypes.StringType,
    },
  ],
  expression: dataTypes.StringType,
  evaluations: [
    {
      status: dataTypes.StringType,
      exp: dataTypes.StringType,
      data: dataTypes.StringType,
    },
  ],
};

export const bindings = makeBindingsForObject(schema);
