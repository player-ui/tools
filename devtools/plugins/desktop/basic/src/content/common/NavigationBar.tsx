import React from "react";
import {
  Action,
  Collection,
  Text,
} from "@player-ui/reference-assets-components";
import { VIEWS_IDS } from "../../constants";

export const NavigationBar = () => (
  <Collection>
    <Collection.Values>
      {Object.values(VIEWS_IDS).map((viewId) => (
        <Action key={viewId} value={viewId}>
          <Action.Label>
            <Text>{viewId}</Text>
          </Action.Label>
        </Action>
      ))}
    </Collection.Values>
  </Collection>
);
