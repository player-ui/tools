load("@aspect_rules_ts//ts:defs.bzl", "ts_config")
load("@npm//:defs.bzl", "npm_link_all_packages")
load("@npm//:fluent-gen-ts/package_json.bzl", fluent_gen_ts_bin = "bin")
load("@rules_player//javascript:defs.bzl", "js_pipeline")
load("//helpers:defs.bzl", "tsup_config", "vitest_config")

npm_link_all_packages(name = "node_modules")

tsup_config(name = "tsup_config")

vitest_config(name = "vitest_config")

# Wrap local tsconfig with path aliases
ts_config(
    name = "tsconfig",
    src = "tsconfig.json",
    deps = ["//:tsconfig"],
)

# Generate mocks before building using fluent-gen-ts
fluent_gen_ts_bin.fluent_gen_ts(
    name = "gen_mocks",
    srcs = glob(
        ["src/**/*"],
        exclude = ["src/core/mocks/generated/**"],
    ) + [
        ".fluentgenrc.json",
        "tsconfig.json",
        "//:node_modules/@player-ui/types",
        "//:node_modules/typescript",
        "//:node_modules/fluent-gen-ts",
    ],
    out_dirs = ["src/core/mocks/generated"],
    args = ["batch"],
    chdir = package_name(),
)

js_pipeline(
    package_name = "@player-tools/fluent",
    tsconfig = ":tsconfig",
    srcs = glob(
        ["src/**/*"],
        exclude = ["src/core/mocks/generated/**"],
    ) + [":gen_mocks"],
    create_package_json_args = {
        "additional_exports": {
            "./plugin": "./src/gen/plugin.mjs",
        },
    },
    build_deps = [
        "//:tsup_config",
        "//:typings",
        ":tsconfig",
    ],
    test_deps = [
        "//:node_modules",
        "//:vitest_config",
    ],
    deps = [
        "//:node_modules/@player-ui/types",
        "//:node_modules/dequal",
        "//:node_modules/fluent-gen-ts",
        "//:node_modules/typescript",
        "//:node_modules/tapable-ts",
    ],
)
