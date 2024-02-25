import React from "react";
import { Collection, Info, Text } from "@player-ui/reference-assets-components";
import { VIEWS_IDS } from "../../constants";
import { bindings } from "../schema";
import { NavigationBar } from "../common/NavigationBar";

export const DataView = (
  <Info id={VIEWS_IDS.DATA}>
    <Info.Title>
      <Text value="Data" />
    </Info.Title>
    <Info.PrimaryInfo>
      <Collection>
        <Collection.Values>
          <NavigationBar />
          <Text value={bindings.data as any} />
        </Collection.Values>
      </Collection>
    </Info.PrimaryInfo>
  </Info>
);
