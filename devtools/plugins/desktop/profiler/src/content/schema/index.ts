import type { Schema } from "@player-ui/types";
import { dataTypes } from "@player-ui/common-types-plugin";
import { makeBindingsForObject } from "@player-tools/dsl";

const RecordType: Schema.DataType<Record<string, unknown>> = {
  type: "RecordType",
};

export const schema = {
  playerConfig: RecordType,
  rootNode: RecordType,
  profiling: dataTypes.BooleanType,
  displayFlameGraph: dataTypes.BooleanType,
};

export const bindings = makeBindingsForObject(schema);
