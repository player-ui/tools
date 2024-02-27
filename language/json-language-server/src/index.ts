/* eslint-disable no-console */
import type { InitializeParams } from "vscode-languageserver";
import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  DidChangeConfigurationNotification,
  TextDocumentSyncKind,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { PlayerLanguageService } from "@player-tools/json-language-service";
import fs from "fs";
import { runAndCatch } from "./utils";

export * from "./utils";

const dateFormat = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour12: false,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const logFilePath =
  process.argv.length === 4 &&
  fs.existsSync(process.argv[3]) &&
  process.argv[3];

/** Format a log message to work in the console */
const formatLog = (a: unknown): string => {
  const msg = typeof a === "string" ? a : JSON.stringify(a);
  const date = new Date();
  return `${dateFormat.format(date)},$${date.getMilliseconds()} | ${msg} \n`;
};

const fileLog = logFilePath
  ? (a: unknown) =>
      fs.appendFile(logFilePath, formatLog(a), () => {
        /* do nothing */
      })
  : () => {
      /* do nothing */
    };

const service = new PlayerLanguageService();

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;

process.on("unhandledRejection", (e: Error) => {
  console.error(e.message);
});
process.on("uncaughtException", (e: Error) => {
  console.error(e.message);
});

console.log = (a: Error) => {
  fileLog(a);
  connection.console.log(JSON.stringify(a, null, 2));
};

console.error = (a: Error) => {
  fileLog(a);
  connection.console.error(JSON.stringify(a, null, 2));
};

/** Handle validating a text-document and returning the response back to the extension */
async function validate(textDocument: TextDocument): Promise<void> {
  const diagnostics = await service.validateTextDocument(textDocument);

  if (diagnostics) {
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
  }
}

connection.onInitialize((params: InitializeParams) => {
  const { capabilities } = params;

  // Does the client support the `workspace/configuration` request?
  // If not, we will fall back using global settings
  hasConfigurationCapability = Boolean(
    capabilities.workspace && Boolean(capabilities.workspace.configuration)
  );

  fileLog("Initialized Player LSP Server");
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      codeActionProvider: true,
      definitionProvider: true,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['"', ":"],
      },
      documentFormattingProvider: true,
      documentRangeFormattingProvider: true,
      hoverProvider: true,
    },
  };
});

connection.onCompletion(async (textDocumentPosition, token) => {
  return runAndCatch(
    () => {
      const document = documents.get(textDocumentPosition.textDocument.uri);
      if (document !== undefined) {
        return service.getCompletionsAtPosition(
          document,
          textDocumentPosition.position
        );
      }

      return null;
    },
    token,
    null
  );
});

connection.onHover(async (hoverParams, token) => {
  return runAndCatch(
    () => {
      const document = documents.get(hoverParams.textDocument.uri);
      if (document !== undefined) {
        return service.getHoverInfoAtPosition(document, hoverParams.position);
      }

      return null;
    },
    token,
    null
  );
});

connection.onCompletionResolve((item, token) =>
  runAndCatch(() => service.resolveCompletionItem(item), token, item)
);

connection.onDocumentFormatting((formattingParams, token) =>
  runAndCatch(
    () => {
      const document = documents.get(formattingParams.textDocument.uri);

      if (document !== undefined) {
        return service.formatTextDocument(document, formattingParams.options);
      }

      return undefined;
    },
    token,
    null
  )
);

connection.onDocumentRangeFormatting((formattingParams, token) =>
  runAndCatch(
    () => {
      const document = documents.get(formattingParams.textDocument.uri);

      if (document !== undefined) {
        return service.formatTextDocument(
          document,
          formattingParams.options,
          formattingParams.range
        );
      }

      return undefined;
    },
    token,
    null
  )
);

connection.onDefinition((definitionParams, token) =>
  runAndCatch(
    () => {
      const document = documents.get(definitionParams.textDocument.uri);

      if (document !== undefined) {
        return service.getDefinitionAtPosition(
          document,
          definitionParams.position
        );
      }

      return undefined;
    },
    token,
    null
  )
);

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined
    );
  }
});

connection.onCodeAction((codeAction) => {
  const document = documents.get(codeAction.textDocument.uri);
  if (!document) {
    return [];
  }

  return service.getCodeActionsInRange(document, codeAction.context);
});

documents.onDidClose((change) => {
  service.onClose(change.document);
});

documents.onDidChangeContent((change) => {
  validate(change.document);
});

connection.onNotification(
  "player/setAssetBundles",
  (assetBundles: Array<string>) => {
    // Don't trust data over the wire
    if (Array.isArray(assetBundles)) {
      console.log("Updating asset type bundles");
      service.setAssetTypes(assetBundles);
    }
  }
);

fileLog("Starting Player LSP Server");

documents.listen(connection);
connection.listen();
