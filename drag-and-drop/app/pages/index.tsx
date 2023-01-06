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
  Modal,
  ModalContent,
  ModalOverlay,
  ButtonGroup,
  Table,
  TableCaption,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
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
import { covertXLRtoAssetDoc } from './utils/converters';

const PropertiesContext = React.createContext<{
  /**
   * Current Asset thats selected in the right panel
   * will be either an asset ID or a XLR type
   */
  displayedAssetID?: string;
  /**
   * Sets `displayedAssetID`
   */
  setDisplayedAssetID: (id: string) => void;

  /**
   * If the export modal is open
   */
  exportOpen: boolean;

  /** Sets `exportOpen` */
  setExportOpen: (state: boolean) => void;

  /** If the right panel is docs or edit */
  rightPanelState: 'docs' | 'edit';

  /** Sets `rightPanelState` */
  setRightPanelState: (state: 'docs' | 'edit') => void;
}>({
  setDisplayedAssetID: () => {},
  setExportOpen: () => {},
  setRightPanelState: () => {},
  exportOpen: false,
  rightPanelState: 'edit',
});

const ControllerContext = React.createContext<
  | {
      /** */
      controller: DragAndDropController;
    }
  | undefined
>(undefined);

/**
 *
 */
function useController() {
  return React.useContext(ControllerContext);
}

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
          propContext.setRightPanelState('edit');
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

/**
 * Component that can be dropped onto the canvas to add an Asst/View
 */
const DroppableAsset = (props: ExtensionProviderAssetIdentifier) => {
  const { setRightPanelState, setDisplayedAssetID } =
    React.useContext(PropertiesContext);
  const [, ref] = useDraggableAsset(props) ?? [];
  return (
    <Box ref={ref}>
      <Button
        colorScheme="blue"
        onClick={(event) => {
          setRightPanelState('docs');
          setDisplayedAssetID(props.name);
        }}
      >
        {props.name}
      </Button>
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
  const context = React.useContext(PropertiesContext);
  const { controller } = useController() ?? {};
  const availableComponents = controller?.getAvailableAssets() ?? [];
  const assets = availableComponents.filter((c) => c.capability === 'Assets');
  const views = availableComponents.filter((c) => c.capability === 'Views');

  return (
    <Card>
      <CardHeader>
        <Heading>Available Components</Heading>
      </CardHeader>
      <CardBody>
        <Accordion allowToggle>
          <CapabilityPanel displayName="Views" capabilities={views} />
          <CapabilityPanel displayName="Assets" capabilities={assets} />
          <AccordionItem>
            <AccordionButton>
              <Box as="span" flex="1" textAlign="left">
                Options
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4}>
              <Button
                colorScheme="green"
                onClick={(event) => {
                  context.setExportOpen(true);
                }}
              >
                Export View
              </Button>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </CardBody>
    </Card>
  );
};

/**
 * Right panel for editing a dropped Asset/View
 */
const AssetDetailsPanel = () => {
  const { controller } = useController() ?? {};
  const propContext = React.useContext(PropertiesContext);
  const [modifiedAsset, setModifiedAsset] = React.useState<
    AssetType | undefined
  >(undefined);

  if (!controller) {
    return null;
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
        <ButtonGroup spacing="10">
          <Button
            colorScheme="blue"
            onClick={(event) => {
              controller.updateAsset(
                propContext.displayedAssetID,
                modifiedAsset
              );
            }}
          >
            Update Component
          </Button>
          <Button
            colorScheme="red"
            onClick={(event) => {
              controller.removeAsset(propContext.displayedAssetID);
              propContext.setDisplayedAssetID(undefined);
            }}
          >
            Delete Component
          </Button>
        </ButtonGroup>
      </CardFooter>
    </Card>
  );
};

/**
 * Main editing canvas
 */
const Canvas = () => {
  const { controller } = useController() ?? {};
  const [render, setRender] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (controller) {
      setRender(true);
    }
  }, [controller]);

  if (!render) {
    return null;
  }

  return <controller.Canvas />;
};

interface PendingPropertyResolution {
  /** */
  asset: AssetType;
  /** */
  type: ObjectType;

  /** */
  onComplete: (asset: AssetType) => void;
}

/** Modal for filling in required properties on a dropped Asset */
const PropertyResolver = (props: PendingPropertyResolution) => {
  const [modifiedAsset, setModifiedAsset] = React.useState<AssetType>(
    props.asset
  );

  /** */
  const updateObject = (path: Array<string | number>, value: any) => {
    setModifiedAsset(setIn(modifiedAsset, path, value) as AssetType);
  };

  return (
    <Modal isOpen size="lg" onClose={() => {}}>
      <ModalOverlay />
      <ModalContent>
        <Card>
          <CardHeader>
            <Heading>Resolve Required Properties</Heading>
          </CardHeader>
          <CardBody>
            <AssetEditorPanel
              asset={modifiedAsset}
              type={props.type}
              onUpdate={updateObject}
            />
          </CardBody>
          <CardFooter>
            <Button
              colorScheme="blue"
              onClick={(event) => {
                props.onComplete(modifiedAsset);
              }}
            >
              Place Component
            </Button>
          </CardFooter>
        </Card>
      </ModalContent>
    </Modal>
  );
};

