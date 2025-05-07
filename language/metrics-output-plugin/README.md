# Metrics Output Plugin

Generate a file containing metrics data for each file in the project.

## Config

### `metrics`

An object containing the metrics data for each file in the project.

### `outputDir?`

Determines which directory to write the file to. Defaults to where the script is run.

### `fileName?`

Determines the name of the file to write. Defaults to `metrics`.

### `rootProperties?`

Any custom metadata to include at the root level of the output file.

## Output Format

The plugin by default generates a JSON file with the following example structure:

```json
{
  "timestamp": "2023-05-24T12:34:56.789Z",
  "content": {
    "path/to/file/1.json": {
      "metrics": {
        "complexity": 18
      },
      "features": {
        "dslEnabled": "true"
      }
    },
    "path/to/file/2.json": {
      "metrics": {
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
