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
