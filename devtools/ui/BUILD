load("@npm//:defs.bzl", "npm_link_all_packages")
load("@rules_player//javascript:defs.bzl", "js_pipeline")
load("//helpers:defs.bzl", "tsup_config", "vitest_config")

npm_link_all_packages(name = "node_modules")

tsup_config(name = "tsup_config")

vitest_config(name = "vitest_config")

js_pipeline(
    package_name = "@player-tools/devtools-ui",
    peer_deps = [
        "//:node_modules/react",
        "//:node_modules/@types/react",
        "//:node_modules/framer-motion",
        "//:node_modules/@emotion/styled",
    ],
    test_deps = [
        "//:node_modules",
        "//:vitest_config",
    ],
    deps = [
        ":node_modules/@player-tools/devtools-client",
        ":node_modules/@player-tools/devtools-common",
        "//:node_modules/@chakra-ui/react",
        "//:node_modules/@devtools-ds/console",
        "//:node_modules/@devtools-ds/icon",
        "//:node_modules/@devtools-ds/navigation",
        "//:node_modules/@devtools-ds/object-inspector",
        "//:node_modules/@devtools-ds/object-parser",
        "//:node_modules/@devtools-ds/table",
        "//:node_modules/@devtools-ds/themes",
        "//:node_modules/@player-ui/types",
        "//:node_modules/@reduxjs/toolkit",
        "//:node_modules/@types/react-redux",
        "//:node_modules/change-case",
        "//:node_modules/copy-to-clipboard",
        "//:node_modules/react-flame-graph",
        "//:node_modules/react-redux",
        "//:node_modules/react-split",
        "//:node_modules/redux",
    ],
)
