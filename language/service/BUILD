
load("//:index.bzl", "javascript_pipeline")

javascript_pipeline(
    name = "@player-tools/language-service",
    dependencies = [
        "//xlr/types:@player-tools/xlr",
        "//xlr/sdk:@player-tools/xlr-sdk",
        "//xlr/utils:@player-tools/xlr-utils",
        "@npm//change-case",
        "@npm//cross-fetch",
        "@npm//detect-indent",
        "@npm//jsonc-parser",
        "@npm//tapable-ts",
        "@npm//timm",
        "@npm//typescript",
        "@npm//vscode-languageserver-textdocument",
        "@npm//vscode-languageserver-types"
    ],
    data = [
        "tsconfig.json"
    ],
    test_data = [
        "//common:static_xlrs"
    ]
)