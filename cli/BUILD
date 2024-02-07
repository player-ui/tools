load("@aspect_rules_js//js:defs.bzl", "js_library")
load("@aspect_rules_js//npm:defs.bzl", "npm_package")
load("@aspect_rules_swc//swc:defs.bzl", "swc")
load("@aspect_rules_ts//ts:defs.bzl", "ts_project")
load("@bazel_skylib//lib:partial.bzl", "partial")
load("@npm//:defs.bzl", "npm_link_all_packages")
load("@npm//:oclif/package_json.bzl", oclif_bin = "bin")
load("@rules_player//javascript:defs.bzl", "create_package_json", "eslint_test", "vitest_test")
load("//helpers:defs.bzl", "vitest_config")
load(":gen_package_json.bzl", "gen_package_json")

name = "cli"

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

ts_project_name = name + "_compile"

ts_project_target = ":{}".format(ts_project_name)

ts_project(
    name = ts_project_name,
    srcs = glob(
        [
            "bin/**/*",
            "src/**/*",
        ],
        exclude = [
            "__tests__",
        ],
    ),
    declaration = True,
    transpiler = partial.make(
        swc,
        swcrc = "//:.swcrc",
    ),
    tsconfig = "//:tsconfig",
    validate = False,
    deps = dependencies,
)

create_package_json_name = name + "_package_json"

create_package_json_target = ":{}".format(create_package_json_name)

gen_package_json(
    name = create_package_json_name,
    base_package = "package.json",
    dependencies = dependencies,
)

# create_package_json(
#     name = create_package_json_name,
#     base_package_json = "package.json",
#     dependencies = dependencies,
#     root_package_json = "//:package.json",
# )

manifest_name = name + "_manifest"

manifest_target = ":{}".format(manifest_name)

oclif_bin.oclif(
    name = manifest_name,
    srcs = [
        ts_project_target,
        create_package_json_target,
    ],
    outs = ["oclif.manifest.json"],
    args = ["manifest"],
    chdir = package_name(),
)

js_library_name = name + "_lib"

js_library_target = ":{}".format(js_library_name)

js_library(
    name = js_library_name,
    srcs = [
        ts_project_target,
        create_package_json_target,
        manifest_target,
    ],
    deps = dependencies,
)

vitest_test(
    name = name + "_vitest",
    config = ":vitest_config",
    data = glob(["src/**/*"]) + dependencies + ["//:vitest_config"],
    node_modules = "//:node_modules",
)

eslint_test(
    name = name + "_eslint",
    srcs = glob(["src/**/*"]),
    data = glob(["src/**/*"]) + dependencies + ["//:eslint_config"],
    node_modules = "//:node_modules",
)

npm_package(
    name = name,
    srcs = [js_library_target],
    package = "@player-tools/" + name,
    visibility = ["//visibility:public"],
)
