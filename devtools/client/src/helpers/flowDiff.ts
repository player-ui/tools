import type { Flow } from "@player-ui/react";
import { dequal } from "dequal";

/**
 * Compares two Flow objects and identifies if there's a change in their structure or data.
 *
 * This function takes two Flow objects as input, `curr` (current) and `next` (next), and compares them
 * to determine if there's a change in the flow's structure or its data. If there's a change in the flow's
 * structure (excluding the `data` property), it returns an object indicating a "flow" change along with the
 * new flow. If there's a change in the `data` property, it returns an object indicating a "data" change along
 * with the new data. If there are no changes, it returns null.
 */
export const flowDiff = ({
  curr,
  next,
}: {
  curr: Flow;
  next: Flow;
}):
  | { change: "data"; value: Flow["data"] }
  | { change: "flow"; value: Flow }
  | null => {
  // compare flows except for the `data` property
  const currCopy = { ...curr, data: null };
  const nextCopy = { ...next, data: null };

  const baseFlowIsEqual = dequal(currCopy, nextCopy);

  if (!baseFlowIsEqual) {
    return { change: "flow", value: next };
  }

  // compare data
  const currData = curr.data;
  const nextData = next.data;

  const dataIsEqual = dequal(currData, nextData);

  if (!dataIsEqual) {
    return { change: "data", value: nextData };
  }

  return null;
};
