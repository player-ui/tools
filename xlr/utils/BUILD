
load("//:index.bzl", "javascript_pipeline")

javascript_pipeline(
    name = "@player-tools/xlr-utils",
    dependencies = [
        "//xlr/types:@player-tools/xlr",
        "@npm//@typescript/vfs",
    ],
    peer_dependencies = [
        "@npm//typescript",
        "@npm//jsonc-parser"
    ],
    test_data = [
        "//xlr/testing-utils:@player-tools/xlr-testing-utils"
    ]
)