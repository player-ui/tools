import { Template } from "@player-tools/dsl";
import { Collection, Info, Text } from "@player-ui/reference-assets-components";
import React from "react";
import { VIEWS_IDS } from "../../constants";
import { NavigationBar } from "../common/NavigationBar";
import { bindings } from "../schema";

export const LogsView = (
  <Info id={VIEWS_IDS.LOGS}>
    <Info.Title>
      <Text value="Logs" />
    </Info.Title>
    <Info.PrimaryInfo>
      <Collection>
        <Collection.Values>
          <NavigationBar />
          <Template data={bindings.logs}>
            <Text
              value={`${bindings.logs._index_.severity} - ${bindings.logs._index_.message}`}
            />
          </Template>
        </Collection.Values>
      </Collection>
    </Info.PrimaryInfo>
  </Info>
);
