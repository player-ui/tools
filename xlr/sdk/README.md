# @player-tools/xlr-sdk

Unified interface for working with XLRs. Abstracts away needing to know how they
are packaged or where they are sourced from. Current operations supported:

- Load
- Export
  - Typescript
- Validate

Also exposes functionality to create your own XLR Registry to manage how the SDK
stores loaded types.

## Validation

To run XLR validation, `yarn run player dsl validate` which will display any
relevant errors.

For additional debugging information, `yarn run player dsl validate -v info`.
