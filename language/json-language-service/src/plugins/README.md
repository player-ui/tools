# JSON Language Service Plugins

Documentation is WIP - contributions welcomed!

## Tests

Each plugin has an associated test that runs through mock content. To run these tests, you can use the following command from root:

`bazel test //language/json-language-service:json-language-service_vitest --test_output=all`

## Plugins

The runtime is a script injected into the page that's responsible for attaching to any running player instances. It injects a global __Player_Devtools plugin that's used to send events to and from the content script (and thus the rest of the ecosystem).

### Complexity check

This plugin runs through content and calculates a complexity score to help teams understand how their content contributes to the potential performance impact in product.

Teams can set a `maxWarningLevel` that triggers a warning, as well as a `maxAcceptableComplexity` which will trigger an error.

A scoring breakdown of what this plugin looks for:

| Criteria                      | Points            |
|-------------------------------|-------------------|
| Exp in ACTION states (array)  | 1                 |
| View node                     | 1                 |
| Asset node                    | 1                 |
| Asset node in a template      | 2 (+1 per nested) |
| Evaluation (@[]@)             | 2                 |
| Expression ({{ }})            | 2                 |
