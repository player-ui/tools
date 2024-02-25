import { expression as e, Template } from "@player-tools/dsl";
import {
  Action,
  Collection,
  Info,
  Input,
  Text,
} from "@player-ui/reference-assets-components";
import React from "react";
import { VIEWS_IDS, INTERACTIONS } from "../../constants";
import { NavigationBar } from "../common/NavigationBar";
import { bindings } from "../schema";

const evaluateExpression = e`publish(${INTERACTIONS.EVALUATE_EXPRESSION}, ${bindings.expression})`;

export const ConsoleView = (
  <Info id={VIEWS_IDS.CONSOLE}>
    <Info.Title>
      <Text value="Console" />
    </Info.Title>
    <Info.PrimaryInfo>
      <Collection>
        <Collection.Values>
          <NavigationBar />
          <Template data={bindings.evaluations}>
            <Text
              value={`${bindings.evaluations._index_.exp} (${bindings.evaluations._index_.status}): ${bindings.evaluations._index_.data}`}
            />
          </Template>
          <Input binding={bindings.expression as any}>
            <Input.Label>
              <Text value="Expression" />
            </Input.Label>
          </Input>
          <Action exp={evaluateExpression as any}>
            <Action.Label>
              <Text value="Evaluate" />
            </Action.Label>
          </Action>
        </Collection.Values>
      </Collection>
    </Info.PrimaryInfo>
  </Info>
);
