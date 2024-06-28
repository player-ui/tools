load("@aspect_bazel_lib//lib:directory_path.bzl", "directory_path")
load("@aspect_rules_js//js:defs.bzl", "js_binary", "js_run_binary")
load("@npm//:defs.bzl", "npm_link_all_packages")
load("@rules_player//javascript:defs.bzl", "create_package_json")
load("@aspect_rules_js//npm:defs.bzl", "npm_package")

load("//helpers:defs.bzl", "vitest_config")

npm_link_all_packages(name = "node_modules")

vitest_config(name = "vitest_config")

deps = [
    ":node_modules/@player-tools/devtools-client",
    ":node_modules/@player-tools/devtools-types",
    "//:node_modules/@types/react",
    "//:node_modules/react",
]

build_deps = [
    "//:node_modules/@oclif/errors",
    "//:node_modules/flipper-pkg",
]

peer_deps = [
    "//:node_modules/flipper-plugin",
]

create_package_json(
    name = "package",
    base_package_json = "package.json",
    custom_entrypoints = True,
    dependencies = deps,
    peer_dependencies = peer_deps,
    root_package_json = "//:package.json",
    substitutions = {
        "0.0.0-PLACEHOLDER": "{STABLE_VERSION}",
    },
)

directory_path(
    name = "flipper_pkg_entry",
    directory = "//:node_modules/flipper-pkg/dir",
    path = "bin/run",
)

js_binary(
    name = "flipper_pkg",
    data = ["//:node_modules/flipper-pkg"],
    entry_point = ":flipper_pkg_entry",
)

js_run_binary(
    name = "flipper-desktop-client",
    srcs = glob(["src/**/*"]) + [":package"] + deps + peer_deps + build_deps,
    args = ["bundle"],
    chdir = package_name(),
    out_dirs = ["dist"],
    stamp = -1,
    tool = ":flipper_pkg",
)

npm_package(
    name="flipper-plugin-player-ui-devtools",
    package="flipper-plugin-player-ui-devtools",
    visibility = ["//visibility:public"],
    srcs = [":flipper-desktop-client"] + glob(["src/**/*"]) + [":package"] + deps + peer_deps + build_deps,
)

js_binary(
    name = "flipper-plugin-player-ui-devtools.npm-publish",
    chdir = package_name(),
    data = [":flipper-plugin-player-ui-devtools"],
    entry_point = "@aspect_rules_js//npm/private:npm_publish_mjs",
    include_npm = True,
)