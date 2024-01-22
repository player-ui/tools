load("@npm//:defs.bzl", "npm_link_all_packages")
load("@rules_player//javascript:defs.bzl", "js_pipeline")
load("//helpers:defs.bzl", "tsup_config", "vitest_config")

npm_link_all_packages(name = "node_modules")

tsup_config(name = "tsup_config")

vitest_config(name = "vitest_config")

js_pipeline(
    package_name = "@player-tools/xlr-sdk",
    peer_deps = [
        "//:node_modules/typescript",
    ],
    test_deps = [
        ":node_modules/@player-tools/static-xlrs",
        "//:vitest_config",
    ],
    deps = [
        ":node_modules/@player-tools/xlr",
        ":node_modules/@player-tools/xlr-converters",
        ":node_modules/@player-tools/xlr-utils",
        "//:node_modules/@types/fs-extra",
        "//:node_modules/@types/node",
        "//:node_modules/fs-extra",
        "//:node_modules/jsonc-parser",
    ],
)
