/** @jsx createElement */
import { createElement } from "../jsx-runtime.js";
import { IdProvider, useId } from "./useId";
import {
  isTaggedTemplateValue,
  type JsonType,
  type JSXElement,
  type TaggedTemplateValue,
} from "../types";

interface AssetProps {
  type: string;
  id?: string;
  children?: JSXElement | JSXElement[];
  [key: string]:
    | JsonType
    | TaggedTemplateValue
    | JSXElement
    | JSXElement[]
    | undefined;
}

export function Asset(props: AssetProps): JSXElement {
  const idContext = useId();
  const assetId = props.id || idContext.getId();

  return (
    <obj>
      <property name="id">
        <value value={assetId} />
      </property>
      <property name="type">
        <value value={props.type} />
      </property>

      <IdProvider id={assetId}>{props.children}</IdProvider>

      {Object.entries(props)
        .filter(([k]) => !["id", "type", "children"].includes(k))
        .map(([key, value]) => {
          return (
            // eslint-disable-next-line react/jsx-key
            <property name={key}>
              <value
                value={
                  isTaggedTemplateValue(value) ? value.toRefString() : value
                }
              />
            </property>
          );
        })}
    </obj>
  );
}
