load("@aspect_rules_js//js:defs.bzl", "js_binary", "js_run_binary")
load("@npm//:defs.bzl", "npm_link_all_packages")
load("@rules_player//javascript:defs.bzl", "js_pipeline")
load("//helpers:defs.bzl", "tsup_config", "vitest_config")

npm_link_all_packages(name = "node_modules")

tsup_config(name = "tsup_config")

vitest_config(name = "vitest_config")

# Binary for generating mock builders
js_binary(
    name = "generate_mocks_bin",
    data = [
        ":node_modules/@player-tools/fluent-generator",
        ":node_modules/@player-tools/xlr-converters",
        "//:node_modules/@player-ui/types",
        "//:node_modules/typescript",
    ],
    entry_point = "scripts/generate-mocks.ts",
)

# Generate mock builder files from type definitions
js_run_binary(
    name = "generate_mocks",
    srcs = glob(["src/core/mocks/types/*.ts"]),
    args = [
        "--types-dir=language/dsl/fluent/src/core/mocks/types",
        "--output-dir=language/dsl/fluent/src/core/mocks/generated",
    ],
    out_dirs = ["src/core/mocks/generated"],
    tool = ":generate_mocks_bin",
)

js_pipeline(
    package_name = "@player-tools/fluent",
    srcs = glob(
        ["src/**/*"],
        exclude = ["src/core/mocks/generated/**"],
    ) + [":generate_mocks"],
    test_deps = [
        "//:node_modules",
        "//:vitest_config",
    ],
    deps = [
        "//:node_modules/@player-ui/types",
        "//:node_modules/dequal",
        "//:node_modules/typescript",
        "//:node_modules/tapable-ts",
    ],
)
