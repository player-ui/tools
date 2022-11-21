/* eslint-disable no-restricted-syntax */
import { simpleTransformGenerator, XLRSDK } from '@player-tools/xlr-sdk';
import type {
  ArrayType,
  NamedType,
  NodeType,
  ObjectType,
} from '@player-tools/xlr';
import { computeEffectiveObject } from '@player-tools/xlr-utils';
import type { ASTNode } from '../parser';
import { mapFlowStateToType } from '../utils';
import { PlayerXLRRegistry } from './registry';

export interface XLRContext {
  /** The name of the XLR at the provided position */
  name: string;

  /** The position(s) in the XLR at the specified node */
  nodes: Array<NodeType>;

  /** The nearest objects(s) to the specified node */
  nearestObjects: Array<ObjectType>;
}

/**
 * XLRs Manager for
 */
export class XLRService {
  private baseTypes = [
    'asset',
    'view',
    'flow',
    'content',
    'navigation',
    'state',
  ];

  public XLRSDK: XLRSDK;

  constructor() {
    this.XLRSDK = new XLRSDK(new PlayerXLRRegistry());
  }

  private walker(
    n: ASTNode,
    path: ASTNode[]
  ):
    | {
        /** name of type */
        name: string;

        /** path to get there from n */
        path: ASTNode[];
      }
    | undefined {
    if (this.baseTypes.indexOf(n.type) > -1) {
      if (n.type === 'asset') {
        const name = this.XLRSDK.hasType(n.assetType?.valueNode?.value ?? '')
          ? (n.assetType?.valueNode?.value as string)
          : 'Asset';
        return {
          name,
          path,
        };
      }

      if (n.type === 'view') {
        const name = this.XLRSDK.hasType(n.viewType?.valueNode?.value ?? '')
          ? (n.viewType?.valueNode?.value as string)
          : 'View';
        return { name, path };
      }

      if (n.type === 'state') {
        if (n.stateType?.valueNode?.value) {
          const flowStateType = mapFlowStateToType(
            n.stateType?.valueNode?.value
          );
          if (flowStateType) {
            return { name: flowStateType, path };
          }
        }
      }

      if (n.type === 'content') {
        return { name: 'Flow', path };
      }

      if (n.type === 'flow') {
        return { name: 'NavigationFlow', path };
      }

      if (n.type === 'navigation') {
        return { name: 'Navigation', path };
      }
    }

    if (n.parent) {
      path.push(n.parent);
      return this.walker(n.parent, path);
    }

    return undefined;
  }

  public getTypeInfoAtPosition(
    node: ASTNode | undefined
  ): XLRContext | undefined {
    if (!node) return;

    const pointer = node;
    const xlrInfo = this.walker(pointer, []);

    // bail if we can't figure out the type or don't have it
    if (!xlrInfo) return;

    const activeNode = this.XLRSDK.getType(xlrInfo.name);
    if (!activeNode) return;

    let nearestObjectTypes = [activeNode as ObjectType];
    let pointers = [];

    if (activeNode.type === 'and') {
      pointers = activeNode.and;
    } else if (activeNode.type === 'or') {
      pointers = activeNode.or;
    } else {
      pointers = [activeNode];
    }

    for (const pathSegment of xlrInfo.path.reverse()) {
      const newPointers: NodeType[] = [];

      for (let nodePointer of pointers) {
        let newNode;

        if (nodePointer.type === 'ref') {
          if (this.XLRSDK.hasType(nodePointer.ref)) {
            nodePointer = this.XLRSDK.getType(nodePointer.ref) as ObjectType;
          } else {
            continue;
          }
        }

        if (pathSegment.type === 'property' && nodePointer.type === 'object') {
          if (nodePointer?.properties[pathSegment.keyNode.value]) {
            newNode = nodePointer?.properties[pathSegment.keyNode.value]?.node;
          } else if (nodePointer?.additionalProperties) {
            // search through additional properties types
            const adNode = nodePointer?.additionalProperties;
            if (typeof adNode !== 'boolean') {
              newNode = adNode;
            }
          }
        } else if (
          pathSegment.type === 'object' ||
          this.baseTypes.indexOf(pathSegment.type) !== -1
        ) {
          newNode = nodePointer;
        } else if (pathSegment.type === 'array') {
          newNode = (nodePointer as ArrayType).elementType;
        }

        if (!newNode) {
          continue;
        } else if (newNode.type === 'or') {
          newPointers.push(...newNode.or);
        } else if (newNode.type === 'and') {
          newPointers.push(...newNode.and);
        } else if (newNode.type === 'ref' && this.XLRSDK.hasType(newNode.ref)) {
          newPointers.push(this.XLRSDK.getType(newNode.ref) as ObjectType);
        } else {
          newPointers.push(newNode);
        }
      }

      if (newPointers.filter((n) => n).length === 0) {
        break;
      }

      const newObjectTypes = newPointers.filter(
        (n) => n.type === 'object'
      ) as ObjectType[];
      if (newObjectTypes.length > 0) {
        nearestObjectTypes = newObjectTypes;
      }

      pointers = newPointers;
    }

    return {
      name: xlrInfo.name,
      nodes: pointers,
      nearestObjects: nearestObjectTypes,
    };
  }
}
