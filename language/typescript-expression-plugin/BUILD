
load("//:index.bzl", "javascript_pipeline")

javascript_pipeline(
    name = "@player-tools/typescript-expression-plugin",
    dependencies = [
      "//xlr/types:@player-tools/xlr",
      "//xlr/sdk:@player-tools/xlr-sdk",
      "//xlr/utils:@player-tools/xlr-utils",
      "@npm//@player-ui/player",
      "@npm//typescript-template-language-service-decorator",
    ],
    test_data = [
        "//common:@player-tools/static-xlrs"
    ]
)