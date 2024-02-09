load("@aspect_rules_js//js:defs.bzl", "js_library")
load("@aspect_rules_js//npm:defs.bzl", "npm_package")
load("@aspect_rules_swc//swc:defs.bzl", "swc")
load("@aspect_rules_ts//ts:defs.bzl", "ts_project", "ts_config")
load("@bazel_skylib//lib:partial.bzl", "partial")
load("@npm//:defs.bzl", "npm_link_all_packages")
load("@npm//:oclif/package_json.bzl", oclif_bin = "bin")
load("@rules_player//javascript:defs.bzl", "create_package_json", "eslint_test", "vitest_test")
load("//helpers:defs.bzl", "vitest_config")
load(":gen_package_json.bzl", "gen_package_json")

npm_link_all_packages(name = "node_modules")
vitest_config(name = "vitest_config")

dependencies = [
    "//:node_modules/react",
    "//:node_modules/tapable-ts",
    "//:node_modules/@babel/register",
    "//:node_modules/@types/babel__register",
    "//:node_modules/@types/fs-extra",
    "//:node_modules/@types/mkdirp",
    "//:node_modules/@oclif/core",
    "//:node_modules/@oclif/plugin-legacy",
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
    "//:node_modules/vscode-languageserver-textdocument",
    "//:node_modules/vscode-languageserver-types",
    "//:node_modules/typescript",
    "//:node_modules/vitest",
    "//:node_modules/tslib",
    "//:node_modules/std-mocks",
    "//:node_modules/@types/std-mocks",
    ":node_modules/@player-tools/dsl",
    ":node_modules/@player-tools/json-language-service",
    ":node_modules/@player-tools/xlr",
    ":node_modules/@player-tools/xlr-sdk",
    ":node_modules/@player-tools/xlr-utils",
    ":node_modules/@player-tools/xlr-converters",
]

ts_config(
    name = "tsconfig",
    src = "tsconfig.json",
    deps = [
        "//:tsconfig",
    ],
)

ts_project(
    name = "player-cli-build",
    srcs = glob(
        [
            "bin/**/*",
            "src/**/*",
        ],
        exclude = [
            "__tests__",
        ],
    ),
    out_dir = "dist",
    root_dir = "src",
    declaration = True,
    transpiler = "tsc",
    tsconfig = ":tsconfig",
    validate = False,
    deps = dependencies,
)

gen_package_json(
    name = "player-cli-package_json",
    base_package = "package.json",
    dependencies = dependencies,
)


oclif_bin.oclif(
    name = "player-cli-manifest",
    srcs = [
        ":player-cli-build",
        ":player-cli-package_json",
    ],
    outs = ["oclif.manifest.json"],
    args = ["manifest"],
    chdir = package_name(),
)

js_library(
    name = "player-cli-bundle",
    srcs = [
        ":player-cli-build",
        ":player-cli-package_json",
        ":player-cli-manifest",
    ],
    deps = dependencies,
)

vitest_test(
    name = "player-cli-unit",
    config = ":vitest_config",
    data = glob(["src/**/*"]) + dependencies + ["//:vitest_config"],
    node_modules = "//:node_modules",
)

eslint_test(
    name = "player-cli-lint",
    srcs = glob(["src/**/*"]),
    data = glob(["src/**/*"]) + dependencies + ["//:eslint_config"],
    node_modules = "//:node_modules",
)

npm_package(
    name = "player-cli-publish",
    srcs = [":player-cli-bundle"],
    package = "@player-tools/cli",
    visibility = ["//visibility:public"],
)
