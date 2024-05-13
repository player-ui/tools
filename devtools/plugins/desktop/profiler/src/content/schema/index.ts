import type { Schema } from "@player-ui/types";
import { makeBindingsForObject } from "@player-tools/dsl";

const RecordType: Schema.DataType<Record<string, unknown>> = {
  type: "RecordType",
};

export const schema = {
  playerConfig: RecordType,
  rootNode: RecordType,
};

export const bindings = makeBindingsForObject(schema);
