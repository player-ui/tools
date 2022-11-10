load("//:index.bzl", "javascript_pipeline")

javascript_pipeline(
    name = "@player-tools/devtools-client",
    dependencies = [
        "@npm//@reduxjs/toolkit",
        "//devtools/common",
    ],
    peer_dependencies = [],
    test_data = [],
)

alias(
    name = "client",
    actual = ":@player-tools/devtools-client",
    visibility = ["//devtools:__subpackages__"],
)
