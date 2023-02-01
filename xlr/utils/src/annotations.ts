import * as ts from 'typescript';
import type { Annotations } from '@player-tools/xlr';

interface JSDocContainer {
  /** */
  jsDoc: Array<ts.JSDoc>;
}

/**
 *
 */
function extractDescription(text: string | undefined): Annotations {
  if (!text) {
    return {};
  }

  return { description: text };
}

/**
 * Checks if the parent node is a non-object type
 */
function parentIsNonObjectPath(node: ts.Node) {
  return (
    node.parent &&
    (ts.isArrayTypeNode(node.parent) ||
      ts.isTupleTypeNode(node.parent) ||
      ts.isOptionalTypeNode(node.parent) ||
      ts.isRestTypeNode(node.parent) ||
      ts.isUnionTypeNode(node.parent))
  );
}

/**
 * Traverses up the node tree to build the title path down to the initial node
 */
function recurseTypeChain(
  node: ts.Node,
  child: ts.Node | undefined
): Array<string> {
  if (!node) {
    return [];
  }

  if (
    ts.isArrayTypeNode(node) &&
    node.parent &&
    ts.isRestTypeNode(node.parent)
  ) {
    return recurseTypeChain(node.parent, node);
  }

  if (ts.isRestTypeNode(node)) {
    return recurseTypeChain(node.parent, node);
  }

  if (ts.isOptionalTypeNode(node)) {
    return recurseTypeChain(node.parent, node);
  }

  if (ts.isUnionTypeNode(node)) {
    return recurseTypeChain(node.parent, node);
  }

  if (ts.isParenthesizedTypeNode(node)) {
    return recurseTypeChain(node.parent, node);
  }

  if (ts.isTypeLiteralNode(node)) {
    return recurseTypeChain(node.parent, node);
  }

  if (ts.isArrayTypeNode(node)) {
    return ['[]', ...recurseTypeChain(node.parent, node)];
  }

  if (ts.isTupleTypeNode(node)) {
    const pos = node.elements.indexOf(child as any);
    return [
      ...(pos === -1 ? [] : [`${pos}`]),
      ...recurseTypeChain(node.parent, node),
    ];
  }

  if (
    ts.isTypeAliasDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isPropertySignature(node)
  ) {
    return [node.name.getText(), ...recurseTypeChain(node.parent, node)];
  }

  if (parentIsNonObjectPath(node)) {
    return recurseTypeChain(node.parent, node);
  }

  return [];
}

/**
 * Builds the `Title` property by traversing up and noting the named types in the tree
 */
function extractTitle(node: ts.Node): Annotations {
  const typeNames = recurseTypeChain(node, undefined).reverse().join('.');

  if (!typeNames.length) {
    return {};
  }

  return { title: typeNames };
}

/**
 *
 */
function stringifyDoc(
  docString: undefined | string | ts.NodeArray<ts.JSDocComment>
): string | undefined {
  if (typeof docString === 'undefined' || typeof docString === 'string') {
    return docString;
  }

  return docString.map(({ text }) => text).join(' ');
}

/**
 * Extracts JSDoc tags to strings
 */
function extractTags(tags: ReadonlyArray<ts.JSDocTag>): Annotations {
  const descriptions: Array<string> = [];
  const examples: Array<string> = [];
  const _default: Array<string> = [];
  const see: Array<string> = [];
  const metatags: Record<string, string> = {};

  /**
   *
   */
  const extractSee = (tag: ts.JSDocSeeTag) => {
    return `${tag.tagName ? `${tag.tagName?.getText()} ` : ''}${
      stringifyDoc(tag.comment)?.trim() ?? ''
    }`;
  };

  tags.forEach((tag) => {
    if (!tag.comment) {
      return;
    }

    if (tag.tagName.text === 'example') {
      examples.push(stringifyDoc(tag.comment)?.trim() ?? '');
    } else if (tag.tagName.text === 'default') {
      _default.push(stringifyDoc(tag.comment)?.trim() ?? '');
    } else if (tag.tagName.text === 'see') {
      see.push(extractSee(tag as ts.JSDocSeeTag));
    } else if (tag.tagName.text === 'metatag') {
      const [key, value] = tag.comment.toString().split(/:(.*)/);
      metatags[key] = value?.trim() ?? '';
    } else {
      const text = stringifyDoc(tag.comment)?.trim() ?? '';
      descriptions.push(`@${tag.tagName.text} ${text}`);
    }
  });

  return {
    ...(descriptions.length === 0
      ? {}
      : { description: descriptions.join('\n') }),
    ...(examples.length === 0 ? {} : { examples }),
    ...(_default.length === 0 ? {} : { default: _default.join('\n') }),
    ...(see.length === 0 ? {} : { see }),
    ...(metatags && Object.keys(metatags).length === 0 ? {} : { metatags }),
  };
}

/**
 * Joins Arrays of maybe strings with a given separator
 */
function join(t: Array<string | undefined>, separator = '\n') {
  const unique = new Set(t).values();
  return Array.from(unique)
    .filter((s) => s !== undefined)
    .join(separator)
    .trim();
}

/**
 * Merges Annotation nodes for various nodes
 */
function mergeAnnotations(nodes: Array<Annotations>): Annotations {
  const name = nodes.find((n) => n.name)?.name;
  const title = join(
    nodes.map((n) => n.title),
    ', '
  );
  const description = join(nodes.map((n) => n.description));
  const _default = join(nodes.map((n) => n.default));
  const comment = join(nodes.map((n) => n.comment));
  const examples = join(
    nodes.map((n) =>
      Array.isArray(n.examples) ? join(n.examples) : n.examples
    )
  );
  const see = join(
    nodes.map((n) => (Array.isArray(n.see) ? join(n.see) : n.see))
  );
  const metatags = nodes.find((n) => n.metatags)?.metatags;
  return {
    ...(name ? { name } : {}),
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(examples ? { examples } : {}),
    ...(_default ? { default: _default } : {}),
    ...(see ? { see } : {}),
    ...(comment ? { comment } : {}),
    ...(metatags ? { metatags } : {}),
  };
}

/**
 * Converts JSDoc comments to strings
 */
export function decorateNode(node: ts.Node): Annotations {
  const { jsDoc } = node as unknown as JSDocContainer;
  const titleAnnotation = extractTitle(node);

  if (jsDoc && jsDoc.length) {
    const first = jsDoc[0];
    return mergeAnnotations([
      extractDescription(stringifyDoc(first.comment)),
      titleAnnotation,
      extractTags(first.tags ?? []),
    ]);
  }

  return titleAnnotation;
}
