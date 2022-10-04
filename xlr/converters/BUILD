
load("//:index.bzl", "javascript_pipeline")

javascript_pipeline(
    name = "@player-tools/xlr-converters",
    dependencies = [
        "//xlr/types:@player-tools/xlr",
        "//xlr/utils:@player-tools/xlr-utils"
    ],
    peer_dependencies = [
        "@npm//typescript"
    ]
)