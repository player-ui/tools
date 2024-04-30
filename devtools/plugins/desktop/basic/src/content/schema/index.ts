import { dataTypes } from "@player-ui/common-types-plugin";
import type { Schema } from "@player-ui/types";
import { DSLSchema, makeBindingsForObject } from "@player-tools/dsl";

const RecordType: Schema.DataType<Record<string, unknown>> = {
  type: "RecordType",
};

export const schema = {
  playerConfig: RecordType,
  flow: RecordType,
  expression: dataTypes.StringType,
  code: dataTypes.StringType,
  history: [
    {
      id: dataTypes.StringType,
      expression: dataTypes.StringType,
      result: dataTypes.StringType,
      severity: dataTypes.StringType,
    },
  ] as [DSLSchema],
  logs: [
    {
      id: dataTypes.StringType,
      time: dataTypes.StringType,
      type: dataTypes.StringType,
      message: dataTypes.StringType,
      severity: dataTypes.StringType,
      binding: dataTypes.StringType,
      from: dataTypes.StringType,
      to: dataTypes.StringType,
      state: dataTypes.StringType,
      error: dataTypes.StringType,
      outcome: dataTypes.StringType,
      metricType: dataTypes.StringType,
    },
  ] as [DSLSchema],
};

export const bindings = makeBindingsForObject(schema);
