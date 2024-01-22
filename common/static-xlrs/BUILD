load("@aspect_rules_js//npm:defs.bzl", "npm_package")
load("//helpers:defs.bzl", "tsup_config")

tsup_config(name = "tsup_config")

name = "static-xlrs"

package_name = "{}/{}".format("@player-tools", name)

npm_package(
    name = name,
    package = package_name,
    srcs = glob(["src/**/*"]) + ["package.json"],
    visibility = ["//visibility:public"],
)