/** Modal for showing the JSON version of the created flow */
const ContentExportModal = () => {
  const context = React.useContext(PropertiesContext);
  const { controller } = useController() ?? {};
  const content = JSON.stringify(controller.exportView());
  return (
    <Modal isOpen size="xlg" onClose={() => {}}>
      <ModalOverlay />
      <ModalContent>
        <Card>
          <CardHeader>
            <Heading>Player Content</Heading>
          </CardHeader>
          <CardBody>
            <SyntaxHighlighter language="json">{content}</SyntaxHighlighter>
          </CardBody>
          <CardFooter>
            <Button
              colorScheme="red"
              onClick={(event) => {
                context.setExportOpen(false);
              }}
            >
              Done
            </Button>
          </CardFooter>
        </Card>
      </ModalContent>
    </Modal>
  );
};

/**
 * Panel to show the full docs for the selected asset
 */
const AssetDocsPanel = () => {
  const { displayedAssetID } = React.useContext(PropertiesContext);
  const { controller } = useController() ?? {};
  const type = controller.getAssetDetails(displayedAssetID);
  const docs = covertXLRtoAssetDoc(type);
  return (
    <Card>
      <CardHeader>
        <Heading>Docs for {type.name}</Heading>
        <Text fontSize="xl"> {docs.description}</Text>
      </CardHeader>
      <CardBody>
        <TableContainer>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Required</Th>
                <Th>Description</Th>
                <Th>Type</Th>
              </Tr>
            </Thead>
            <Tbody>
              {Object.keys(docs.props).map((prop) => {
                const propDetails = docs.props[prop];
                return (
                  <Tr key={prop}>
                    <Td>{prop}</Td>
                    <Td>{propDetails.required ? 'Yes' : 'No'}</Td>
                    <Td>{propDetails.description}</Td>
                    <Td>
                      {propDetails.type.value
                        ? `"${propDetails.type.value}`
                        : propDetails.type.name}
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </TableContainer>
      </CardBody>
    </Card>
  );
};

/**
 * Asset to switch what is shown on the right panel
 */
const RightPanel = () => {
  const { rightPanelState, displayedAssetID } =
    React.useContext(PropertiesContext);

  if (rightPanelState === 'edit') {
    if (displayedAssetID) {
      return <AssetDetailsPanel />;
    }

    return (
      <Box>
        <Heading>Properties</Heading>
        <Text>Select an asset to begin editing</Text>
      </Box>
    );
  }

  return <AssetDocsPanel />;
};

/**
 * Main Page
 */
const App = () => {
  const [displayedAssetID, setDisplayedAssetID] = React.useState<string>();
  const [exportOpen, setExportOpen] = React.useState<boolean>(false);
  const [rightPanelState, setRightPanelState] = React.useState<'docs' | 'edit'>(
    'edit'
  );
  const [pendingPropertyResolutions, setPendingPropertyResolutions] =
    React.useState<PendingPropertyResolution | undefined>(undefined);

  const controllerState = React.useMemo(() => {
    const config: DragAndDropControllerOptions = {
      Component: AssetDropTarget,
      types: typesManifest as TSManifest,
      extensions: [
        {
          plugin: ReferenceAssetsPlugin,
          manifest: pluginManifest as TSManifest,
        },
      ],
      async resolveRequiredProperties(
        asset: AssetType<string>,
        type: ObjectType
      ): Promise<AssetType<string>> {
        const pending: PendingPropertyResolution = {
          asset,
          type,
          onComplete: () => asset,
        };

        const prom = new Promise<AssetType<string>>((resolve) => {
          pending.onComplete = resolve;
        });

        setPendingPropertyResolutions(pending);
        return prom;
      },
    };

    return {
      controller: new DragAndDropController(config),
    };
  }, [setPendingPropertyResolutions]);

  const { controller } = controllerState;

  return (
    <ControllerContext.Provider value={controllerState}>
      <PropertiesContext.Provider
        value={React.useMemo(
          () => ({
            displayedAssetID,
            setDisplayedAssetID,
            exportOpen,
            setExportOpen,
            rightPanelState,
            setRightPanelState,
          }),
          [displayedAssetID, exportOpen, rightPanelState]
        )}
      >
        <ChakraProvider>
          <controller.Context>
            <Flex justifyContent="space-between" flexDir="row">
              <Box flex={1} margin="20px">
                <AssetSelectorPanel />
              </Box>
              <Box flexGrow={1} margin="20px">
                <Canvas />
              </Box>
              <Box flex={1} margin="20px">
                <RightPanel />
              </Box>
            </Flex>
            {pendingPropertyResolutions && (
              <PropertyResolver
                {...pendingPropertyResolutions}
                onComplete={(asset) => {
                  setPendingPropertyResolutions(undefined);
                  return pendingPropertyResolutions.onComplete(asset);
                }}
              />
            )}
            {exportOpen && <ContentExportModal />}
          </controller.Context>
        </ChakraProvider>
      </PropertiesContext.Provider>
    </ControllerContext.Provider>
  );
};

export default App;
