import {
  ReactPlayerOptions,
  ReactPlayerPlugin,
  useReactPlayer,
} from "@player-ui/react";
import { ReferenceAssetsPlugin } from "@player-ui/reference-assets-plugin-react";
import { BasicWevDevtoolsPlugin } from "@player-tools/devtools-basic-web-plugin";
import { useEffect } from "react";
import { ErrorBoundary, useErrorBoundary } from "react-error-boundary";
import flow from "./flow.json";

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
