import { test, expect, describe, beforeEach } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  ReferenceAssetsWebPluginManifest,
  Types,
} from "@player-tools/static-xlrs";
import { PlayerLanguageService } from "..";
import { toTextDocument } from "../utils";

describe("player language service", () => {
  let service: PlayerLanguageService;

  beforeEach(async () => {
    service = new PlayerLanguageService();
    await service.setAssetTypesFromModule([
      Types,
      ReferenceAssetsWebPluginManifest,
    ]);
  });

  describe("formatting", () => {
    test("formats a document", async () => {
      const document = toTextDocument(
        `{
"id": "foo",
"views": [{"id":"view1"}]
}
`,
      );

      const formatEdits = await service.formatTextDocument(document, {
        tabSize: 2,
        insertSpaces: true,
      });
      expect(formatEdits).toHaveLength(8);
      const updatedDocument = TextDocument.applyEdits(
        document,
        formatEdits ?? [],
      );
      expect(updatedDocument).toMatchInlineSnapshot(`
        "{
          "id": "foo",
          "views": [
            {
              "id": "view1"
            }
          ]
        }"
      `);
    });
  });

  describe("validation", () => {
    test("throws AssetWrapper errors", async () => {
      const document = toTextDocument(
        `
        {
          "id": "foo",
          "views": [
            {
              "id": "input-asset",
              "type": "input",
              "binding": "foo",
              "label": [{
                "id":"test",
                "type": "text",
                "value": "test"
              }]
            }
          ],
          "data": {},
          "navigation": {},
          "schema": {
            "ROOT": {
              "application": {
                "type": null
              },
              "foo": {
                "type": "fooType"
              }
            },
            "fooType": {
              "bar": {
                "type": "barType",
                "validation": [
                  {
                    "type": "required",
                    "severity": "error"
                  }
                ]
              },
              "baz": {
                "type": "bazType",
                "validation": [
                  {
                    "type": "required",
                    "message": "this is my own message"
                  }
                ]
              }
            }
          }
        }
        `,
      );
      const validationErrors = await service.validateTextDocument(document);

      expect(validationErrors).toMatchSnapshot();
    });
  });

  describe("completion", () => {
    test("basic object completions", async () => {
      const document = toTextDocument(
        `
{
"id": "foo",
"views": [
  {
   "id": "view-1",
   "type": "main",
   "title": {
    "asset": {
     "id": "title-asset",
     "type": "text",
      
    }
   }
  }
],
"data":{},
"navigation":{

}
}
`,
      );

      let completions = await service.getCompletionsAtPosition(document, {
        line: 11,
        character: 6,
      });
      expect(completions.items).toMatchSnapshot();

      completions = await service.getCompletionsAtPosition(document, {
        line: 18,
        character: 2,
      });
      expect(completions.items).toMatchSnapshot();
    });

    test("basic value completions", async () => {
      const document = toTextDocument(
        `
{
 "id": "foo",
 "views": [],
 "data":{},
 "navigation":{
  "BEGIN": "FLOW_1",
   "FLOW_1": {
   "startState": "VIEW_1",
   "VIEW_1": {
    "state_type": "",
    "ref": "action",
    "transitions": {
     "*": "END_Done"
    }
   },
   "END_Done": {
    "state_type": "END",
     "outcome": "done"
   }
  }
 }
}
`,
      );

      const completions = await service.getCompletionsAtPosition(document, {
        line: 10,
        character: 19,
      });
      expect(completions.items).toMatchSnapshot();
    });

    test("schema completions", async () => {
      const document = toTextDocument(
        `
        {
          "id": "foo",
          "views": [
            {
              "id": "view-1",
              "type": "main",
              "title": {
                "asset": {
                  "id": "input-asset",
                  "type": "input",
                  "binding": "foo"
                }
              }
            }
          ],
          "data": {},
          "navigation": {},
          "schema": {
            "ROOT": {
              "application": {
                "type": null
              },
              "foo": {
                "type": "fooType"
              }
            },
            "fooType": {
              "bar": {
                "type": "barType",
                "validation": [
                  {
                    "type": "required",
                    "severity": "error"
                  }
                ]
              },
              "baz": {
                "type": "bazType",
                "validation": [
                  {
                    "type": "required",
                    "message": "this is my own message"
                  }
                ]
              }
            }
          }
        }
        
`,
      );

      const completions = await service.getCompletionsAtPosition(document, {
        line: 11,
        character: 33,
      });
      expect(completions.items).toMatchSnapshot();
    });
  });

  describe("hover", () => {
    test("basic hover docs", async () => {
      const document = toTextDocument(
        `
{
  "id": "foo",
  "views": [
    {
      "id": "view-1",
      "type": "main",
      "title": {
        "asset": {
          "id": "title-asset",
          "type": "text"
        }
      }
    }
  ],
  "data": {},
  "navigation": {
    "BEGIN":""
  }
}
`,
      );

      let docs = await service.getHoverInfoAtPosition(document, {
        line: 5,
        character: 9,
      });
      expect(docs).toBeDefined();
      expect(docs).toMatchSnapshot();

      docs = await service.getHoverInfoAtPosition(document, {
        line: 10,
        character: 13,
      });
      expect(docs).toBeDefined();
      expect(docs).toMatchSnapshot();

      docs = await service.getHoverInfoAtPosition(document, {
        line: 15,
        character: 6,
      });
      expect(docs).toBeDefined();
      expect(docs).toMatchSnapshot();
    });
  });
});
