import { Collection, Info, Text } from "@player-ui/reference-assets-components";
import React from "react";
import { VIEWS_IDS } from "../../constants";
import { NavigationBar } from "../common/NavigationBar";
import { bindings } from "../schema";

export const FlowView = (
  <Info id={VIEWS_IDS.FLOW}>
    <Info.Title>
      <Text value="Flow" />
    </Info.Title>
    <Info.PrimaryInfo>
      <Collection>
        <Collection.Values>
          <NavigationBar />
          <Text value={bindings.flow as any} />
        </Collection.Values>
      </Collection>
    </Info.PrimaryInfo>
  </Info>
);
