
load("//:index.bzl", "javascript_pipeline")

javascript_pipeline(
    name = "@player-tools/xlr-sdk",
    dependencies = [
        "//xlr/types:@player-tools/xlr",
        "//xlr/utils:@player-tools/xlr-utils",
        "//xlr/converters:@player-tools/xlr-converters",
        "@npm//jsonc-parser",
        "@npm//@types/node",
        "@npm//@types/fs-extra",
        "@npm//fs-extra",
    ],
    peer_dependencies = [
        "@npm//typescript"
    ],
    test_data = [
        "//common:@player-tools/static-xlrs",
    ]
)