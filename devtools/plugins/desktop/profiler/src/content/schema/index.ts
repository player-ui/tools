import type { Schema } from "@player-ui/types";
import { dataTypes } from "@player-ui/common-types-plugin";
import { DSLSchema, makeBindingsForObject } from "@player-tools/dsl";

const RecordType: Schema.DataType<Record<string, unknown>> = {
  type: "RecordType",
};

export const schema = {
  playerConfig: RecordType,
  rootNode: RecordType,
  profiling: dataTypes.BooleanType,
  displayFlameGraph: dataTypes.BooleanType,
  durations: [
    {
      name: dataTypes.StringType,
      duration: dataTypes.StringType,
    },
  ] as [DSLSchema],
};

export const bindings = makeBindingsForObject(schema);
