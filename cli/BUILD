load("@aspect_rules_js//js:defs.bzl", "js_binary", "js_library")
load("@aspect_rules_js//npm:defs.bzl", "npm_package")
load("@aspect_rules_ts//ts:defs.bzl", "ts_config", "ts_project")
load("@npm//:defs.bzl", "npm_link_all_packages")
load("@npm//:oclif/package_json.bzl", oclif_bin = "bin")
load("@rules_player//javascript:defs.bzl", "create_package_json", "eslint_test", "vitest_test")
load("//helpers:defs.bzl", "vitest_config")

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
            "**/__tests__/*",
            "**/*.test.*",
        ],
    ),
    declaration = True,
    out_dir = "dist",
    root_dir = "src",
    transpiler = "tsc",
    tsconfig = ":tsconfig",
    validate = False,
    deps = dependencies,
)

create_package_json(
    name = "player-cli-package_json",
    base_package_json = "package.json",
    dependencies = dependencies,
    root_package_json = "//:package.json",
    substitutions = {
        "0.0.0-PLACEHOLDER": "{STABLE_VERSION}",
    },
)

oclif_bin.oclif(
    name = "player-cli-manifest",
    srcs = [
        "package.json",
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
        ":player-cli-manifest",
        ":player-cli-package_json",
    ] + glob(["bin/*"]),
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
    name = "cli",
    srcs = [
        "README.md",
        ":player-cli-bundle",
    ],
    allow_overwrites = True,
    package = "@player-tools/cli",
    replace_prefixes = {
        "player-cli-package_json": "package",
    },
    visibility = ["//visibility:public"],
)

js_binary(
    name = "cli.npm-publish",
    chdir = package_name() + "/cli",
    data = [":cli"],
    entry_point = "@aspect_rules_js//npm/private:npm_publish_mjs",
    # required to make npm to be available in PATH
    include_npm = True,
)
