# 0.12.1-next.2 (Tue Jul 29 2025)

### Release Notes

#### Fix Export of `testExpression` Function ([#218](https://github.com/player-ui/tools/pull/218))

Fix export of `testExpression` function from `@player-tools/dsl` package

#### Fixing release errors ([#219](https://github.com/player-ui/tools/pull/219))

Using auto's `getPrNumberFromEnv` to verify that the release-version-info script will only run in PR contexts.

---

#### 🐛 Bug Fix

- Fix Export of `testExpression` Function [#218](https://github.com/player-ui/tools/pull/218) ([@KetanReddy](https://github.com/KetanReddy))
- Fixing release errors [#219](https://github.com/player-ui/tools/pull/219) ([@kharrop](https://github.com/kharrop))

#### Authors: 2

- Kelly Harrop ([@kharrop](https://github.com/kharrop))
- Ketan Reddy ([@KetanReddy](https://github.com/KetanReddy))

---

# 0.12.1-next.1 (Mon Jul 28 2025)

### Release Notes

#### Adding Release Info Comment Functionality ([#217](https://github.com/player-ui/tools/pull/217))

Adding a script that posts Release Info whenever a new version is made available.

---

#### 🐛 Bug Fix

- Adding Release Info Comment Functionality [#217](https://github.com/player-ui/tools/pull/217) ([@kharrop](https://github.com/kharrop))

#### Authors: 1

- Kelly Harrop ([@kharrop](https://github.com/kharrop))

---

# 0.12.1-next.0 (Tue Jul 15 2025)

### Release Notes

#### Metrics Output Plugin ([#213](https://github.com/player-ui/tools/pull/213))

Added new metrics output LSP plugin, to use it:
  ```typescript
  service.addLSPPlugin(
      new MetricsOutput({
         fileName: "stats",
         stats: {
          complexity: extractFromDiagnostics(
            /Content complexity is (\d+)/,
            (value: string) => parseInt(value, 10),
          ),
          customStat: () => Math.random(),
        },
      })
  ```

---

#### 🐛 Bug Fix

- Metrics Output Plugin [#213](https://github.com/player-ui/tools/pull/213) ([@kharrop](https://github.com/kharrop))

#### Authors: 1

- Kelly Harrop ([@kharrop](https://github.com/kharrop))

---

# 0.12.0 (Wed Jun 04 2025)

### Release Notes

#### DSL Expression Generation Functions and Testing Utilities ([#212](https://github.com/player-ui/tools/pull/212))

Add helper functions to generate usable DSL expressions from Player expressions, allowing better ergonomics when using them in content.

---

#### 🚀 Enhancement

- DSL Expression Generation Functions and Testing Utilities [#212](https://github.com/player-ui/tools/pull/212) ([@KetanReddy](https://github.com/KetanReddy) [@adierkens](https://github.com/adierkens))

#### Authors: 2

- Adam Dierkens ([@adierkens](https://github.com/adierkens))
- Ketan Reddy ([@KetanReddy](https://github.com/KetanReddy))

---

# 0.11.0 (Tue Jun 03 2025)

#### 🚀 Enhancement

- Update Template DSL to support placement prop [#196](https://github.com/player-ui/tools/pull/196) ([@kharrop](https://github.com/kharrop))

#### Authors: 1

- Kelly Harrop ([@kharrop](https://github.com/kharrop))

---

# 0.10.2 (Wed May 28 2025)

### Release Notes

#### Fix deps for utils for xlr converters package ([#215](https://github.com/player-ui/tools/pull/215))

Fix `@player-tools/xlr-converters` dependency on non-published package `@player-tools/test-utils` which is only needed as part of tests.

Related to https://github.com/player-ui/tools/pull/211

---

#### 🐛 Bug Fix

- Fix deps for utils for xlr converters package [#215](https://github.com/player-ui/tools/pull/215) ([@kharrop](https://github.com/kharrop))

#### Authors: 1

- Kelly Harrop ([@kharrop](https://github.com/kharrop))

---

# 0.10.1 (Tue May 06 2025)

### Release Notes

#### Fix deps for utils on non-published package ([#211](https://github.com/player-ui/tools/pull/211))

Fix `@player-tools/xlr-utils` dependency on non-published package `@player-tools/test-utils` which is only needed as part of tests

---

#### 🐛 Bug Fix

- Fix deps for utils on non-published package [#211](https://github.com/player-ui/tools/pull/211) ([@KetanReddy](https://github.com/KetanReddy))

#### Authors: 1

- Ketan Reddy ([@KetanReddy](https://github.com/KetanReddy))

---

# 0.10.0 (Fri Apr 25 2025)

### Release Notes

#### Add new plugins to devtools client ([#210](https://github.com/player-ui/tools/pull/210))

* Updates `@player-ui` and `@devtools-ui` versions to latest
* Adds a few new plugins to devtools client

#### Update ESLint to v9 ([#207](https://github.com/player-ui/tools/pull/207))

Internal - Update ESLint to v9

#### Miscellaneous Cleanup ([#192](https://github.com/player-ui/tools/pull/192))

- Move testing utilities out of `@player-tools/xlr-utils` to allow it to work on web, closing #152 
- Deprecate `@player-tools/xlr-asset-docgen-webpack-plugin` as we've figured out a way to do this directly in our storybook, making this plugin not necessary anymore

#### [XLR] Provide better type introspection messages ([#189](https://github.com/player-ui/tools/pull/189))

This ticket adds functionality to introspect the parent type and display the expected nested types when `-v info` is passed in (`yarn run player dsl compile -v info`).

By default, the error messages will remain how they were, like this:
```
  ✖   1996:52  Asset Validation Error - value: Does not match any of the expected types for type: 'SomeType' path/to/source
```

New additional info supported using -v info:
```
  ✖   1996:52  Asset Validation Error - value: Does not match any of the expected types for type: 'SomeType' path/to/source
  ℹ   1996:52  Got: blue and expected: green | red path/to/source
```

For types that generate several types (20+), the info message will truncate at 20 and display the remaining number:
```
  ✖   1996:52  Asset Validation Error - value: Does not match any of the expected types for type: 'SomeType' path/to/source
  ℹ   1996:52  Got: blue and expected: item 19 | item 20 | +8 ... item 28 path/to/source
```

###  Other changes

This PR fixes an issue for the DiagnosticSeverity used in the Complexity Check Plugin, which has been updated from `info` -> `trace` which was the original intent.

#### Use Source Maps for Validation Errors ([#191](https://github.com/player-ui/tools/pull/191))

Use source maps, if available, to map validation errors back to authored content. If not available, the location in the compiled content will be used to point to the error.

#### Add Check for Missing `_index_` Segments of Asset IDs in Templates ([#188](https://github.com/player-ui/tools/pull/188))

Fix `DuplicateIDPlugin` validation plugin not checking for `_index_` elements in IDs of templated assets which would lead to duplicate ID issues at runtime.

#### Add Support for Retaining `next` Release Information in Changelogs ([#185](https://github.com/player-ui/tools/pull/185))

Keep information about `next` release in changelog

#### Run `applyValueRefs` for Views and Transform `type` Properties ([#183](https://github.com/player-ui/tools/pull/183))

Validation - Run `applyValueRefs` for Views and Transform `type` Properties

---

#### 🚀 Enhancement

- [XLR] Provide better type introspection messages [#189](https://github.com/player-ui/tools/pull/189) ([@kharrop](https://github.com/kharrop) [@KetanReddy](https://github.com/KetanReddy))

#### 🐛 Bug Fix

- Add new plugins to devtools client [#210](https://github.com/player-ui/tools/pull/210) ([@adierkens](https://github.com/adierkens))
- Update ESLint to v9 [#207](https://github.com/player-ui/tools/pull/207) ([@KetanReddy](https://github.com/KetanReddy))
- PR Comment Version Fix [#205](https://github.com/player-ui/tools/pull/205) ([@kharrop](https://github.com/kharrop))
- Adding latest version as a PR comment [#203](https://github.com/player-ui/tools/pull/203) ([@kharrop](https://github.com/kharrop))
- Miscellaneous Cleanup [#192](https://github.com/player-ui/tools/pull/192) ([@KetanReddy](https://github.com/KetanReddy))
- Use Source Maps for Validation Errors [#191](https://github.com/player-ui/tools/pull/191) ([@KetanReddy](https://github.com/KetanReddy))
- Add Check for Missing `_index_` Segments of Asset IDs in Templates [#188](https://github.com/player-ui/tools/pull/188) ([@KetanReddy](https://github.com/KetanReddy))
- Add Support for Retaining `next` Release Information in Changelogs [#185](https://github.com/player-ui/tools/pull/185) ([@KetanReddy](https://github.com/KetanReddy))
- Run `applyValueRefs` for Views and Transform `type` Properties [#183](https://github.com/player-ui/tools/pull/183) ([@KetanReddy](https://github.com/KetanReddy))

#### Authors: 3

- Adam Dierkens ([@adierkens](https://github.com/adierkens))
- Kelly Harrop ([@kharrop](https://github.com/kharrop))
- Ketan Reddy ([@KetanReddy](https://github.com/KetanReddy))

---

# 0.10.0-next.0 (Wed Feb 26 2025)

### Release Notes

#### [XLR] Provide better type introspection messages ([#189](https://github.com/player-ui/tools/pull/189))

This ticket adds functionality to introspect the parent type and display the expected nested types when `-v info` is passed in (`yarn run player dsl compile -v info`).

By default, the error messages will remain how they were, like this:
```
  ✖   1996:52  Asset Validation Error - value: Does not match any of the expected types for type: 'SomeType' path/to/source
```

New additional info supported using -v info:
```
  ✖   1996:52  Asset Validation Error - value: Does not match any of the expected types for type: 'SomeType' path/to/source
  ℹ   1996:52  Got: blue and expected: green | red path/to/source
```

For types that generate several types (20+), the info message will truncate at 20 and display the remaining number:
```
  ✖   1996:52  Asset Validation Error - value: Does not match any of the expected types for type: 'SomeType' path/to/source
  ℹ   1996:52  Got: blue and expected: item 19 | item 20 | +8 ... item 28 path/to/source
```

###  Other changes

This PR fixes an issue for the DiagnosticSeverity used in the Complexity Check Plugin, which has been updated from `info` -> `trace` which was the original intent.

---

#### 🚀 Enhancement

- [XLR] Provide better type introspection messages [#189](https://github.com/player-ui/tools/pull/189) ([@kharrop](https://github.com/kharrop) [@KetanReddy](https://github.com/KetanReddy))

#### Authors: 2

- Kelly Harrop ([@kharrop](https://github.com/kharrop))
- Ketan Reddy ([@KetanReddy](https://github.com/KetanReddy))

---

# 0.9.1-next.2 (Thu Feb 13 2025)

### Release Notes

#### Use Source Maps for Validation Errors ([#191](https://github.com/player-ui/tools/pull/191))

Use source maps, if available, to map validation errors back to authored content. If not available, the location in the compiled content will be used to point to the error.

---

#### 🐛 Bug Fix

- Use Source Maps for Validation Errors [#191](https://github.com/player-ui/tools/pull/191) ([@KetanReddy](https://github.com/KetanReddy))

#### Authors: 1

- Ketan Reddy ([@KetanReddy](https://github.com/KetanReddy))

---

# 0.9.1-next.1 (Fri Jan 24 2025)

### Release Notes

#### Add Check for Missing `_index_` Segments of Asset IDs in Templates ([#188](https://github.com/player-ui/tools/pull/188))

Fix `DuplicateIDPlugin` validation plugin not checking for `_index_` elements in IDs of templated assets which would lead to duplicate ID issues at runtime.

#### Add Support for Retaining `next` Release Information in Changelogs ([#185](https://github.com/player-ui/tools/pull/185))

Keep information about `next` release in changelog

---

#### 🐛 Bug Fix

- Add Check for Missing `_index_` Segments of Asset IDs in Templates [#188](https://github.com/player-ui/tools/pull/188) ([@KetanReddy](https://github.com/KetanReddy))
- Add Support for Retaining `next` Release Information in Changelogs [#185](https://github.com/player-ui/tools/pull/185) ([@KetanReddy](https://github.com/KetanReddy))

#### Authors: 1

- Ketan Reddy ([@KetanReddy](https://github.com/KetanReddy))

---

# 0.9.0 (Fri Jan 10 2025)

### Release Notes

#### Preserve Order of Templates in Slots ([#177](https://github.com/player-ui/tools/pull/177))

Fix an issue where Template components in slots that contained a static element wouldn't be serialized to JSON in the same order they were authored in.

<!-- 

Describe what's changing, why, and any other background info.

Make sure to add:
  - Tests
  - Documentation Updates

-->


### Change Type (required)
Indicate the type of change your pull request is:

<!-- 
  We use semantic versioning: https://semver.org/. Review that documentation for 
  more detailed guidelines.
-->
- [x] `patch`
- [ ] `minor`
- [ ] `major`

<!--
  To include release notes in the automatic changelong, just add a level 1 markdown header below
  and include any markdown notes to go into the changelog: https://intuit.github.io/auto/docs/generated/changelog#additional-release-notes

  Example:

  # Release Notes
  Added new plugin, to use it:
  ```typescript
  const plugin = new Plugin(...)
  ```
-->

#### Remove Unneeded Dependency ([#178](https://github.com/player-ui/tools/pull/178))

- Remove unneeded dependency `@oclif/plugin-legacy`
- Fix issue with how the DSL compilation command passed arguments to the JSON validation plugin

### Change Type (required)
Indicate the type of change your pull request is:

<!-- 
  We use semantic versioning: https://semver.org/. Review that documentation for 
  more detailed guidelines.
-->
- [x] `patch`
- [ ] `minor`
- [ ] `major`

<!--
  To include release notes in the automatic changelong, just add a level 1 markdown header below
  and include any markdown notes to go into the changelog: https://intuit.github.io/auto/docs/generated/changelog#additional-release-notes

  Example:

  # Release Notes
  Added new plugin, to use it:
  ```typescript
  const plugin = new Plugin(...)
  ```
-->

#### Add options to LSPAssetsPlugin to load from TSManifest via module import ([#171](https://github.com/player-ui/tools/pull/171))

Allow for loading XLRs to LSP via module imports. Add explicit (optional for now) toggle for distinguishing between module and manifest loading.

---

#### 🚀 Enhancement

- Multiple devtools plugin fix [#174](https://github.com/player-ui/tools/pull/174) ([@mercillo](https://github.com/mercillo))

#### 🐛 Bug Fix

- Release main [#181](https://github.com/player-ui/tools/pull/181) ([@intuit-svc](https://github.com/intuit-svc))
- Support bindings for applicability [#180](https://github.com/player-ui/tools/pull/180) ([@kharrop](https://github.com/kharrop))
- Preserve Order of Templates in Slots [#177](https://github.com/player-ui/tools/pull/177) ([@KetanReddy](https://github.com/KetanReddy))
- Remove Unneeded Dependency [#178](https://github.com/player-ui/tools/pull/178) ([@KetanReddy](https://github.com/KetanReddy))
- feat: complexity checker plugin [#169](https://github.com/player-ui/tools/pull/169) ([@KetanReddy](https://github.com/KetanReddy) [@kharrop](https://github.com/kharrop) [@cehan-Chloe](https://github.com/cehan-Chloe) [@rafbcampos](https://github.com/rafbcampos) [@intuit-svc](https://github.com/intuit-svc) [@mercillo](https://github.com/mercillo))
- Add options to LSPAssetsPlugin to load from TSManifest via module import [#171](https://github.com/player-ui/tools/pull/171) ([@KetanReddy](https://github.com/KetanReddy))

#### Authors: 6

- [@intuit-svc](https://github.com/intuit-svc)
- Chloeeeeeee ([@cehan-Chloe](https://github.com/cehan-Chloe))
- Kelly Harrop ([@kharrop](https://github.com/kharrop))
- Ketan Reddy ([@KetanReddy](https://github.com/KetanReddy))
- Marlon "Marky" Ercillo ([@mercillo](https://github.com/mercillo))
- Rafael Campos ([@rafbcampos](https://github.com/rafbcampos))

---

# 0.8.1 (Thu Sep 26 2024)

### Release Notes

#### Don't create oclif manifest ([#168](https://github.com/player-ui/tools/pull/168))

Fixes issue with oclif manifest not being stamped with the right version leading to console errors

---

#### 🐛 Bug Fix

- Release main [#170](https://github.com/player-ui/tools/pull/170) ([@intuit-svc](https://github.com/intuit-svc))
- Don't create oclif manifest [#168](https://github.com/player-ui/tools/pull/168) ([@KetanReddy](https://github.com/KetanReddy))

#### Authors: 2

- [@intuit-svc](https://github.com/intuit-svc)
- Ketan Reddy ([@KetanReddy](https://github.com/KetanReddy))

---

# 0.8.0 (Thu Sep 12 2024)

### Release Notes

#### Use bazelrc for Main Builds ([#164](https://github.com/player-ui/tools/pull/164))

Use bazelrc to include CI bazel configuration for builds off of main 

### Change Type (required)
Indicate the type of change your pull request is:

<!-- 
  We use semantic versioning: https://semver.org/. Review that documentation for 
  more detailed guidelines.
-->
- [x] `patch`
- [ ] `minor`
- [ ] `major`

<!--
  To include release notes in the automatic changelong, just add a level 1 markdown header below
  and include any markdown notes to go into the changelog: https://intuit.github.io/auto/docs/generated/changelog#additional-release-notes

  Example:

  # Release Notes
  Added new plugin, to use it:
  ```typescript
  const plugin = new Plugin(...)
  ```
-->

#### Update Rules Versions ([#163](https://github.com/player-ui/tools/pull/163))

Update JS Rules to latest Aspect major

<!-- 
  We use semantic versioning: https://semver.org/. Review that documentation for 
  more detailed guidelines.
-->
- [x] `patch`
- [ ] `minor`
- [ ] `major`

<!--
  To include release notes in the automatic changelong, just add a level 1 markdown header below
  and include any markdown notes to go into the changelog: https://intuit.github.io/auto/docs/generated/changelog#additional-release-notes

  Example:

  # Release Notes
  Added new plugin, to use it:
  ```typescript
  const plugin = new Plugin(...)
  ```
-->

#### Fix Source Maps not Being Generated for DSL Content ([#155](https://github.com/player-ui/tools/pull/155))

Fix source maps not being generated for DSL content when compiled by the cli

#### Update Dependencies ([#151](https://github.com/player-ui/tools/pull/151))

- Use Node 20
- Use TypeScript 5.5

---

#### 🚀 Enhancement

- feat: doesn't exit with error if warn-only on dsl validation [#159](https://github.com/player-ui/tools/pull/159) ([@rafbcampos](https://github.com/rafbcampos))

#### 🐛 Bug Fix

- Release main [#166](https://github.com/player-ui/tools/pull/166) ([@intuit-svc](https://github.com/intuit-svc))
- feat: highlight current player instance [#160](https://github.com/player-ui/tools/pull/160) ([@cehan-Chloe](https://github.com/cehan-Chloe) [@rafbcampos](https://github.com/rafbcampos))
- Update Rules Versions [#163](https://github.com/player-ui/tools/pull/163) ([@KetanReddy](https://github.com/KetanReddy))
- Fix object null in deeply nested obejcts - devtools [#158](https://github.com/player-ui/tools/pull/158) ([@mercillo](https://github.com/mercillo))
- Fix Source Maps not Being Generated for DSL Content [#155](https://github.com/player-ui/tools/pull/155) ([@KetanReddy](https://github.com/KetanReddy))
- Update Dependencies [#151](https://github.com/player-ui/tools/pull/151) ([@KetanReddy](https://github.com/KetanReddy))
- Re-add compiler formatting to dsl output [#153](https://github.com/player-ui/tools/pull/153) ([@sugarmanz](https://github.com/sugarmanz))

#### 🔩 Dependency Updates

- Use bazelrc for Main Builds [#164](https://github.com/player-ui/tools/pull/164) ([@KetanReddy](https://github.com/KetanReddy))

#### Authors: 6

- [@intuit-svc](https://github.com/intuit-svc)
- Chloeeeeeee ([@cehan-Chloe](https://github.com/cehan-Chloe))
- Jeremiah Zucker ([@sugarmanz](https://github.com/sugarmanz))
- Ketan Reddy ([@KetanReddy](https://github.com/KetanReddy))
- Marlon "Marky" Ercillo ([@mercillo](https://github.com/mercillo))
- Rafael Campos ([@rafbcampos](https://github.com/rafbcampos))

---

# 0.7.0 (Fri Jul 19 2024)

### Release Notes

#### Update CLI to Allow Compilation to any File Type ([#146](https://github.com/player-ui/tools/pull/146))

Allow DSL compilation phase to compile to non `.json` targets

#### Fix Issue Validating Templates ([#125](https://github.com/player-ui/tools/pull/125))

XLR - Fully resolve references, intersection types, conditional types, and generic types when returning a type
JSON Language Server - Add generic tokens when constructing template types in transform
Validation - Fix issue validating nested arrays in templates.

#### #132 - Adds a dev tools web plugin generator ([#133](https://github.com/player-ui/tools/pull/133))

Adds a generator to facilitate adding new dev tools web plugins:

```bash
pnpm gen:dev-tools-web-plugin
```

#### Fix Bug when Validating `null` literals ([#123](https://github.com/player-ui/tools/pull/123))

Validator - Properly validate `NullType` nodes against `null` literals

#### Fix Parsing Indexed Access Types with Parentheses ([#112](https://github.com/player-ui/tools/pull/112))

XLR - Fixed compilation of `IndexedAccesNodes `that use parentheses around the first element.

#### Fix Regression on Validation of Keys with Escaped Characters ([#110](https://github.com/player-ui/tools/pull/110))

XLR - Fixes validation of objects where a property is escaped using single/double quotes and the property is required or the object doesn't allow additional properties.

---

#### 🚀 Enhancement

- Update CLI to Allow Compilation to any File Type [#146](https://github.com/player-ui/tools/pull/146) ([@KetanReddy](https://github.com/KetanReddy))
- #132 - Adds a dev tools web plugin generator [#133](https://github.com/player-ui/tools/pull/133) ([@rafbcampos](https://github.com/rafbcampos))
- Dev tools profiler plugin [#114](https://github.com/player-ui/tools/pull/114) ([@rafbcampos](https://github.com/rafbcampos))

#### 🐛 Bug Fix

- Release main [#150](https://github.com/player-ui/tools/pull/150) ([@intuit-svc](https://github.com/intuit-svc))
- revert canary on forks [#147](https://github.com/player-ui/tools/pull/147) ([@mercillo](https://github.com/mercillo))
- trigger forked PR canary in correct format for CircleCI [#145](https://github.com/player-ui/tools/pull/145) ([@hborawski](https://github.com/hborawski))
- Fix Canary workflow for forks [#144](https://github.com/player-ui/tools/pull/144) ([@hborawski](https://github.com/hborawski))
- [circleCI] allows us to build from forks [#135](https://github.com/player-ui/tools/pull/135) ([@mercillo](https://github.com/mercillo))
- [bazel - npm registry] flipper-plugin-player-ui-devtools [#138](https://github.com/player-ui/tools/pull/138) ([@lexfm](https://github.com/lexfm))
- Fix Issue Validating Templates [#125](https://github.com/player-ui/tools/pull/125) ([@KetanReddy](https://github.com/KetanReddy))
- [Devtools]FlowPanel/ObjectInspector/PathFilter [#131](https://github.com/player-ui/tools/pull/131) ([@lexfm](https://github.com/lexfm))
- chore: add branch check to CI and bump locks [#124](https://github.com/player-ui/tools/pull/124) ([@rafbcampos](https://github.com/rafbcampos))
- Fix Bug when Validating `null` literals [#123](https://github.com/player-ui/tools/pull/123) ([@KetanReddy](https://github.com/KetanReddy))
- Devtools- panel layout fix and version upgrade [#122](https://github.com/player-ui/tools/pull/122) ([@mercillo](https://github.com/mercillo))
- Use Slim Bazel Image [#119](https://github.com/player-ui/tools/pull/119) ([@KetanReddy](https://github.com/KetanReddy))
- Added additional DSL types and component [#118](https://github.com/player-ui/tools/pull/118) ([@mrigankmg](https://github.com/mrigankmg))
- Devtools/default selected player [#117](https://github.com/player-ui/tools/pull/117) ([@mercillo](https://github.com/mercillo))
- Fix Parsing Indexed Access Types with Parentheses [#112](https://github.com/player-ui/tools/pull/112) ([@KetanReddy](https://github.com/KetanReddy))
- Fix Regression on Validation of Keys with Escaped Characters [#110](https://github.com/player-ui/tools/pull/110) ([@KetanReddy](https://github.com/KetanReddy))

#### 📝 Documentation

- Docs/devtools - local development for extension [#105](https://github.com/player-ui/tools/pull/105) (marlon_ercillo@intuit.com [@mercillo](https://github.com/mercillo))

#### Authors: 8

- [@intuit-svc](https://github.com/intuit-svc)
- Alex Fimbres ([@lexfm](https://github.com/lexfm))
- Harris Borawski ([@hborawski](https://github.com/hborawski))
- Ketan Reddy ([@KetanReddy](https://github.com/KetanReddy))
- marky ercillo (marlon_ercillo@intuit.com)
- Marlon "Marky" Ercillo ([@mercillo](https://github.com/mercillo))
- Mrigank Mehta ([@mrigankmg](https://github.com/mrigankmg))
- Rafael Campos ([@rafbcampos](https://github.com/rafbcampos))

---

# 0.6.0 (Thu May 02 2024)

### Release Notes

#### Handle Template Strings Earlier in DSL Compilation ([#102](https://github.com/player-ui/tools/pull/102))

DSL - Allow intermediate binding paths to be used in content

---

#### 🚀 Enhancement

- chore: bump player and devtools-assets version [#107](https://github.com/player-ui/tools/pull/107) (rafael_campos@intuit.com [@rafbcampos](https://github.com/rafbcampos))
- Devtools revamp [#90](https://github.com/player-ui/tools/pull/90) (rafael_campos@intuit.com [@rafbcampos](https://github.com/rafbcampos))

#### 🐛 Bug Fix

- Release main [#108](https://github.com/player-ui/tools/pull/108) ([@intuit-svc](https://github.com/intuit-svc))
- chore: bump player and devtools-assets versions [#106](https://github.com/player-ui/tools/pull/106) (rafael_campos@intuit.com [@rafbcampos](https://github.com/rafbcampos))
- feat: adds editor view to basic devtools plugin [#103](https://github.com/player-ui/tools/pull/103) (rafael_campos@intuit.com [@rafbcampos](https://github.com/rafbcampos))
- Handle Template Strings Earlier in DSL Compilation [#102](https://github.com/player-ui/tools/pull/102) ([@KetanReddy](https://github.com/KetanReddy))
- chore: update locks [#100](https://github.com/player-ui/tools/pull/100) (rafael_campos@intuit.com [@rafbcampos](https://github.com/rafbcampos))
- [Docs] DSL pckg name and CLI validate command docs update [#99](https://github.com/player-ui/tools/pull/99) ([@lexfm](https://github.com/lexfm))

#### Authors: 5

- [@intuit-svc](https://github.com/intuit-svc)
- Alex Fimbres ([@lexfm](https://github.com/lexfm))
- Ketan Reddy ([@KetanReddy](https://github.com/KetanReddy))
- Rafael Campos ([@rafbcampos](https://github.com/rafbcampos))
- rcampos2 (rafael_campos@intuit.com)

---

# 0.5.2 (Wed Apr 10 2024)

### Release Notes

#### Better DSL Expression Compilation ([#89](https://github.com/player-ui/tools/pull/89))

DSL - Better error messages for expressions with errors during DSL compilation

#### XLR Helper Functions Tests ([#84](https://github.com/player-ui/tools/pull/84))

Add more test coverage for XLR helper functions

#### Fix Oclif CLI Plugins not Registering ([#94](https://github.com/player-ui/tools/pull/94))

- Fix Oclif plugins not registering
- Use shared Oclif macro for CLI build

#### LSP API Improvements ([#85](https://github.com/player-ui/tools/pull/85))

- Allow `LSPAssetsPlugin` to take multiple XLR bundles.
- Allow `LSPPluginPlugin` to take multiple LSP plugins.

#### Fix Import Errors When Using DSL in ESM First Projects ([#87](https://github.com/player-ui/tools/pull/87))

Fix issue with DSL package in ESM projects

#### Bazel 7 ([#86](https://github.com/player-ui/tools/pull/86))

Internal - Use Bazel 7 for builds.

---

#### 🐛 Bug Fix

- Release main [#97](https://github.com/player-ui/tools/pull/97) ([@intuit-svc](https://github.com/intuit-svc))
- Update ts version [#93](https://github.com/player-ui/tools/pull/93) ([@adierkens](https://github.com/adierkens) [@KetanReddy](https://github.com/KetanReddy))
- Better DSL Expression Compilation [#89](https://github.com/player-ui/tools/pull/89) ([@KetanReddy](https://github.com/KetanReddy))
- XLR Helper Functions Tests [#84](https://github.com/player-ui/tools/pull/84) ([@KetanReddy](https://github.com/KetanReddy))
- Fix Oclif CLI Plugins not Registering [#94](https://github.com/player-ui/tools/pull/94) ([@KetanReddy](https://github.com/KetanReddy))
- LSP API Improvements [#85](https://github.com/player-ui/tools/pull/85) ([@KetanReddy](https://github.com/KetanReddy))
- Fix Import Errors When Using DSL in ESM First Projects [#87](https://github.com/player-ui/tools/pull/87) ([@KetanReddy](https://github.com/KetanReddy))
- Update Circle Configs [#88](https://github.com/player-ui/tools/pull/88) ([@KetanReddy](https://github.com/KetanReddy))
- Bazel 7 [#86](https://github.com/player-ui/tools/pull/86) ([@KetanReddy](https://github.com/KetanReddy))
- Setting reading  local TSConf with dsl validate command and TS type-checker [#72](https://github.com/player-ui/tools/pull/72) (alejandro_fimbres@intuit.com [@lexfm](https://github.com/lexfm))

#### Authors: 5

- [@intuit-svc](https://github.com/intuit-svc)
- Adam Dierkens ([@adierkens](https://github.com/adierkens))
- afimbres (alejandro_fimbres@intuit.com)
- Alex Fimbres ([@lexfm](https://github.com/lexfm))
- Ketan Reddy ([@KetanReddy](https://github.com/KetanReddy))

---

# 0.5.1 (Tue Mar 05 2024)

### Release Notes

#### Fix issues with storybook plugin and storybook 6.5.x ([#82](https://github.com/player-ui/tools/pull/82))

Storybook Plugin - Fix linting issues, doc export collision if two XLRs are exported from the same package, and not having player xlr types loaded when parsing types

#### Bugfixs ([#81](https://github.com/player-ui/tools/pull/81))

- CLI: Actually exit with status code if command fails
- XLR: Fix bad migration which prevented index access types which used a `'` to fail
- CLI: Ship babel transforms used by CLI as hard dependencies
- CLI: Use latest bazel rules to prevent `exports` section from being generated at all which may lead to issues in Node 18 environments

---

#### 🐛 Bug Fix

- Release main [#83](https://github.com/player-ui/tools/pull/83) ([@intuit-svc](https://github.com/intuit-svc))
- Fix issues with storybook plugin and storybook 6.5.x [#82](https://github.com/player-ui/tools/pull/82) (ketan_reddy@intuit.com)
- Bugfixs [#81](https://github.com/player-ui/tools/pull/81) (ketan_reddy@intuit.com)

#### Authors: 2

- [@intuit-svc](https://github.com/intuit-svc)
- Ketan Reddy ([@KetanReddy](https://github.com/KetanReddy))

---

# 0.5.0 (Mon Mar 04 2024)

### Release Notes

#### Use New Rules to Skip Custom Entrypoint Insertion for CLI ([#79](https://github.com/player-ui/tools/pull/79))

Fix custom entry points being overridden in CLI package

#### Fix loading XLRs from node_modules in webpack plugin ([#78](https://github.com/player-ui/tools/pull/78))

FIx XLR Webpack plugin loading XLRs from `node_modules`

#### Fix cli package.json ([#77](https://github.com/player-ui/tools/pull/77))

Fix cli package.json main/typings entrypoints

#### Break out dev/hard cli deps ([#76](https://github.com/player-ui/tools/pull/76))

Fix CLI build pulling in non-runtime dependencies

#### Make test dependencies devDependencies ([#75](https://github.com/player-ui/tools/pull/75))

Fix dependencies

#### Update Player Version ([#74](https://github.com/player-ui/tools/pull/74))

Update to latest Player version

#### Bazel 6 ([#64](https://github.com/player-ui/tools/pull/64))

Migrates to Bazel 6, vitest, pnpm, and React 18.

#### Fix/more validation fixes ([#65](https://github.com/player-ui/tools/pull/65))

- XLR: Fix `Exclude` on Union Types
- XLR: Fix shallow clones causing unintended aftereffects 
- XLR SDK: Fix application of base Player Transforms to XLRs when loaded
- CLI: New Plugins to add Plugins to LSP and XLR SDK Transforms

#### Validation Improvements ([#63](https://github.com/player-ui/tools/pull/63))

Properly parse `Excludes` keyword when compiling XLRs

---

#### 🚀 Enhancement

- Bazel 6 [#64](https://github.com/player-ui/tools/pull/64) (rafael_campos@intuit.com [@adierkens](https://github.com/adierkens) [@brocollie08](https://github.com/brocollie08) [@rafbcampos](https://github.com/rafbcampos) [@KetanReddy](https://github.com/KetanReddy))

#### 🐛 Bug Fix

- Release main [#80](https://github.com/player-ui/tools/pull/80) ([@intuit-svc](https://github.com/intuit-svc))
- DSLSchema Type for Validators and DataRefs [#69](https://github.com/player-ui/tools/pull/69) (alejandro_fimbres@intuit.com [@lexfm](https://github.com/lexfm))
- Use New Rules to Skip Custom Entrypoint Insertion for CLI [#79](https://github.com/player-ui/tools/pull/79) ([@KetanReddy](https://github.com/KetanReddy))
- Fix loading XLRs from node_modules in webpack plugin [#78](https://github.com/player-ui/tools/pull/78) ([@KetanReddy](https://github.com/KetanReddy))
- Fix cli package.json [#77](https://github.com/player-ui/tools/pull/77) ([@KetanReddy](https://github.com/KetanReddy))
- Break out dev/hard cli deps [#76](https://github.com/player-ui/tools/pull/76) ([@KetanReddy](https://github.com/KetanReddy))
- Make test dependencies devDependencies [#75](https://github.com/player-ui/tools/pull/75) ([@KetanReddy](https://github.com/KetanReddy))
- Update Player Version [#74](https://github.com/player-ui/tools/pull/74) ([@KetanReddy](https://github.com/KetanReddy))
- Bazel 6: Stamp and Publish support [#70](https://github.com/player-ui/tools/pull/70) ([@KetanReddy](https://github.com/KetanReddy) [@adierkens](https://github.com/adierkens))
- Fix/more validation fixes [#65](https://github.com/player-ui/tools/pull/65) ([@KetanReddy](https://github.com/KetanReddy))
- Sync sync changes with bazel 6 branch [#66](https://github.com/player-ui/tools/pull/66) ([@brocollie08](https://github.com/brocollie08))
- Validation Improvements [#63](https://github.com/player-ui/tools/pull/63) ([@KetanReddy](https://github.com/KetanReddy))

#### Authors: 8

- [@brocollie08](https://github.com/brocollie08)
- [@intuit-svc](https://github.com/intuit-svc)
- Adam Dierkens ([@adierkens](https://github.com/adierkens))
- afimbres (alejandro_fimbres@intuit.com)
- Alex Fimbres ([@lexfm](https://github.com/lexfm))
- Ketan Reddy ([@KetanReddy](https://github.com/KetanReddy))
- Rafael Campos ([@rafbcampos](https://github.com/rafbcampos))
- rcampos2 (rafael_campos@intuit.com)

---

# 0.4.1 (Fri Nov 17 2023)

### Release Notes

#### Update Player version and workflow dependencies ([#57](https://github.com/player-ui/tools/pull/57))

Bump Player version

---

#### 🐛 Bug Fix

- Release main [#58](https://github.com/player-ui/tools/pull/58) ([@intuit-svc](https://github.com/intuit-svc))
- Update Player version and workflow dependencies [#57](https://github.com/player-ui/tools/pull/57) ([@KetanReddy](https://github.com/KetanReddy))

#### Authors: 2

- [@intuit-svc](https://github.com/intuit-svc)
- Ketan Reddy ([@KetanReddy](https://github.com/KetanReddy))

---

# 0.4.0 (Wed Nov 15 2023)

### Release Notes

#### add missing resolve in cli ([#54](https://github.com/player-ui/tools/pull/54))

Add missing `require.resolve` on resolution of `@babel/plugin-transform-react-jsx-source` in cli causing issues when compiling content

### Change Type (required)
- [x] `patch`
- [ ] `minor`
- [ ] `major`

#### Sync/2fd68b7e55dbf6ee8019b6dc47aa84bae84985f1 ([#48](https://github.com/player-ui/tools/pull/48))

Sync up to latest

#### Language support for expressions ([#20](https://github.com/player-ui/tools/pull/20))

- Adds support for validation/auto-completion for expressions defined within tagged templates when using the dsl.

#### Bugfix/long lists ([#36](https://github.com/player-ui/tools/pull/36))

Fixes issues when long constant lists were indexed to create a union.

---

#### 🚀 Enhancement

- feat: adds support for @metatag [#38](https://github.com/player-ui/tools/pull/38) (neveena_ferrao@intuit.com)

#### 🐛 Bug Fix

- Release ${GITHUB_REF##*/} [#56](https://github.com/player-ui/tools/pull/56) ([@intuit-svc](https://github.com/intuit-svc))
- Sync Up To Latest [#55](https://github.com/player-ui/tools/pull/55) ([@KetanReddy](https://github.com/KetanReddy))
- add missing resolve in cli [#54](https://github.com/player-ui/tools/pull/54) ([@KetanReddy](https://github.com/KetanReddy))
- Sync up to latest [#53](https://github.com/player-ui/tools/pull/53) ([@KetanReddy](https://github.com/KetanReddy))
- Sync/2fd68b7e55dbf6ee8019b6dc47aa84bae84985f1 [#48](https://github.com/player-ui/tools/pull/48) ([@KetanReddy](https://github.com/KetanReddy))
- added custom primitives to manifest [#45](https://github.com/player-ui/tools/pull/45) (marlon_ercillo@intuit.com [@mercillo](https://github.com/mercillo))
- Language support for expressions [#20](https://github.com/player-ui/tools/pull/20) ([@adierkens](https://github.com/adierkens) [@KetanReddy](https://github.com/KetanReddy))
- Bugfix/long lists [#36](https://github.com/player-ui/tools/pull/36) ([@KetanReddy](https://github.com/KetanReddy))
- add forked pr workflow [#40](https://github.com/player-ui/tools/pull/40) ([@KetanReddy](https://github.com/KetanReddy))

#### 📝 Documentation

- Add CONTRIBUTING.md [#52](https://github.com/player-ui/tools/pull/52) ([@hborawski](https://github.com/hborawski))

#### Authors: 7

- [@intuit-svc](https://github.com/intuit-svc)
- Adam Dierkens ([@adierkens](https://github.com/adierkens))
- Harris Borawski ([@hborawski](https://github.com/hborawski))
- Ketan Reddy ([@KetanReddy](https://github.com/KetanReddy))
- Marlon "Marky" Ercillo ([@mercillo](https://github.com/mercillo))
- mercillo (marlon_ercillo@intuit.com)
- Neveena ([@neveena](https://github.com/neveena))

---

# 0.3.0 (Thu Jan 26 2023)

### Release Notes

#### Reorg xlr compile target, support player specific post processing ([#29](https://github.com/player-ui/tools/pull/29))

Player CLI - Fixes some Expressions that don't export with variable names.

#### Pin typescript version in cli now that we're using new features. ([#19](https://github.com/player-ui/tools/pull/19))

Fixes errors in projects using typescript < 4.8

#### Feature/xlr variable export ([#18](https://github.com/player-ui/tools/pull/18))

XLR export for static and dynamic `const` exports

---

#### 🚀 Enhancement

- Feature/xlr variable export [#18](https://github.com/player-ui/tools/pull/18) ([@KetanReddy](https://github.com/KetanReddy))

#### 🐛 Bug Fix

- Release ${GITHUB_REF##*/} [#34](https://github.com/player-ui/tools/pull/34) ([@intuit-svc](https://github.com/intuit-svc))
- Reorg xlr compile target, support player specific post processing [#29](https://github.com/player-ui/tools/pull/29) ([@KetanReddy](https://github.com/KetanReddy))
- fix function aliasing exporting wrong name [#28](https://github.com/player-ui/tools/pull/28) ([@hborawski](https://github.com/hborawski))
- forward parameters to synthetic node for arrow functions with parameters [#26](https://github.com/player-ui/tools/pull/26) ([@hborawski](https://github.com/hborawski) [@sugarmanz](https://github.com/sugarmanz))
- Pin typescript version in cli now that we're using new features. [#19](https://github.com/player-ui/tools/pull/19) ([@KetanReddy](https://github.com/KetanReddy))

#### ⚠️ Pushed to `main`

- Try and fix release stage ([@KetanReddy](https://github.com/KetanReddy))

#### Authors: 4

- [@intuit-svc](https://github.com/intuit-svc)
- Harris Borawski ([@hborawski](https://github.com/hborawski))
- Jeremiah Zucker ([@sugarmanz](https://github.com/sugarmanz))
- Ketan Reddy ([@KetanReddy](https://github.com/KetanReddy))

---

# 0.2.1 (Wed Dec 14 2022)

### Release Notes

#### Fix only one heritage class being parsed ([#14](https://github.com/player-ui/tools/pull/14))

Fixed a bug with interfaces that extended more than one other interface.

---

#### 🐛 Bug Fix

- Additional `Extends` Functionality [#16](https://github.com/player-ui/tools/pull/16) ([@KetanReddy](https://github.com/KetanReddy))
- [WIP] Devtools [#11](https://github.com/player-ui/tools/pull/11) ([@sugarmanz](https://github.com/sugarmanz))
- Fix parsing mapped types as heritage classes. Upgrade TypeScript and Fix test venv. [#16](https://github.com/player-ui/tools/pull/16) ([@KetanReddy](https://github.com/KetanReddy))
- Canary support [#13](https://github.com/player-ui/tools/pull/13) ([@sugarmanz](https://github.com/sugarmanz))
- Fix only one heritage class being parsed [#14](https://github.com/player-ui/tools/pull/14) ([@KetanReddy](https://github.com/KetanReddy))

#### ⚠️ Pushed to `main`

- gif instructions ([@sugarmanz](https://github.com/sugarmanz))

#### Authors: 2

- Jeremiah Zucker ([@sugarmanz](https://github.com/sugarmanz))
- Ketan Reddy ([@KetanReddy](https://github.com/KetanReddy))

---

# 0.2.0 (Fri Oct 28 2022)

### Release Notes

#### Recursive Transform Helper ([#9](https://github.com/player-ui/tools/pull/9))

Adds a helper function to make writing recursive TransfromFunctions easier.

#### ObjectType Extends Custom Primitives ([#8](https://github.com/player-ui/tools/pull/8))

ObjectTypes extend custom primitives instead of serializing them. Fixes object literals having the wrong name during some operations when computing union/intersection types.

---

#### 🚀 Enhancement

- Recursive Transform Helper [#9](https://github.com/player-ui/tools/pull/9) ([@KetanReddy](https://github.com/KetanReddy))
- ObjectType Extends Custom Primitives [#8](https://github.com/player-ui/tools/pull/8) ([@KetanReddy](https://github.com/KetanReddy))

#### 🐛 Bug Fix

- Release main [#10](https://github.com/player-ui/tools/pull/10) ([@intuit-svc](https://github.com/intuit-svc))

#### Authors: 2

- [@intuit-svc](https://github.com/intuit-svc)
- Ketan Reddy ([@KetanReddy](https://github.com/KetanReddy))

---

# 0.1.0 (Fri Oct 07 2022)

#### 🚀 Enhancement

- Initial Release [#1](https://github.com/player-ui/tools/pull/1) ([@KetanReddy](https://github.com/KetanReddy))

#### 🐛 Bug Fix

- Release main [#2](https://github.com/player-ui/tools/pull/2) ([@intuit-svc](https://github.com/intuit-svc))

#### ⚠️ Pushed to `main`

- remove gemfile stuff ([@KetanReddy](https://github.com/KetanReddy))
- increase circle executor size ([@KetanReddy](https://github.com/KetanReddy))
- remove GA analytics token ([@KetanReddy](https://github.com/KetanReddy))
- fix bad package names ([@KetanReddy](https://github.com/KetanReddy))
- Use full bazelrc ([@KetanReddy](https://github.com/KetanReddy))
- move in tools repo ([@KetanReddy](https://github.com/KetanReddy))
- Moving packages over from player repo ([@KetanReddy](https://github.com/KetanReddy))
- Initial commit ([@KetanReddy](https://github.com/KetanReddy))

#### Authors: 2

- [@intuit-svc](https://github.com/intuit-svc)
- Ketan Reddy ([@KetanReddy](https://github.com/KetanReddy))
