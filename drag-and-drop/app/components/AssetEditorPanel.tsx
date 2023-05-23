/* eslint-disable react/no-array-index-key */
import React from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  Input,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Radio,
  RadioGroup,
  Stack,
  Text,
  Select,
  StackDivider,
  VStack,
} from '@chakra-ui/react';
import type { NodeType, ObjectType } from '@player-tools/xlr';
import type { Asset } from '@player-ui/types';
import { UUIDSymbol } from '@player-tools/dnd-lib';
import { useController, useProperties } from '../utils/context';

export interface AssetEditorPanelProps {
  /** Current authored Asset */
  asset: Asset;
  /** Backing XLR Asset */
  type: ObjectType;
  /** Function to propagate updates with */
  onUpdate: (path: Array<string | number>, value: any) => void;
}

export interface ConstantPropertyBoxProps {
  /** The constant value to render */
  value: string | boolean | number;
}

export interface PropertyBoxProps {
  /** Backing XLR type */
  type: NodeType;
  /** Portion of an authored Asset */
  asset?: unknown;
  /** Is the property required */
  required?: boolean;
  /** The name of the parent property being rendered */
  path?: Array<string | number>;
  /** Should a title be displayed for the rendered element */
  title?: boolean;
  /** Function to propagate updates with */
  onUpdate: (path: Array<string | number>, value: any) => void;
}

/**
 * Renders a constant value of the type
 */
const ConstantPropertyBox = (props) => {
  return <Input isDisabled value={props.value} />;
};

/**
 *
 */
const AvailableAssetsDropDown = (props) => {
  const { controller } = useController();
  const availableAssets =
    controller?.getAvailableAssets().filter((c) => c.capability === 'Assets') ??
    [];

  return (
    <Select
      placeholder="Select An Asset to Insert"
      onChange={(event) => {
        console.log(`Dropping a ${event.target.value}`);
        const assetToDrop = availableAssets.find(
          (asset) => asset.assetName === event.target.value
        );
        if (assetToDrop) {
          controller.placeAsset(
            props.dropTargetSymbol,
            assetToDrop,
            controller.getAssetDetails(assetToDrop.assetName)
          );
        }
      }}
    >
      {availableAssets.map((asset) => {
        return <option key={asset.assetName}>{asset.assetName}</option>;
      })}
    </Select>
  );
};

/**
 *
 */
const AssetLink = (props) => {
  const properties = useProperties();

  return (
    <Button
      colorScheme="yellow"
      onClick={(event) => {
        properties.setDisplayedAssetID(props.asset[UUIDSymbol]);
      }}
    >
      {props.identifier.assetName}
    </Button>
  );
};

/**
 *
 */
export const PropertyBox = (props: PropertyBoxProps) => {
  const {
    asset,
    path = [],
    type: node,
    title = true,
    required = false,
  } = props;

  let renderedComponent;

  if (node.type === 'ref' && node.ref.includes('AssetWrapper')) {
    if ((asset as any)?.asset.value) {
      renderedComponent = (
        <AssetLink
          asset={(asset as any)?.asset.value.asset}
          identifier={(asset as any)?.asset.value.identifier}
        />
      );
    } else {
      renderedComponent = (
        <AvailableAssetsDropDown
          dropTargetSymbol={(asset as any)?.asset?.[UUIDSymbol]}
        />
      );
    }
  } else if (
    (node.type === 'string' ||
      node.type === 'number' ||
      node.type === 'boolean') &&
    node.const
  ) {
    renderedComponent = (
      <ConstantPropertyBox value={node.const} property={path} />
    );
  } else if (
    node.type === 'string' ||
    (node.type === 'ref' &&
      (node.ref === 'Expression' || node.ref === 'Binding'))
  ) {
    renderedComponent = (
      <Input
        value={(asset as string) ?? ''}
        isRequired={required}
        placeholder={node.type === 'ref' ? `some ${node.ref}` : undefined}
        onChange={(event) => {
          props.onUpdate(path, event.target.value);
        }}
      />
    );
  } else if (node.type === 'number') {
    renderedComponent = (
      <NumberInput value={(asset as number) ?? 0} isRequired={required}>
        <NumberInputField />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
    );
  } else if (node.type === 'boolean') {
    renderedComponent = (
      <div>
        <RadioGroup value={props.asset ? '1' : '0'}>
          <Stack direction="row">
            <Radio value="1">True</Radio>
            <Radio value="0">False</Radio>
          </Stack>
        </RadioGroup>
      </div>
    );
  } else if (node.type === 'object') {
    const elements = Object.keys(node.properties).map((property) => {
      const { required: requiredProperty, node: propertyNode } =
        node.properties[property];
      return (
        <PropertyBox
          key={property}
          asset={props.asset?.[property] ?? undefined}
          type={propertyNode}
          required={requiredProperty}
          path={[...path, property]}
          onUpdate={props.onUpdate}
        />
      );
    });

    const filteredChildren = React.Children.toArray(elements);

    renderedComponent = (
      <Card>
        <CardBody>
          <VStack
            spacing={4}
            align="stretch"
            divider={<StackDivider borderColor="gray.600" />}
          >
            {filteredChildren}
          </VStack>
        </CardBody>
      </Card>
    );
  } else if (node.type === 'or') {
    renderedComponent = (
      <VStack spacing={4} align="stretch">
        {node.or.map((element, index) => {
          return (
            <Box key={index}>
              {index !== 0 && <Text as="b">or</Text>}
              <PropertyBox
                key={index}
                asset={props.asset}
                type={element}
                path={path}
                title={false}
                onUpdate={props.onUpdate}
              />
            </Box>
          );
        })}
      </VStack>
    );
  }

  // Catch unimplemented form controls during development
  const parentProperty = path[path.length - 1];
  return (
    <VStack spacing={4} align="stretch">
      {title && <Text as="b">{parentProperty}</Text>}
      {renderedComponent}
    </VStack>
  );
};
