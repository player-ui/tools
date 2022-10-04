
load("//:index.bzl", "javascript_pipeline")

javascript_pipeline(
    name = "@player-tools/xlr-asset-docgen-webpack-plugin",
    dependencies = [
        "//xlr/types:@player-tools/xlr",
        "//xlr/sdk:@player-tools/xlr-sdk",
        "//xlr/utils:@player-tools/xlr-utils",
        "@npm//react-docgen-typescript",
        "@npm//@types/micromatch",
        "@npm//micromatch",
        "@npm//globby",
        "@npm//webpack",
        "@npm//@types/webpack",
        "@npm//modify-source-webpack-plugin"
    ]
)