import React from "react";
import { Table } from "@devtools-ui/plugin";
import { VIEWS_IDS } from "../../constants";
import { Screen } from "../common";
import { bindings } from "../schema";

export const LogsView = (
  <Screen id={VIEWS_IDS.LOGS} main={<Table binding={bindings.logs as any} />} />
);
