load("@npm//:defs.bzl", "npm_link_all_packages")
load("@rules_player//javascript:defs.bzl", "js_pipeline")
load("//helpers:defs.bzl", "tsup_config", "vitest_config")

npm_link_all_packages(name = "node_modules")

tsup_config(name = "tsup_config")

vitest_config(name = "vitest_config")

js_pipeline(
    package_name = "@player-tools/dsl",
    peer_deps = [
        "//:node_modules/react",
        "//:node_modules/@types/react",
    ],
    test_deps = [
        "//:node_modules",
        "//:vitest_config",
    ],
    deps = [
        "//:node_modules/@player-ui/player",
        "//:node_modules/@player-ui/types",
        "//:node_modules/@types/mkdirp",
        "//:node_modules/chalk",
        "//:node_modules/command-line-application",
        "//:node_modules/dequal",
        "//:node_modules/fs-extra",
        "//:node_modules/globby",
        "//:node_modules/jsonc-parser",
        "//:node_modules/mkdirp",
        "//:node_modules/react-flatten-children",
        "//:node_modules/react-json-reconciler",
        "//:node_modules/react-merge-refs",
        "//:node_modules/source-map-js",
        "//:node_modules/tapable-ts",
        "//:node_modules/ts-node",
        "//:node_modules/typescript",
    ],
)
