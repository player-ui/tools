import { test, expect } from 'vitest';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parse } from '../document';

test('parses simple content', () => {
  const document = parse(
    TextDocument.create(
      'foo.json',
      'json',
      1,
      JSON.stringify({
        views: [{ id: 'foo' }],
      })
    )
  );

  expect(document.root.type).toBe('content');
});
