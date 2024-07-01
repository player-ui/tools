load("@rules_player//javascript:defs.bzl", "js_pipeline")
load("@npm//:defs.bzl", "npm_link_all_packages")
load("//helpers:defs.bzl", "vitest_config")

npm_link_all_packages(name = "node_modules")


vitest_config(name = "vitest_config")

deps = [
    ":node_modules/@player-tools/devtools-client",
    ":node_modules/@player-tools/devtools-types",
    "//:node_modules/@types/react",
    "//:node_modules/react",
]

build_deps = [
    "//:node_modules/@oclif/errors",
    "//:node_modules/flipper-pkg",
]

peer_deps = [
    "//:node_modules/flipper-plugin",
]

js_pipeline(
    package_name = "flipper-plugin-player-ui-devtools",
    deps = deps,
    build_deps = build_deps,
    peer_deps = peer_deps
)
