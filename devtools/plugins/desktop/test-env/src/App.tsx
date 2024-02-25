import {
  ReactPlayerOptions,
  ReactPlayerPlugin,
  useReactPlayer,
} from "@player-ui/react";
import { ReferenceAssetsPlugin } from "@player-ui/reference-assets-plugin-react";
import { BasicWevDevtoolsPlugin } from "@player-tools/devtools-basic-web-plugin";
import { Flow } from "@player-ui/types";
import { useEffect } from "react";
import { ErrorBoundary, useErrorBoundary } from "react-error-boundary";

const flow: Flow = {
  id: "flow",
  views: [
    {
      id: "view-1",
      type: "text",
      value: "example - {{foo.bar}}",
    },
  ],
  data: {
    foo: {
      bar: "test1",
      fuz: "test2",
    },
  },
  navigation: {
    BEGIN: "FLOW_1",
    FLOW_1: {
      startState: "VIEW_1",
      VIEW_1: {
        state_type: "VIEW",
        ref: "view-1",
        transitions: {},
      },
    },
  },
};

// Add the plugins to test here:
const testingPlugins: ReactPlayerOptions["plugins"] = [
  new BasicWevDevtoolsPlugin() as unknown as ReactPlayerPlugin,
];

const config: ReactPlayerOptions = {
  plugins: [
    new ReferenceAssetsPlugin() as unknown as ReactPlayerPlugin,
    ...testingPlugins,
  ],
};

const fallbackRender: ErrorBoundary["props"]["fallbackRender"] = ({
  error,
}) => {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre style={{ color: "red" }}>{error.message}</pre>
    </div>
  );
};

const Player = () => {
  const { reactPlayer } = useReactPlayer(config);
  const { showBoundary } = useErrorBoundary();

  useEffect(() => {
    try {
      reactPlayer.start(flow);
    } catch (e) {
      showBoundary(e);
    }
  }, [reactPlayer, showBoundary]);

  return <reactPlayer.Component />;
};

const App = () => {
  return (
    <ErrorBoundary fallbackRender={fallbackRender}>
      <Player />
    </ErrorBoundary>
  );
};

export default App;
