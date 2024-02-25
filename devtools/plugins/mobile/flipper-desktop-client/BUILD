load("@npm//:defs.bzl", "npm_link_all_packages")
load("@rules_player//javascript:defs.bzl", "js_pipeline")
load("//helpers:defs.bzl", "tsup_config", "vitest_config")

npm_link_all_packages(name = "node_modules")

tsup_config(name = "tsup_config")

vitest_config(name = "vitest_config")

js_pipeline(
    package_name = "flipper-plugin-player-ui-devtools",
    deps = [
        ":node_modules/@player-tools/devtools-client",
        ":node_modules/@player-tools/devtools-types",
        "//:node_modules/@types/react",
        "//:node_modules/flipper-pkg",
        "//:node_modules/flipper-plugin",
        "//:node_modules/react",
    ],
)
