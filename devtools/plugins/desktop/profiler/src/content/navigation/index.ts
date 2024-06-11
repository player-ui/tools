import { VIEWS_IDS } from "../../constants";

const transitions = Object.entries(VIEWS_IDS).reduce(
  (acc, [key, value]) => ({
    ...acc,
    [value]: key,
  }),
  {} as Record<string, string>
);

export const navigation = {
  BEGIN: "Plugin",
  Plugin: {
    startState: Object.keys(VIEWS_IDS)[0],
    ...Object.entries(VIEWS_IDS).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: {
          state_type: "VIEW",
          ref: value,
          transitions,
        },
      }),
      {} as Record<string, unknown>
    ),
  },
};
