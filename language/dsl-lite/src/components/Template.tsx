/** @jsx createElement */
import { createElement } from "../jsx-runtime.js";
import {
  type JSXElement,
  type TaggedTemplateValue,
  isTaggedTemplateValue,
} from "../types.js";
import { IdProvider, useId } from "./useId";

interface TemplateProps {
  data: TaggedTemplateValue | string;
  output: string;
  dynamic?: boolean;
  children?: JSXElement;
}

// Check if the ID has a template index marker - used to detect nesting
function isInTemplateContext(id: string): boolean {
  return id.includes("_index");
}

export function Template(props: TemplateProps) {
  const { getId, createTemplateId } = useId();
  const outputProp = props.output || "values";
  const currentId = getId();
  const isNested = isInTemplateContext(currentId);
  const newId = createTemplateId(outputProp, isNested);

  return (
    <property name="template">
      <array>
        <obj>
          <property name="data">
            <value
              value={
                isTaggedTemplateValue(props.data)
                  ? props.data.toRefString()
                  : props.data
              }
            />
          </property>

          <property name="output">
            <value value={outputProp} />
          </property>

          {props.dynamic && (
            <property name="dynamic">
              <value value={true} />
            </property>
          )}

          <property name="value">
            <obj>
              <property name="asset">
                <IdProvider id={newId}>{props.children}</IdProvider>
              </property>
            </obj>
          </property>
        </obj>
      </array>
    </property>
  );
}
