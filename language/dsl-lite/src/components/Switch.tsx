/** @jsx createElement */
import { createElement } from "../jsx-runtime.js";
import { IdProvider, useId } from "./useId";
import type { JSXElement, TaggedTemplateValue } from "../types";

interface CaseProps {
  exp?: TaggedTemplateValue | boolean;
  children?: JSXElement;
}

function processCaseExpression(
  exp?: TaggedTemplateValue | boolean
): string | boolean {
  if (exp === undefined) {
    return true;
  }
  if (typeof exp === "boolean") {
    return exp;
  }
  return exp.toRefString();
}

function CaseWrapper({
  children,
  idx,
  switchType,
}: {
  children?: JSXElement | JSXElement[];
  idx: number;
  switchType: "staticSwitch" | "dynamicSwitch";
}) {
  const { createSwitchId } = useId();
  const caseId = createSwitchId(switchType, idx);

  return <IdProvider id={caseId}>{children}</IdProvider>;
}

export function Case(props: CaseProps) {
  return (
    <obj>
      <property name="case">
        <value value={processCaseExpression(props.exp)} />
      </property>
      <property name="asset">{props.children}</property>
    </obj>
  );
}

export function Switch(props: {
  isDynamic?: boolean;
  children?: JSXElement | JSXElement[];
}) {
  const switchType = props.isDynamic ? "dynamicSwitch" : "staticSwitch";

  return (
    <obj>
      <property name={switchType}>
        <array>
          {props.children &&
            Array.isArray(props.children) &&
            props.children.map((child, idx) => (
              // eslint-disable-next-line react/jsx-key
              <CaseWrapper idx={idx} switchType={switchType}>
                {child}
              </CaseWrapper>
            ))}
        </array>
      </property>
    </obj>
  );
}

Switch.Case = Case;

export function isSwitch(element: unknown): boolean {
  return Boolean(
    element &&
      typeof element === "object" &&
      "type" in element &&
      element.type &&
      typeof element.type === "function" &&
      element.type.name === "Switch"
  );
}
