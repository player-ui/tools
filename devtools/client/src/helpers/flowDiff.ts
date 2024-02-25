import type { Flow } from "@player-ui/react";
import { dequal } from "dequal";

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
