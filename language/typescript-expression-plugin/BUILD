
load("//:index.bzl", "javascript_pipeline")

javascript_pipeline(
    name = "@player-tools/typescript-expression-plugin",
    dependencies = [
      "@npm//@player-ui/player",
      "@npm//typescript-template-language-service-decorator",
    ],
    test_data = [
        "//common:static_xlrs"
    ]
)