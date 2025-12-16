load("@aspect_rules_js//js:defs.bzl", "js_library")
load("@bazel_skylib//:bzl_library.bzl", "bzl_library")

exports_files([
    "tsup.config.ts.tmpl",
    "vitest.config.mts.tmpl",
    "defs.bzl",
    "pytest_wrapper.py"
])

js_library(
    name = "vitest_coverage_mapper",
    srcs = ["vitest_coverage_mapper.ts"],
    visibility = ["//visibility:public"],
)

bzl_library(
    name = "defs",
    srcs = ["defs.bzl"],
    visibility = ["//visibility:public"],
)
