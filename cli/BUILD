load("@npm//:defs.bzl", "npm_link_all_packages")
load("@rules_player//javascript:defs.bzl", "oclif_pipeline")
load("//helpers:defs.bzl", "tsup_config", "vitest_config")

npm_link_all_packages(name = "node_modules")

tsup_config(name = "tsup_config")

vitest_config(name = "vitest_config")

oclif_pipeline(
    package_name = "@player-tools/cli",
    build_deps = [
        "//:node_modules/@types/babel__register",
        "//:node_modules/@types/fs-extra",
        "//:node_modules/@types/mkdirp",
        "//:node_modules/std-mocks",
        "//:node_modules/@types/std-mocks",
        "//:node_modules/vitest",
    ],
    test_deps = [
        "//:node_modules",
        "//:vitest_config",
    ],
    deps = [
        ":node_modules/@player-tools/dsl",
        ":node_modules/@player-tools/json-language-service",
        ":node_modules/@player-tools/xlr",
        ":node_modules/@player-tools/xlr-converters",
        ":node_modules/@player-tools/xlr-sdk",
        ":node_modules/@player-tools/xlr-utils",
        "//:node_modules/@babel/plugin-transform-react-jsx-source",
        "//:node_modules/@babel/preset-env",
        "//:node_modules/@babel/preset-react",
        "//:node_modules/@babel/preset-typescript",
        "//:node_modules/@babel/register",
        "//:node_modules/@oclif/core",
        "//:node_modules/@oclif/plugin-legacy",
        "//:node_modules/@oclif/plugin-plugins",
        "//:node_modules/chalk",
        "//:node_modules/cosmiconfig",
        "//:node_modules/cross-fetch",
        "//:node_modules/dlv",
        "//:node_modules/easy-table",
        "//:node_modules/elegant-spinner",
        "//:node_modules/figures",
        "//:node_modules/fs-extra",
        "//:node_modules/globby",
        "//:node_modules/log-symbols",
        "//:node_modules/log-update",
        "//:node_modules/mkdirp",
        "//:node_modules/react",
        "//:node_modules/tapable-ts",
        "//:node_modules/tslib",
        "//:node_modules/typescript",
        "//:node_modules/vscode-languageserver-textdocument",
        "//:node_modules/vscode-languageserver-types",
    ],
)

js_binary(
    name = "dsl_bin",
    data = [
        "package.json",
        ":player-cli-bundle",
    ] + dependencies,
    entry_point = "bin/run",
    visibility = ["//visibility:public"],
)
