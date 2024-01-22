load("@rules_player//javascript:defs.bzl", "js_pipeline")
load("@npm//:defs.bzl", "npm_link_all_packages")
load("//helpers:defs.bzl", "tsup_config", "vitest_config")

npm_link_all_packages(name = "node_modules")

tsup_config(name = "tsup_config")

vitest_config(name = "vitest_config")

js_pipeline(
    package_name = "@player-tools/xlr-asset-docgen-webpack-plugin",
    test_deps = [
        "//:vitest_config",
    ],
    deps = [
        ":node_modules/@player-tools/xlr",
        ":node_modules/@player-tools/xlr-sdk",
        ":node_modules/@player-tools/xlr-utils",
        "//:node_modules/@types/micromatch",
        "//:node_modules/@types/webpack",
        "//:node_modules/globby",
        "//:node_modules/micromatch",
        "//:node_modules/modify-source-webpack-plugin",
        "//:node_modules/react-docgen-typescript",
        "//:node_modules/webpack",
    ],
)
