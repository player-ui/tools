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
