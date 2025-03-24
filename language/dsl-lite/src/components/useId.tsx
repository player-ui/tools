/** @jsx createElement */
import { createElement } from "../jsx-runtime.js";
import { createContext, useContext } from "../hooks.js";
import { JSXElement } from "../types.js";

export type IdSegment =
  | { type: "override"; id: string }
  | { type: "property"; name: string; index?: number }
  | { type: "array-item"; index: number }
  | { type: "template"; output: string; suffix?: string }
  | {
      type: "switch";
      switchType: "staticSwitch" | "dynamicSwitch";
      index: number;
    };

function branchId(parentId: string, segment: IdSegment): string {
  // If parent ID is "root", we don't include it in the new ID
  const baseId = parentId === "root" ? "" : parentId;

  switch (segment.type) {
    case "override":
      return segment.id;
    case "property":
      if (segment.index !== undefined) {
        return baseId
          ? `${baseId}-${segment.name}-${segment.index}`
          : `${segment.name}-${segment.index}`;
      }
      return baseId ? `${baseId}-${segment.name}` : segment.name;
    case "array-item":
      return baseId ? `${baseId}-${segment.index}` : `${segment.index}`;
    case "template":
      // For template indices
      const suffix = segment.suffix || "_index_";
      return baseId
        ? `${baseId}-${segment.output}-${suffix}`
        : `${segment.output}-${suffix}`;
    case "switch":
      return baseId
        ? `${baseId}-${segment.switchType}-${segment.index}`
        : `${segment.switchType}-${segment.index}`;
    default:
      return baseId || "root";
  }
}

export interface IdContextType {
  getId: () => string;
  branch: (segment: IdSegment) => string;
  createSwitchId: (
    switchType: "staticSwitch" | "dynamicSwitch",
    index: number
  ) => string;
  createTemplateId: (output: string, isNested: boolean) => string;
}

export const IdContext = createContext<IdContextType>({
  getId: () => "root",
  branch: (segment) => branchId("root", segment),
  createSwitchId: (switchType, index) => `${switchType}-${index}`,
  createTemplateId: (output, isNested) =>
    isNested ? `values-_index_-${output}-_index1_` : `${output}-_index_`,
});

export const IdProvider = (props: {
  id: string;
  children?: JSXElement | JSXElement[];
}) => {
  // Use 'root' as the default id when an empty string is provided
  const id = props.id || "root";

  const contextValue: IdContextType = {
    getId: () => id,
    branch: (segment: IdSegment) => branchId(id, segment),

    createSwitchId: (switchType, index) => {
      return branchId(id, { type: "switch", switchType, index });
    },

    createTemplateId: (output, isNested) => {
      // For nested templates, we need a special suffix
      const suffix = isNested ? "_index1_" : "_index_";
      return branchId(id, { type: "template", output, suffix });
    },
  };

  return (
    <IdContext.Provider value={contextValue}>
      {props.children}
    </IdContext.Provider>
  );
};

export function useId() {
  const context = useContext<IdContextType>(IdContext);
  if (!context) {
    throw new Error("useId must be used within an IdProvider");
  }
  return context;
}
