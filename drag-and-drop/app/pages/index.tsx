import React from 'react';
import {
  ChakraProvider,
  Box,
  Heading,
  Flex,
  Tag,
  Text,
} from '@chakra-ui/react';
import type {
  DragAndDropControllerOptions,
  ExtensionProviderAssetIdentifier,
  TransformedDropTargetAssetType,
} from '@player-tools/dnd-lib';
import { Asset } from '@player-ui/react-asset';
import {
  DragAndDropController,
  useDroppableAsset,
  useDraggableAsset,
} from '@player-tools/dnd-lib';
import { ReferenceAssetsPlugin } from '@player-ui/reference-assets-plugin-react';
import type { TSManifest } from '@player-tools/xlr';
import pluginManifest from '@player-tools/static-xlrs/static_xlrs/plugin/xlr/manifest';
import typesManifest from '@player-tools/static-xlrs/static_xlrs/core/xlr/manifest';

const PropertiesContext = React.createContext<{
  displayedAssetID?: string;
  setDisplayedAssetID: (id: string) => void;
}>({
  setDisplayedAssetID: () => {},
});

const AssetDropTarget = (props: TransformedDropTargetAssetType) => {
  const [{ isOver }, drop] = useDroppableAsset(props);
  const propContext = React.useContext(PropertiesContext);

  if (!props.value && !props.context) {
    return (
      <Box ref={drop}>
        <span>Please Select an Asset</span>
      </Box>
    );
  }

  return (
    <Box
      ref={drop}
      style={{ border: isOver ? '1px solid red' : undefined }}
      _hover={{
        borderStyle: 'solid',
        borderWidth: '1px',
        borderColor: 'gray.300',
      }}
      onClick={(e) => {
        if (props.value) {
          propContext.setDisplayedAssetID(props.value.asset.id);
          e.stopPropagation();
        }
      }}
    >
      {props.value ? (
        <Asset {...props.value.asset} />
      ) : (
        <span>
          {props.context?.parent.name} - {props.context?.propertyName}
        </span>
      )}
    </Box>
  );
};

const config: DragAndDropControllerOptions = {
  Component: AssetDropTarget,
  types: typesManifest as TSManifest,
  extensions: [
    {
      plugin: ReferenceAssetsPlugin,
      manifest: pluginManifest as TSManifest,
    },
  ],
};

const controller = new DragAndDropController(config);

const DroppableAsset = (props: ExtensionProviderAssetIdentifier) => {
  const [, ref] = useDraggableAsset(props) ?? [];
  return (
    <Box ref={ref}>
      <Tag>{props.name}</Tag>
    </Box>
  );
};

const AssetSelectorPanel = () => {
  return (
    <Box>
      <Heading as="h2" size="md">
        Asset Selector Panel
      </Heading>

      {controller.getAvailableAssets().map((asset) => {
        return (
          <Box key={`${asset.pluginName} - ${asset.name}`}>
            <DroppableAsset {...asset} />
          </Box>
        );
      })}
    </Box>
  );
};

const AssetDetailsPanel = () => {
  const propContext = React.useContext(PropertiesContext);

  return (
    <Box>
      <Heading>Properties</Heading>

      <Text>{propContext.displayedAssetID ?? 'Select an asset'}</Text>
    </Box>
  );
};

const App = () => {
  const [displayedAssetID, setDisplayedAssetID] = React.useState<string>();

  return (
    <PropertiesContext.Provider
      value={{
        displayedAssetID,
        setDisplayedAssetID,
      }}
    >
      <ChakraProvider>
        <controller.Context>
          <Flex justifyContent="space-between" flexDir="row">
            <Box flex={1}>
              <AssetSelectorPanel />
            </Box>
            <Box flexGrow={1}>
              <controller.Canvas />
            </Box>
            <Box flex={1}>
              <AssetDetailsPanel />
            </Box>
          </Flex>
        </controller.Context>
      </ChakraProvider>
    </PropertiesContext.Provider>
  );
};

export default App;
