
load("//:index.bzl", "javascript_pipeline")

javascript_pipeline(
    name = "@player-tools/json-language-server",
    dependencies = [
        "//language/json-language-service:@player-tools/json-language-service",
        "@npm//vscode-languageserver",
        "@npm//vscode-languageserver-textdocument"
    ],
    data = [
        "tsconfig.json"
    ]
)