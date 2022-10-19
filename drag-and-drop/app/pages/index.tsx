import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import type { DragAndDropControllerOptions } from '@player-tools/dnd-lib';
import { DragAndDropController } from '@player-tools/dnd-lib';
import { useDragAndDrop } from '@player-tools/dnd-lib';
import { ReferenceAssetsPlugin } from '@player-ui/reference-assets-plugin-react';
import manifest from '@player-tools/static-xlrs/static_xlrs/plugin/xlr/manifest';

const config: DragAndDropControllerOptions = {
  extensions: [
    {
      plugin: ReferenceAssetsPlugin,
      manifest: manifest as any,
    },
  ],
};

const controller = new DragAndDropController(config);

const App = () => {
  return (
    <ChakraProvider>
      <controller.Context>
        <div>
          <controller.Canvas />
        </div>
      </controller.Context>
    </ChakraProvider>
  );
};

export default App;
