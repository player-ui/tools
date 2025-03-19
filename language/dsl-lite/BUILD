load("@npm//:defs.bzl", "npm_link_all_packages")
load("@rules_player//javascript:defs.bzl", "js_pipeline")
load("//helpers:defs.bzl", "vitest_config")

npm_link_all_packages(name = "node_modules")

vitest_config(name = "vitest_config")

js_pipeline(
    package_name = "@player-tools/dsl-lite",
    tsup_config = ":tsup.config.ts",
    test_deps = [
        "//:node_modules",
        "//:vitest_config",
    ],
    deps = [
        "//:node_modules/@player-ui/types",
        "//:node_modules/typescript",
    ],
)
