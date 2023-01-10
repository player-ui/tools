import SampleExpression from '@player-tools/static-xlrs/static_xlrs/expression/xlr/manifest';
import { symbolDisplayToString } from '@player-tools/xlr-utils';
import { ExpressionLanguageService } from '../service';

describe('language-service', () => {
  let service: ExpressionLanguageService;

  beforeEach(() => {
    service = new ExpressionLanguageService({ plugins: [SampleExpression] });
  });

  it('should auto-complete expressions', () => {
    const completions = service.getCompletionsAtPosition(
      {
        text: 't',
      } as any,
      {
        line: 0,
        character: 1,
      }
    );

    expect(completions).toMatchInlineSnapshot(`
      Object {
        "entries": Array [
          Object {
            "insertText": "trim()",
            "isRecommended": true,
            "kind": "function",
            "name": "trim",
            "sortText": "trim",
          },
          Object {
            "insertText": "titleCase()",
            "isRecommended": true,
            "kind": "function",
            "name": "titleCase",
            "sortText": "titleCase",
          },
        ],
        "isGlobalCompletion": false,
        "isMemberCompletion": false,
        "isNewIdentifierLocation": true,
      }
    `);
  });

  describe('validations', () => {
    it('should validate number of expression arguments', () => {
      const diagnostics = service.getSemanticDiagnostics({
        text: 'trim()',
        node: {
          getSourceFile: () => null,
        },
      } as any);

      expect(diagnostics).toMatchInlineSnapshot(`
        Array [
          Object {
            "category": 1,
            "code": 1,
            "file": null,
            "length": 4,
            "messageText": "Expected 1 argument(s), got 0",
            "start": 0,
          },
        ]
      `);
    });

    it('validate basic args', () => {
      const diagnostics = service.getSemanticDiagnostics({
        text: 'containsAny(123, 123)',
        node: {
          getSourceFile: () => null,
        },
      } as any);

      expect(diagnostics).toMatchInlineSnapshot(`
        Array [
          Object {
            "category": 1,
            "code": 1,
            "file": null,
            "length": 3,
            "messageText": "Expected type 'string' but got 'number'",
            "start": 12,
          },
          Object {
            "category": 1,
            "code": 1,
            "file": null,
            "length": 3,
            "messageText": "Does not match any of the expected types for type: 'arg_1'",
            "start": 17,
          },
        ]
      `);
    });

    it('validate nested args', () => {
      const diagnostics = service.getSemanticDiagnostics({
        text: 'containsAny("123", containsAny(123, "123"))',
        node: {
          getSourceFile: () => null,
        },
      } as any);

      expect(diagnostics).toMatchInlineSnapshot(`
        Array [
          Object {
            "category": 1,
            "code": 1,
            "file": null,
            "length": 3,
            "messageText": "Expected type 'string' but got 'number'",
            "start": 31,
          },
        ]
      `);
    });

    it('working args', () => {
      const diagnostics = service.getSemanticDiagnostics({
        text: 'containsAny("123", "123")',
        node: {
          getSourceFile: () => null,
        },
      } as any);

      expect(diagnostics).toMatchInlineSnapshot(`Array []`);
    });

    it('should validate typos', () => {
      const diagnostics = service.getSyntacticDiagnostics({
        text: 'containsAny("123',
        node: {
          getSourceFile: () => null,
        },
      } as any);

      expect(diagnostics).toMatchInlineSnapshot(`
        Array [
          Object {
            "category": 1,
            "code": 1,
            "file": null,
            "length": 16,
            "messageText": "Unclosed quote after \\"123\\" at character 16",
            "start": 0,
          },
        ]
      `);
    });
  });

  describe('quick info', () => {
    it('should get quick info for expression', () => {
      const info = service.getQuickInfoAtPosition(
        {
          text: 'trim()',
          node: {
            getSourceFile: () => null,
          },
        } as any,
        {
          line: 0,
          character: 0,
        }
      );

      expect(
        symbolDisplayToString((info as ts.QuickInfo).displayParts)
      ).toMatchInlineSnapshot(`"function trim(arg: unknown): unknown"`);
    });
  });
});
