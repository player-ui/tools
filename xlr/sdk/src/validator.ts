import type { Node } from 'jsonc-parser';
import type {
  ArrayType,
  NamedType,
  NodeType,
  ObjectType,
  OrType,
  PrimitiveTypes,
  RefType,
  TemplateLiteralType,
} from '@player-tools/xlr';
import {
  makePropertyMap,
  resolveConditional,
  isPrimitiveTypeNode,
  resolveReferenceNode,
  computeEffectiveObject,
} from '@player-tools/xlr-utils';
import type { ValidationError } from './types';

/**
 * Validator for XLRs on JSON Nodes
 */
export class XLRValidator {
  private resolveType: (id: string) => NamedType<NodeType> | undefined;
  private regexCache: Map<string, RegExp>;

  constructor(resolveType: (id: string) => NamedType<NodeType> | undefined) {
    this.resolveType = resolveType;
    this.regexCache = new Map();
  }

  /** Main entrypoint for validation */
  public validateType(
    rootNode: Node,
    xlrNode: NodeType
  ): Array<ValidationError> {
    const validationIssues = new Array<ValidationError>();
    if (xlrNode.type === 'object') {
      if (rootNode.type === 'object') {
        validationIssues.push(...this.validateObject(xlrNode, rootNode));
      } else {
        validationIssues.push({
          type: 'type',
          node: rootNode,
          message: `Expected an object but got an '${rootNode.type}'`,
        });
      }
    } else if (xlrNode.type === 'array') {
      if (rootNode.type === 'array') {
        validationIssues.push(...this.validateArray(rootNode, xlrNode));
      } else {
        validationIssues.push({
          type: 'type',
          node: rootNode,
          message: `Expected an array but got an '${rootNode.type}'`,
        });
      }
    } else if (xlrNode.type === 'template') {
      const error = this.validateTemplate(rootNode, xlrNode);
      if (error) {
        validationIssues.push(error);
      }
    } else if (xlrNode.type === 'or') {
      // eslint-disable-next-line no-restricted-syntax
      for (const potentialType of xlrNode.or) {
        const potentialErrors = this.validateType(rootNode, potentialType);
        if (potentialErrors.length === 0) {
          return validationIssues;
        }
      }

      validationIssues.push({
        type: 'value',
        node: rootNode,
        message: `Does not match any of the expected types for type: '${xlrNode.name}'`,
      });
    } else if (xlrNode.type === 'and') {
      const effectiveType = {
        ...this.computeIntersectionType(xlrNode.and),
        ...(xlrNode.name ? { name: xlrNode.name } : {}),
      };
      validationIssues.push(...this.validateType(rootNode, effectiveType));
    } else if (xlrNode.type === 'record') {
      rootNode.children?.forEach((child) => {
        validationIssues.push(
          ...this.validateType(child.children?.[0] as Node, xlrNode.keyType)
        );
        validationIssues.push(
          ...this.validateType(child.children?.[1] as Node, xlrNode.valueType)
        );
      });
    } else if (xlrNode.type === 'ref') {
      const refType = this.getRefType(xlrNode);
      if (refType === undefined) {
        validationIssues.push({
          type: 'unknown',
          node: rootNode,
          message: `Type '${xlrNode.ref}' is not defined in provided bundles`,
        });
      } else {
        validationIssues.push(
          ...this.validateType(rootNode, refType as NamedType)
        );
      }
    } else if (isPrimitiveTypeNode(xlrNode)) {
      if (!this.validateLiteralType(xlrNode, rootNode)) {
        if (
          (xlrNode.type === 'string' ||
            xlrNode.type === 'number' ||
            xlrNode.type === 'boolean') &&
          xlrNode.const
        ) {
          validationIssues.push({
            type: 'type',
            node: rootNode.parent as Node,
            message: `Expected '${xlrNode.const}' but got '${rootNode.value}'`,
          });
        } else {
          validationIssues.push({
            type: 'type',
            node: rootNode.parent as Node,
            message: `Expected type '${xlrNode.type}' but got '${rootNode.type}'`,
          });
        }
      }
    } else if (xlrNode.type === 'conditional') {
      // Resolve RefNodes in check conditions if needed
      let { right, left } = xlrNode.check;

      if (right.type === 'ref') {
        right = this.getRefType(right);
      }

      if (left.type === 'ref') {
        left = this.getRefType(left);
      }

      const resolvedXLRNode = {
        ...xlrNode,
        check: {
          left,
          right,
        },
      };

      const resolvedConditional = resolveConditional(resolvedXLRNode);
      if (resolvedConditional === resolvedXLRNode) {
        throw Error(
          `Unable to resolve conditional type at runtime: ${xlrNode.name}`
        );
      }

      validationIssues.push(
        ...this.validateType(rootNode, resolvedConditional)
      );
    } else {
      throw Error(`Unknown type ${xlrNode.type}`);
    }

    return validationIssues;
  }

  private validateTemplate(
    node: Node,
    xlrNode: TemplateLiteralType
  ): ValidationError | undefined {
    if (node.type !== 'string') {
      return {
        type: 'type',
        node: node.parent as Node,
        message: `Expected type '${xlrNode.type}' but got '${typeof node}'`,
      };
    }

    const regex = this.getRegex(xlrNode.format);
    const valid = regex.exec(node.value);
    if (!valid) {
      return {
        type: 'value',
        node: node.parent as Node,
        message: `Does not match expected format: ${xlrNode.format}`,
      };
    }
  }

