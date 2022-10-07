
load("//:index.bzl", "javascript_pipeline")

javascript_pipeline(
    name = "@player-tools/language-server",
    dependencies = [
        "//language/service:@player-tools/language-service",
        "@npm//vscode-languageserver",
        "@npm//vscode-languageserver-textdocument"
    ],
    data = [
        "tsconfig.json"
    ]
)