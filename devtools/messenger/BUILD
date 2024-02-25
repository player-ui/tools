load("@npm//:defs.bzl", "npm_link_all_packages")
load("@rules_player//javascript:defs.bzl", "js_pipeline")
load("//helpers:defs.bzl", "tsup_config", "vitest_config")

npm_link_all_packages(name = "node_modules")

tsup_config(name = "tsup_config")

vitest_config(name = "vitest_config")

js_pipeline(
    package_name = "@player-tools/devtools-messenger",
    peer_deps = [
        "//:node_modules/typescript",
    ],
    deps = [
        ":node_modules/@player-tools/devtools-types",
        "//:node_modules/@types/node",
        "//:node_modules/tiny-uid",
    ],
)
