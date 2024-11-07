# Complexity check

Evaluate your content's complexity against a set of criteria to understand potential performance impact in product and reduce costly runtime calculations.

The runtime is a script injected into the page that's responsible for attaching to any running player instances. It injects a global __Player_Devtools plugin that's used to send events to and from the content script (and thus the rest of the ecosystem).

## Usage

Complexity is measured by a score which is measured against error and warning limits.

The config supports a `maxAcceptableComplexity` value, which will trigger an error if the complexity score is higher. A score below `maxAcceptableComplexity` but higher than `maxWarningLevel` will return a warning.

To view a complete score breakdown that impacts the complexity score, pass in `-v trace` when running this plugin on content.

## Tests

`bazel test //language/complexity-check-plugin:complexity-check-plugin_vitest --test_output=all`

## Scoring criteria

A scoring breakdown of what this package analyzes:

| Criteria                      | Points            |
|-------------------------------|-------------------|
| Exp in ACTION states (array)  | 1                 |
| View node                     | 1                 |
| Asset node                    | 1                 |
| Asset node in a template      | 2 (+1 per nested) |
| Evaluation (@[]@)             | 4                 |
| Expression ({{ }})            | 4                 |
| View/asset type weight        | Custom            |
