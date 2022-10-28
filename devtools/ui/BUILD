load("//:index.bzl", "javascript_pipeline")

javascript_pipeline(
    name = "@player-tools/devtools-ui",
    dependencies = [
        "//devtools/client",
        "@npm//@chakra-ui/react",
        "@npm//@devtools-ds/console",
        "@npm//@devtools-ds/icon",
        "@npm//@devtools-ds/navigation",
        "@npm//@devtools-ds/object-inspector",
        "@npm//@devtools-ds/table",
        "@npm//@devtools-ds/themes",
        "@npm//@reduxjs/toolkit",
        "@npm//change-case",
        "@npm//copy-to-clipboard",
        "@npm//react-flame-graph",
        "@npm//react-split",
    ],
    js_library_data = [
        ":DevtoolsUI",
    ],
    library_name = "DevtoolsUI",
    peer_dependencies = [
        "@npm//react",
        "@npm//@types/react",
        "@npm//framer-motion",
        "@npm//@emotion/styled",
    ],
    test_data = [
        "@npm//@testing-library/react",
    ],
)

alias(
    name = "ui",
    actual = ":@player-tools/devtools-ui",
    visibility = ["//devtools:__subpackages__"],
)