  private validateArray(rootNode: Node, xlrNode: ArrayType) {
    const issues: Array<ValidationError> = [];
    rootNode.children?.forEach((child) =>
      issues.push(...this.validateType(child, xlrNode.elementType))
    );
    return issues;
  }

  private validateObject(xlrNode: ObjectType, node: Node) {
    const issues: Array<ValidationError> = [];
    const objectProps = makePropertyMap(node);

    // eslint-disable-next-line guard-for-in, no-restricted-syntax
    for (const prop in xlrNode.properties) {
      const expectedType = xlrNode.properties[prop];
      const valueNode = objectProps.get(prop);
      if (expectedType.required && valueNode === undefined) {
        issues.push({
          type: 'missing',
          node,
          message: `Property '${prop}' missing from type '${xlrNode.name}'`,
        });
      }

      if (valueNode) {
        issues.push(
          ...this.validateType(valueNode, expectedType.node as NamedType)
        );
      }
    }

    // Check if unknown keys are allowed and if they are - do the violate the constraint
    const extraKeys = Array.from(objectProps.keys()).filter(
      (key) => xlrNode.properties[key] === undefined
    );
    if (xlrNode.additionalProperties === false && extraKeys.length > 0) {
      issues.push({
        type: 'value',
        node,
        message: `Unexpected properties on '${xlrNode.name}': ${extraKeys.join(
          ', '
        )}`,
      });
    } else {
      issues.push(
        ...extraKeys.flatMap((key) =>
          this.validateType(
            objectProps.get(key) as Node,
            xlrNode.additionalProperties as NodeType
          )
        )
      );
    }

    return issues;
  }

  private validateLiteralType(expectedType: PrimitiveTypes, literalType: Node) {
    switch (expectedType.type) {
      case 'boolean':
        if (expectedType.const) {
          return expectedType.const === literalType.value;
        }

        return typeof literalType.value === 'boolean';
      case 'number':
        if (expectedType.const) {
          return expectedType.const === literalType.value;
        }

        return typeof literalType.value === 'number';
      case 'string':
        if (expectedType.const) {
          return expectedType.const === literalType.value;
        }

        return typeof literalType.value === 'string';
      case 'null':
        return literalType.value === 'null';
      case 'never':
        return literalType === undefined;
      case 'any':
        return literalType !== undefined;
      case 'unknown':
        return literalType !== undefined;
      case 'undefined':
        return true;
      default:
        return false;
    }
  }

  private getRefType(ref: RefType): NodeType {
    let refName = ref.ref;
    if (refName.indexOf('<') > 0) {
      [refName] = refName.split('<');
    }

    const actualType = this.resolveType(refName);
    if (!actualType) {
      throw new Error(`Error: can't resolve type reference ${refName}`);
    }

    return resolveReferenceNode(ref, actualType);
  }

  private getRegex(expString: string): RegExp {
    if (this.regexCache.has(expString)) {
      return this.regexCache.get(expString) as RegExp;
    }

    const exp = new RegExp(expString);
    this.regexCache.set(expString, exp);
    return exp;
  }

  private computeIntersectionType(types: Array<NodeType>): ObjectType | OrType {
    let firstElement = types[0];
    let effectiveType: ObjectType | OrType;

    if (firstElement.type === 'ref') {
      firstElement = this.getRefType(firstElement);
    }

    if (firstElement.type === 'and') {
      effectiveType = this.computeIntersectionType(firstElement.and);
    } else if (firstElement.type === 'record') {
      effectiveType = {
        type: 'object',
        properties: {},
        additionalProperties: firstElement.valueType,
      };
    } else if (firstElement.type !== 'or' && firstElement.type !== 'object') {
      throw new Error(
        `Can't compute a union with a non-object type ${firstElement.type} (${firstElement.name})`
      );
    } else {
      effectiveType = firstElement;
    }

    types.slice(1).forEach((type) => {
      let typeToApply = type;

      if (typeToApply.type === 'record') {
        typeToApply = {
          type: 'object',
          properties: {},
          additionalProperties: typeToApply.valueType,
        };
      }

      if (type.type === 'ref') {
        typeToApply = this.getRefType(type);
      }

      if (typeToApply.type === 'and') {
        typeToApply = this.computeIntersectionType([type, effectiveType]);
      }

      if (typeToApply.type === 'object') {
        if (effectiveType.type === 'object') {
          effectiveType = computeEffectiveObject(effectiveType, typeToApply);
        } else {
          effectiveType = {
            ...effectiveType,
            or: effectiveType.or.map((y) =>
              this.computeIntersectionType([y, typeToApply])
            ),
          };
        }
      } else if (typeToApply.type === 'or') {
        if (effectiveType.type === 'object') {
          effectiveType = {
            ...typeToApply,
            or: typeToApply.or.map((y) =>
              this.computeIntersectionType([y, effectiveType])
            ),
          };
        } else {
          throw new Error('unimplemented operation or x or projection');
        }
      } else {
        throw new Error(
          `Can't compute a union with a non-object type ${typeToApply.type} (${typeToApply.name})`
        );
      }
    });

    return effectiveType;
  }
}
