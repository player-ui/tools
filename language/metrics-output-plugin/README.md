# Metrics Output Plugin

A plugin used in the CLI (not to be used in an IDE) that generates a file that supports metrics data for each content-based file in a project.

## Config

### File-based metrics

`stats`

Assign stats related data for each file in the project.

`features`

Assign custom feature data not necessarily tied to content, such as booleans/flags.

### Project-based metrics

### `rootProperties?`

Any custom metadata to include at the root level of the output file.

### File-generation properties

### `outputDir?`

Determines which directory to write the file to. Defaults to where the script is run.

### `fileName?`

Determines the name of the file to write. Defaults to `metrics`.

## Output Format

The plugin by default generates a JSON file with the following example structure:

```json
{
  "content": {
    "path/to/file/1.json": {
      "stats": {
        "complexity": 18
      },
      "features": {
        "dslEnabled": "true"
      }
    },
    "path/to/file/2.json": {
      "stats": {
        "complexity": 10
      },
      "features": {
        "dslEnabled": "false"
      }
    }
  }
}
```

To include custom data at the root level, use the `rootProperties` field in the
config.

```json
{
  "timestamp": "2023-05-24T12:34:56.789Z",
  "customProperty1": "customValue1",
  "customProperty2": "customValue2"
}
```

## Utility Functions

The plugin provides utility functions to help extract and transform diagnostic data for your metrics.

### extractFromDiagnostics

Extracts data from diagnostic messages using a regex pattern.

```typescript
import { extractFromDiagnostics } from "@player-tools/metrics-output-plugin";

// Usage in stats configuration
const stats = {
  // Extract complexity score from diagnostic messages that match "Complexity score: 42"
  complexity: extractFromDiagnostics(/Complexity score: (\d+)/, Number),

  // Extract JSON data from diagnostic messages
  jsonData: extractFromDiagnostics(/JSON data: (.+)/, JSON.parse),
};
```

### extractByData

Extracts data from diagnostics that have a specific identifer that supports Symbols and strings.

```typescript
// An external LSP plugin
const ASSET_COUNT_SYMBOL = Symbol("asset-count");
```

Usage:

```typescript
import { extractByData } from "@player-tools/metrics-output-plugin";
import { ASSET_COUNT_SYMBOL } from "external-lsp-plugin";

// Usage in stats configuration
const stats = {
  // Extract data from diagnostics marked with a symbol
  assets: (diagnostics) => extractByData(ASSET_COUNT_SYMBOL, diagnostics),
};
```
