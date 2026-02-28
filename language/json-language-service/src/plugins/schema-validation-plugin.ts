import { DiagnosticSeverity } from "vscode-languageserver-types";
import type { PlayerLanguageService, PlayerLanguageServicePlugin } from "..";
import type { ValidationContext, ASTVisitor } from "../types";
import type { ContentASTNode, ObjectASTNode, StringASTNode } from "../parser";
import { getProperty } from "../utils";
import type { XLRSDK } from "@player-tools/xlr-sdk";
import { NamedType, ObjectType, RefType } from "@player-tools/xlr";
import { translateSeverity } from "./xlr-plugin";

function formatErrorMessage(message: string): string {
  return `Schema Validation Error: ${message}`;
}

/**
 * Validate that all claimed validations are registered and pass the correct props
 */
function validateSchemaValidations(
  validationNode: ObjectASTNode,
  sdk: XLRSDK,
  validationContext: ValidationContext,
) {
  const claimedValidator = getProperty(validationNode, "type");
  if (!claimedValidator) {
    validationContext.addViolation({
      node: validationNode,
      message: formatErrorMessage('Validation object missing "type" property'),
      severity: DiagnosticSeverity.Error,
    });
  } else if (claimedValidator.valueNode?.type !== "string") {
    validationContext.addViolation({
      node: claimedValidator.valueNode ?? validationNode,
      message: formatErrorMessage("Validation type must be a string"),
      severity: DiagnosticSeverity.Error,
    });
  } else {
    const validationXLR = sdk.getType(claimedValidator.valueNode.value, {
      getRawType: true,
    }) as NamedType<RefType>;
    if (!validationXLR) {
      validationContext.addViolation({
        node: validationNode,
        message: formatErrorMessage(
          `Validation Function ${claimedValidator} is not a registered validator`,
        ),
        severity: DiagnosticSeverity.Error,
      });
    } else {
      const valRef = sdk.getType("Validation.Reference", {
        getRawType: true,
      }) as NamedType<ObjectType> | undefined;
      if (valRef) {
        const validatorFunctionProps =
          (validationXLR.genericArguments?.[0] as ObjectType)?.properties ?? {};

        const valRefInstance = {
          ...valRef,
          properties: {
            ...valRef.properties,
            ...validatorFunctionProps,
          },
          additionalProperties: false,
        } as ObjectType;

        const validationIssues = sdk.validateByType(
          valRefInstance,
          validationNode.jsonNode,
        );
        validationIssues.forEach((issue) => {
          validationContext.addViolation({
            node: validationNode,
            message: formatErrorMessage(issue.message),
            severity: translateSeverity(issue.severity),
          });
        });
      } else {
        validationContext.addViolation({
          node: validationNode,
          message: formatErrorMessage(
            "Validation.Reference from @player-ui/types is not loaded into SDK",
          ),
          severity: DiagnosticSeverity.Error,
        });
      }
    }
  }
}

/**
 * Validate that the format function is registered and passes the correct props
 */
function validateSchemaFormat(
  formatNode: ObjectASTNode,
  sdk: XLRSDK,
  validationContext: ValidationContext,
) {
  const claimedFormatter = getProperty(formatNode, "type");
  if (!claimedFormatter) {
    validationContext.addViolation({
      node: formatNode,
      message: formatErrorMessage('Format object missing "type" property'),
      severity: DiagnosticSeverity.Error,
    });
  } else if (claimedFormatter.valueNode?.type !== "string") {
    validationContext.addViolation({
      node: claimedFormatter.valueNode ?? claimedFormatter,
      message: formatErrorMessage("Format type must be a string"),
      severity: DiagnosticSeverity.Error,
    });
  } else {
    const formatterXLR = sdk.getType(claimedFormatter.valueNode.value, {
      getRawType: true,
    }) as RefType;
    if (!formatterXLR) {
      validationContext.addViolation({
        node: formatNode,
        message: formatErrorMessage(
          `Formatter ${claimedFormatter} is not a registered formatter`,
        ),
        severity: DiagnosticSeverity.Error,
      });
    } else if (
      formatterXLR.genericArguments &&
      formatterXLR.genericArguments.length === 3
    ) {
      const otherArgsXLR = formatterXLR.genericArguments[2] as ObjectType;
      const validationIssues = sdk.validateByType(
        {
          ...otherArgsXLR,
          properties: {
            ...otherArgsXLR.properties,
            type: {
              required: true,
              node: {
                type: "string",
                const: claimedFormatter.valueNode.value,
              },
            },
          },
        },
        formatNode.jsonNode,
      );

      validationIssues.forEach((issue) => {
        validationContext.addViolation({
          node: formatNode,
          message: formatErrorMessage(issue.message),
          severity: translateSeverity(issue.severity),
        });
      });
    }
  }
}

