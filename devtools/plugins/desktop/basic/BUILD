load("@aspect_rules_js//js:defs.bzl", "js_run_binary")
load("@npm//:defs.bzl", "npm_link_all_packages")
load("@rules_player//javascript:defs.bzl", "js_pipeline")
load("//helpers:defs.bzl", "tsup_config", "vitest_config")

npm_link_all_packages(name = "node_modules")

tsup_config(name = "tsup_config")

vitest_config(name = "vitest_config")

dependencies = [
    ":node_modules/@player-tools/devtools-desktop-plugins-common",
    ":node_modules/@player-tools/devtools-types",
    ":node_modules/@player-tools/dsl",
    ":node_modules/@player-tools/cli",
    "//:node_modules/@player-ui/common-types-plugin",
    "//:node_modules/@player-ui/react",
    "//:node_modules/@devtools-ui/plugin",
    "//:node_modules/@player-ui/types",
    "//:node_modules/@types/react",
    "//:node_modules/react",
    "//:node_modules/immer",
    "//:node_modules/uuid",
    "//:node_modules/@types/uuid",
    "//:node_modules/dset",
    "//:node_modules/dequal",
]

dsl_input = "src/content/index.ts"

dsl_output = "_generated"

js_run_binary(
    name = "compile_dsl",
    srcs = glob(["src/**/*"]) + ["package.json"] + dependencies,
    args = [
        "dsl",
        "compile",
        "-i",
        dsl_input,
        "-o",
        dsl_output,
        "--skip-validation",
    ],
    chdir = package_name(),
    out_dirs = [dsl_output],
    tool = "//cli:dsl_bin",
)

js_pipeline(
    package_name = "@player-tools/devtools-basic-web-plugin",
    srcs = [":compile_dsl"] + glob(["src/**/*"]),
    deps = dependencies,
)
