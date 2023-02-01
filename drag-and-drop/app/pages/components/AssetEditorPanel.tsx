import {
  Box,
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
} from '@chakra-ui/react';
import type { NodeType, ObjectType } from '@player-tools/xlr';
import type { Asset } from '@player-ui/types';
import React from 'react';

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
  path: Array<string | number>;
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
const PropertyBox = (props: PropertyBoxProps) => {
  const { asset, path, type: node, title = true } = props;
  const required = props.required ?? false;

  let renderedComponent;

  if (
    (node.type === 'ref' && node.ref.includes('AssetWrapper')) ||
    (node.type === 'array' &&
      node.elementType.type === 'ref' &&
      node.elementType.ref.includes('AssetWrapper'))
  ) {
    return null;
  }

  if (
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
          <Stack spacing="4">{filteredChildren}</Stack>
        </CardBody>
      </Card>
    );
  } else if (node.type === 'or') {
    renderedComponent = (
      <Box>
        {node.or.map((element, index) => {
          return (
            <PropertyBox
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              asset={props.asset}
              type={element}
              path={path}
              title={false}
              onUpdate={props.onUpdate}
            />
          );
        })}
      </Box>
    );
  }

  // Catch unimplemented form controls during development
  const parentProperty = path[path.length - 1];
  return (
    <div>
      {title && <Text as="b">{parentProperty}</Text>}
      {renderedComponent}
    </div>
  );
};

/**
 * A top level panel for editing an Asset
 */
export const AssetEditorPanel = (props: AssetEditorPanelProps) => {
  return (
    <PropertyBox
      type={props.type}
      asset={props.asset}
      path={[]}
      onUpdate={props.onUpdate}
    />
  );
};
