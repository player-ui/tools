load("@aspect_rules_js//npm:defs.bzl", "npm_package")
load("//helpers:defs.bzl", "tsup_config")

tsup_config(name = "tsup_config")

npm_package(
    tags = ["do-not-publish"],
    name = "static-xlrs",
    package = "@player-tools/static-xlrs",
    srcs = glob(["src/**/*"]) + ["package.json"],
    visibility = ["//visibility:public"],
)