/**
 * Collects all type names defined at the top level of the schema (ROOT and
 * any custom type names). Used to validate that "type" references either
 * point to a schema type or an XLR-loaded type.
 */
function getSchemaTypeNames(schemaObj: ObjectASTNode): Set<string> {
  const names = new Set<string>();
  for (const prop of schemaObj.properties) {
    const key = prop.keyNode?.value;
    if (typeof key === "string") {
      names.add(key);
    }
  }
  return names;
}

/**
 * Validates that a Schema.DataType object has the proper structure
 */
function validateDataTypeStructure(
  dataTypeNode: ObjectASTNode,
  claimedDataType: NamedType<ObjectType>,
  sdk: XLRSDK,
  validationContext: ValidationContext,
): void {
  // Basic Structural Tests
  const validationProp = getProperty(dataTypeNode, "validation");
  if (validationProp?.valueNode && validationProp.valueNode.type !== "array") {
    validationContext.addViolation({
      node: validationProp.valueNode,
      message: formatErrorMessage(
        'Schema.DataType "validation" must be an array.',
      ),
      severity: DiagnosticSeverity.Error,
    });
  } else if (validationProp?.valueNode) {
    validationProp.valueNode.children?.forEach((valRef) => {
      if (valRef && valRef.type === "object") {
        validateSchemaValidations(valRef, sdk, validationContext);
      } else {
        validationContext.addViolation({
          node: validationProp.valueNode ?? dataTypeNode,
          message: formatErrorMessage(
            'Schema.DataType "validation" must be an object.',
          ),
          severity: DiagnosticSeverity.Error,
        });
      }
    });
  }

  const formatProp = getProperty(dataTypeNode, "format");
  if (formatProp?.valueNode?.type === "object") {
    validateSchemaFormat(formatProp.valueNode, sdk, validationContext);
  } else {
    if (formatProp) {
      validationContext.addViolation({
        node: formatProp?.valueNode ?? dataTypeNode,
        message: formatErrorMessage(
          'Schema.DataType "format" must be an object.',
        ),
        severity: DiagnosticSeverity.Error,
      });
    }
  }

  // Check if default value conforms to the expected value
  const defaultNode = claimedDataType.properties["default"]?.node;
  const defaultProp = getProperty(dataTypeNode, "default");
  if (
    defaultNode &&
    defaultProp?.valueNode &&
    defaultProp.valueNode.type !== defaultNode.type
  ) {
    validationContext.addViolation({
      node: defaultProp.valueNode,
      message: formatErrorMessage(
        `Default value doesn't match the expected type of ${defaultNode.type} for type ${claimedDataType.name}`,
      ),
      severity: DiagnosticSeverity.Error,
    });
  }

  // RecordType/ArrayType Checks
  const isArrayProp = getProperty(dataTypeNode, "isArray");
  const isRecordProp = getProperty(dataTypeNode, "isRecord");
  if (isArrayProp?.valueNode && isArrayProp.valueNode.type !== "boolean") {
    validationContext.addViolation({
      node: isArrayProp.valueNode,
      message: formatErrorMessage(
        'Schema.DataType "isArray" must be a boolean.',
      ),
      severity: DiagnosticSeverity.Error,
    });
  }
  if (isRecordProp?.valueNode && isRecordProp.valueNode.type !== "boolean") {
    validationContext.addViolation({
      node: isRecordProp.valueNode,
      message: formatErrorMessage(
        'Schema.DataType "isRecord" must be a boolean.',
      ),
      severity: DiagnosticSeverity.Error,
    });
  }

  if (
    isArrayProp?.valueNode &&
    isRecordProp?.valueNode &&
    (isArrayProp.valueNode as { value?: boolean }).value === true &&
    (isRecordProp.valueNode as { value?: boolean }).value === true
  ) {
    validationContext.addViolation({
      node: dataTypeNode,
      message: formatErrorMessage(
        'Schema.DataType cannot have both "isArray" and "isRecord" true.',
      ),
      severity: DiagnosticSeverity.Error,
    });
  }
}

/**
 * Validates a single schema node (e.g. ROOT or a custom type): each property
 * must be an object with a "type" field (Schema.DataType), full structure
 * validation, known type reference (schema or XLR), and when the type is an
 * XLR type, validates the DataType object against the XLR definition via the SDK.
 */
