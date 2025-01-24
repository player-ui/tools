load("@aspect_rules_js//js:defs.bzl", "js_run_binary")
load("@bazel_skylib//rules:expand_template.bzl", "expand_template")
load("@rules_player//javascript:defs.bzl", "js_pipeline")

COMMON_TEST_DEPS = [
    "//:node_modules/dlv",
    "//:vitest_config"
]

def tsup_config(name):
    prefix = "../" * len(native.package_name().split("/"))

    expand_template(
        name = name,
        out = "tsup.config.ts",
        substitutions = {
            "%PREFIX%": prefix,
        },
        template = "//helpers:tsup.config.ts.tmpl",
    )

def vitest_config(name):
    prefix = "../" * len(native.package_name().split("/"))

    expand_template(
        name = name,
        out = "vitest.config.mts",
        substitutions = {
            "%PREFIX%": prefix,
        },
        template = "//helpers:vitest.config.mts.tmpl",
    )

def dsl_pipeline(package_name, deps, dsl_input, dsl_output):
    """
    A macro that encapsulates the DSL compilation and js_pipeline rules.

    Args:
        package_name: The name of the package including the scope (@test/bar).
        deps: The dependencies for the package.
        dsl_input: A string representing the input directory for the DSL compilation.
        dsl_output: A string representing the output directory for the DSL compilation.
    """
    name = native.package_name().split("/")[-1]
    binary_name = name + "_compile_dsl"
    binary_target = ":" + binary_name

    js_run_binary(
        name = binary_name,
        srcs = native.glob(["src/**/*"]) + ["package.json"] + deps,
        args = [
            "dsl",
            "compile",
            "-i",
            dsl_input,
            "-o",
            dsl_output,
            "--skip-validation",
        ],
        chdir = native.package_name(),
        out_dirs = [dsl_output],
        tool = "//cli:dsl_bin",
    )

    js_pipeline(
        package_name = package_name,
        srcs = [binary_target] + native.glob(["src/**/*"]),
        deps = deps,
        test_deps = COMMON_TEST_DEPS
    )
