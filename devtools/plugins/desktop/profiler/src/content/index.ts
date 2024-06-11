import { PLUGIN_ID } from "../constants";
import { navigation } from "./navigation";
import { schema } from "./schema";
import { views } from "./views";

export default {
  id: PLUGIN_ID,
  views,
  navigation,
  schema,
  data: {
    rootNode: {
      name: "profiler time span",
      value: 0,
    },
    displayFlameGraph: false,
    profiling: false,
  },
};