function validateSchemaNode(
  node: ObjectASTNode,
  schemaTypeNames: Set<string>,
  sdk: XLRSDK,
  validationContext: ValidationContext,
): void {
  for (const prop of node.properties) {
    const valueNode = prop.valueNode;
    if (!(valueNode && valueNode.type === "object")) {
      if (valueNode) {
        validationContext.addViolation({
          node: valueNode,
          message: formatErrorMessage(
            `Schema property "${prop.keyNode.value}" must be an object (Schema.DataType) with a "type" field.`,
          ),
          severity: DiagnosticSeverity.Error,
        });
      }
      continue;
    }

    const dataTypeNode = valueNode as ObjectASTNode;
    const typeProp = getProperty(dataTypeNode, "type");
    if (!typeProp) {
      validationContext.addViolation({
        node: valueNode,
        message: formatErrorMessage(
          'Schema.DataType must have a "type" property (reference to schema or XLR type).',
        ),
        severity: DiagnosticSeverity.Error,
      });
      continue;
    }

    const typeValueNode = typeProp.valueNode;
    if (!typeValueNode || typeValueNode.type !== "string") {
      validationContext.addViolation({
        node: typeValueNode ?? typeProp,
        message: formatErrorMessage(
          'Schema "type" must be a string (schema type name or XLR type name).',
        ),
        severity: DiagnosticSeverity.Error,
      });
      continue;
    }

    const typeName = (typeValueNode as StringASTNode).value;
    const isSchemaType = schemaTypeNames.has(typeName);
    const XLRType = sdk.getType(typeName);

    if (!isSchemaType && !XLRType) {
      validationContext.addViolation({
        node: typeValueNode,
        message: formatErrorMessage(
          `Unknown schema type "${typeName}". Type must be a schema type (key in this schema) or an XLR type loaded in the SDK.`,
        ),
        severity: DiagnosticSeverity.Error,
      });
    } else if (XLRType) {
      /** Full DataType structure per @player-ui/types */
      validateDataTypeStructure(
        dataTypeNode,
        XLRType as NamedType<ObjectType>,
        sdk,
        validationContext,
      );
    }
  }
}

/**
 * Validates the Flow's schema property: structure per Schema.Schema,
 * type references, full DataType structure, and XLR shape when type is an XLR type.
 */
function validateFlowSchema(
  contentNode: ContentASTNode,
  sdk: XLRSDK,
  validationContext: ValidationContext,
): void {
  const schemaProp = getProperty(contentNode, "schema");
  if (!schemaProp?.valueNode) {
    return;
  }

  const schemaValue = schemaProp.valueNode;
  if (schemaValue.type !== "object") {
    validationContext.addViolation({
      node: schemaValue,
      message: formatErrorMessage(
        'Flow "schema" must be an object with at least a "ROOT" key.',
      ),
      severity: DiagnosticSeverity.Error,
    });
    return;
  }

  const schemaObj = schemaValue as ObjectASTNode;
  const hasRoot = schemaObj.properties.some((p) => p.keyNode.value === "ROOT");

  if (!hasRoot) {
    validationContext.addViolation({
      node: schemaValue,
      message: formatErrorMessage('Schema must have a "ROOT" key.'),
      severity: DiagnosticSeverity.Error,
    });
  }

  const schemaTypeNames = getSchemaTypeNames(schemaObj);

  for (const prop of schemaObj.properties) {
    const nodeValue = prop.valueNode;
    if (!nodeValue || nodeValue.type !== "object") {
      if (nodeValue) {
        validationContext.addViolation({
          node: nodeValue,
          message: formatErrorMessage(
            `Schema node "${prop.keyNode.value}" must be an object.`,
          ),
          severity: DiagnosticSeverity.Error,
        });
      }
      continue;
    }

    validateSchemaNode(
      nodeValue as ObjectASTNode,
      schemaTypeNames,
      sdk,
      validationContext,
    );
  }
}

/**
 * Plugin that registers schema validation with the Player Language Service.
 */
export class SchemaValidationPlugin implements PlayerLanguageServicePlugin {
  name = "schema-validation";

  /** Resolved when CommonTypes have been loaded into the XLR SDK (once per plugin apply) */
  private commonTypesLoaded: Promise<void> | null = null;

  apply(service: PlayerLanguageService): void {
    service.hooks.validate.tap(this.name, async (_ctx, validationContext) => {
      await this.commonTypesLoaded;
      validationContext.useASTVisitor(
        this.createValidationVisitor(service, validationContext),
      );
    });
  }

  private createValidationVisitor(
    service: PlayerLanguageService,
    validationContext: ValidationContext,
  ): ASTVisitor {
    const sdk = service.XLRService.XLRSDK;
    return {
      ContentNode: (contentNode) => {
        validateFlowSchema(contentNode, sdk, validationContext);
      },
    };
  }
}
