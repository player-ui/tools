import React from 'react';
import {
  ChakraProvider,
  Box,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Flex,
  Text,
  CardFooter,
  Button,
  AccordionButton,
  AccordionItem,
  Accordion,
  AccordionIcon,
  AccordionPanel,
  VStack,
} from '@chakra-ui/react';
import { setIn } from 'timm';
import type {
  DragAndDropControllerOptions,
  ExtensionProviderAssetIdentifier,
  TransformedDropTargetAssetType,
} from '@player-tools/dnd-lib';
import { Asset } from '@player-ui/react-asset';
import type { Asset as AssetType } from '@player-ui/types';
import {
  DragAndDropController,
  useDroppableAsset,
  useDraggableAsset,
} from '@player-tools/dnd-lib';
import { ReferenceAssetsPlugin } from '@player-ui/reference-assets-plugin-react';
import type { ObjectType, TSManifest } from '@player-tools/xlr';
import pluginManifest from '@player-tools/static-xlrs/static_xlrs/plugin/xlr/manifest';
import typesManifest from '@player-tools/static-xlrs/static_xlrs/core/xlr/manifest';
import { AssetEditorPanel } from './components/AssetEditorPanel';

const PropertiesContext = React.createContext<{
  /**
   * Current Asset thats selected
   */
  displayedAssetID?: string;
  /**
   * Sets `displayedAssetID`
   */
  setDisplayedAssetID: (id: string) => void;
}>({
  setDisplayedAssetID: () => {},
});

/**
 * Component that indicates that an Asset can be placed at this location
 */
const AssetDropTarget = (props: TransformedDropTargetAssetType) => {
  const [{ isOver }, drop] = useDroppableAsset(props);
  const propContext = React.useContext(PropertiesContext);

  if (!props.value && !props.context) {
    return (
      <Box
        ref={drop}
        style={{ border: '1px solid red' }}
        height="10em"
        width="100%"
        textAlign="center"
      >
        <Text>Place a component to start designing your screen.</Text>
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
          propContext.setDisplayedAssetID(props.id);
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

/**
 * Component that can be dropped onto the canvas to add an Asst/View
 */
const DroppableAsset = (props: ExtensionProviderAssetIdentifier) => {
  const [, ref] = useDraggableAsset(props) ?? [];
  return (
    <Box ref={ref}>
      <Button colorScheme="blue">{props.name}</Button>
    </Box>
  );
};

export interface CapabilityPanelProps {
  /** Title to show in the Accordion Item */
  displayName: string;

  /** Capabilities to render droppable items for */
  capabilities: ExtensionProviderAssetIdentifier[];
}

/**
 *
 */
export const CapabilityPanel = (props: CapabilityPanelProps) => {
  return (
    <AccordionItem>
      <AccordionButton>
        <Box as="span" flex="1" textAlign="left">
          {props.displayName}
        </Box>
        <AccordionIcon />
      </AccordionButton>
      <AccordionPanel pb={4}>
        <VStack spacing="24px" align="start">
          {props.capabilities.length > 0 ? (
            props.capabilities.map((asset) => {
              return (
                <Box key={`${asset.pluginName} - ${asset.name}`}>
                  <DroppableAsset {...asset} />
                </Box>
              );
            })
          ) : (
            <Text> No Components Loaded </Text>
          )}
        </VStack>
      </AccordionPanel>
    </AccordionItem>
  );
};

/**
 * Left panel for selecting Assets/Views
 */
const AssetSelectorPanel = () => {
  const availableComponents = controller.getAvailableAssets();
  const assets = availableComponents.filter((c) => c.capability === 'Assets');
  const views = availableComponents.filter((c) => c.capability === 'Views');

  return (
    <Card>
      <CardHeader>
        <Heading>Available Components</Heading>
      </CardHeader>
      <CardBody>
        <Accordion>
          <CapabilityPanel displayName="Views" capabilities={views} />
          <CapabilityPanel displayName="Assets" capabilities={assets} />
        </Accordion>
      </CardBody>
    </Card>
  );
};

/**
 * Right panel for editing a dropped Asset/View
 */
const AssetDetailsPanel = () => {
  const propContext = React.useContext(PropertiesContext);
  const [modifiedAsset, setModifiedAsset] = React.useState<
    AssetType | undefined
  >(undefined);

  if (!propContext.displayedAssetID) {
    return (
      <Box>
        <Heading>Properties</Heading>
        <Text>Select an asset to begin editing</Text>
      </Box>
    );
  }

  const { asset, type } = controller.getAsset(propContext.displayedAssetID);

  /**
   * Updates the selected asset thats stored as a temporary value
   */
  const updateObject = (path: Array<string | number>, value: any) => {
    setModifiedAsset(setIn(modifiedAsset ?? asset, path, value) as AssetType);
  };

  return (
    <Card>
      <CardHeader>
        <Heading>Properties for {type.name}</Heading>
      </CardHeader>
      <CardBody>
        <AssetEditorPanel
          asset={modifiedAsset ?? asset}
          type={type}
          onUpdate={updateObject}
        />
      </CardBody>
      <CardFooter>
        <Button
          colorScheme="blue"
          onClick={(event) => {
            console.log(modifiedAsset);
            controller.updateAsset(propContext.displayedAssetID, modifiedAsset);
          }}
        >
          Update Component
        </Button>
      </CardFooter>
    </Card>
  );
};

/**
 * Main Page
 */
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
            <Box flex={1} margin="20px">
              <AssetSelectorPanel />
            </Box>
            <Box flexGrow={1} margin="20px">
              <controller.Canvas />
            </Box>
            <Box flex={1} margin="20px">
              <AssetDetailsPanel />
            </Box>
          </Flex>
        </controller.Context>
      </ChakraProvider>
    </PropertiesContext.Provider>
  );
};

export default App;
