load("//:index.bzl", "javascript_pipeline")

javascript_pipeline(
    name = "@player-tools/devtools-common",
    dependencies = [
        "@npm//@player-ui/logger",
        "@npm//@player-ui/types",
        "@npm//@reduxjs/toolkit",
        "@npm//@types/uuid",
        "@npm//uuid",
    ],
    peer_dependencies = [],
    test_data = [],
)

alias(
    name = "common",
    actual = ":@player-tools/devtools-common",
    visibility = ["//devtools:__subpackages__"],
)
