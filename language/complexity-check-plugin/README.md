# Complexity check

Evaluate your content's complexity against a set of criteria to understand potential performance impact in product and reduce costly runtime calculations.

## Config

### `maxAcceptableComplexity`

The config requires a `maxAcceptableComplexity` value, which will trigger an error if the complexity score returned is higher.

```ts
  maxAcceptableComplexity: number;

  // Example readout
  ERROR 126:13  Content complexity is 800, Maximum: 500 path/to/file
```

### `maxWarningLevel`

A score higher than `maxWarningLevel` but lower than `maxAcceptableComplexity` will return a warning.

```ts
  maxWarningLevel?: number;

  // Example readout
  WARN 126:13  Content complexity is 400, Warning: 350 path/to/file
```

### `typeWeights`

Assign additional points based on view or asset type complexity.

```ts
  typeWeights?: Record<string, number>;
```

## Implementation

```ts
import { ComplexityCheck } from '@player-tools/complexity-check-plugin';

new ComplexityCheck({
    maxAcceptableComplexity: 500,
    maxWarningLevel: 350,
    typeWeights: {
        action: 9.5,
        badge: 2,
        image: 7.5,
        video: 8,
    }
})
```

## Verbose logging

To view a complete score breakdown that impacts the complexity score, pass in `-v trace` when running this plugin on content, for example `yarn run player json validate -v trace`.

## Tests

`bazel test //language/complexity-check-plugin:complexity-check-plugin_vitest --test_output=all`

## Scoring criteria

A scoring breakdown of what this package analyzes:

| Criteria                      | Points                                  |
|-------------------------------|-----------------------------------------|
| Exp in ACTION states (array)  | 1                                       |
| View node                     | 1                                       |
| Asset node                    | 1                                       |
| Asset node in a template      | 2 (+1 per nested)                       |
| Evaluation (@[]@)             | 4                                       |
| Expression ({{ }})            | 4                                       |
| View/asset type weight        | `Record<string, number>;`               |
