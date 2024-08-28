import {
  ReactPlayerPlugin,
  useReactPlayer,
} from "@player-ui/react";
import { ReferenceAssetsPlugin } from "@player-ui/reference-assets-plugin-react";
import { BasicWevDevtoolsPlugin } from "@player-tools/devtools-basic-web-plugin";
import { ProfilerPlugin } from "@player-tools/devtools-profiler-web-plugin";
import { useEffect } from "react";
import { ErrorBoundary, useErrorBoundary } from "react-error-boundary";
import flow from "./flow.json";
import flow2 from "./flow2.json";

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
  const id = "player1";
  const { reactPlayer } = useReactPlayer({
    plugins: [
      new ReferenceAssetsPlugin() as unknown as ReactPlayerPlugin,
      new BasicWevDevtoolsPlugin(id) as unknown as ReactPlayerPlugin,
      new ProfilerPlugin(id) as unknown as ReactPlayerPlugin,
    ],
  });
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

const Player2 = () => {
  const id = "player2";
  const { reactPlayer } = useReactPlayer({
    plugins: [
      new ReferenceAssetsPlugin() as unknown as ReactPlayerPlugin,
      new BasicWevDevtoolsPlugin(id) as unknown as ReactPlayerPlugin,
      new ProfilerPlugin(id) as unknown as ReactPlayerPlugin,
    ],
  });
  const { showBoundary } = useErrorBoundary();

  useEffect(() => {
    try {
      reactPlayer.start(flow2);
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
      <Player2 />
    </ErrorBoundary>
  );
};

export default App;
