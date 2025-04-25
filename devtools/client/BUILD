load("@npm//:defs.bzl", "npm_link_all_packages")
load("@rules_player//javascript:defs.bzl", "js_pipeline")
load("//helpers:defs.bzl", "tsup_config", "vitest_config")

npm_link_all_packages(name = "node_modules")

tsup_config(name = "tsup_config")

vitest_config(name = "vitest_config")

js_pipeline(
    package_name = "@player-tools/devtools-client",
    deps = [
        ":node_modules/@player-tools/devtools-messenger",
        ":node_modules/@player-tools/devtools-types",
        "//:node_modules/@chakra-ui/react",
        "//:node_modules/@player-ui/pubsub-plugin",
        "//:node_modules/@player-ui/react",
        "//:node_modules/@player-ui/common-expressions-plugin",
        "//:node_modules/@player-ui/common-types-plugin",
        "//:node_modules/@player-ui/data-change-listener-plugin",
        "//:node_modules/@devtools-ui/plugin",
        "//:node_modules/@types/react",
        "//:node_modules/immer",
        "//:node_modules/dset",
        "//:node_modules/react",
        "//:node_modules/react-error-boundary",
        "//:node_modules/dequal",
        "//:node_modules/@devtools-ds/themes"
    ],
)
