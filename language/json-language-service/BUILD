load("@npm//:defs.bzl", "npm_link_all_packages")
load("@rules_player//javascript:defs.bzl", "js_pipeline")
load("//helpers:defs.bzl", "tsup_config", "vitest_config")

npm_link_all_packages(name = "node_modules")

tsup_config(name = "tsup_config")

vitest_config(name = "vitest_config")

js_pipeline(
    package_name = "@player-tools/json-language-service",
    test_deps = [
        "//:vitest_config",
    ],
    deps = [
        ":node_modules/@player-tools/static-xlrs",
        ":node_modules/@player-tools/xlr",
        ":node_modules/@player-tools/xlr-sdk",
        ":node_modules/@player-tools/xlr-utils",
        "//:node_modules/change-case",
        "//:node_modules/cross-fetch",
        "//:node_modules/detect-indent",
        "//:node_modules/jsonc-parser",
        "//:node_modules/tapable-ts",
        "//:node_modules/timm",
        "//:node_modules/typescript",
        "//:node_modules/vscode-languageserver-textdocument",
        "//:node_modules/vscode-languageserver-types",
    ],
)
