load("@npm//:defs.bzl", "npm_link_all_packages")
load("@rules_player//javascript:defs.bzl", "js_pipeline")
load("//helpers:defs.bzl", "tsup_config", "vitest_config")

npm_link_all_packages(name = "node_modules")

vitest_config(name = "vitest_config")

tsup_config(name = "tsup_config")

js_pipeline(
    package_name = "@player-tools/xlr",
)
