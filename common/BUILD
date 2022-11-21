load("@rules_player//javascript/package_json:index.bzl", "merge_json", "create_contributors", "create_package_json")
load("@build_bazel_rules_nodejs//:index.bzl", "js_library", "pkg_npm")
load("//:index.bzl", "GIT_REPO", "LICENSE", "DOCS_URL", "REPO_URL", "ISSUES_URL")
package(default_visibility = ["//visibility:public"])

filegroup(
    name = "static_xlrs",
    srcs = glob(["static_xlrs/**"])
)

# Should split this up into 2 modules

create_package_json(
    name = "xlr_pkg_json",
    package_name = "@player-tools/static-xlrs",
    entry = "index.js",
    out_dir = "dist",
    root_package_json = "//:package.json",
    private = True,
    dependencies = [],
)

js_library(
    name = "@player-tools/static-xlrs",
    srcs=[
        ":static_xlrs",
    ],
    package_name = "@player-tools/static-xlrs",
    deps = [
        ":xlr_pkg_json"
    ]
)


create_contributors(
    name = "pkg_json_contrib",
    all_contributors = "//:.all-contributorsrc",
)

genrule(
    name = "pkg_json_base",
    outs = ["pkg_json_base.json"],
    cmd = """
        echo '{
            "sideEffects": false,
            "license": "%s",
            "repository": {
                "type": "git",
                "url": "%s"
            },
            "bugs": {
                "url": "%s"
            },
            "homepage": "%s"
        }' > $@
    """ % (LICENSE, REPO_URL, ISSUES_URL, DOCS_URL),
)

merge_json(
    name = "pkg_json_template",
    srcs = [
        ":pkg_json_base",
        ":pkg_json_contrib",
    ]
)

exports_files([
    "jest-setup.js",
    "jest-coverage-mapper.js",
])