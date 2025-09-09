load("@bazel_skylib//rules:expand_template.bzl", "expand_template")
load("@rules_python//python:py_library.bzl", "py_library")
load("@rules_python//python:py_test.bzl", "py_test")
load("@rules_python//python:packaging.bzl", "py_wheel", "py_package")
load("@pypi//:requirements.bzl", "requirement")

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


def pytest_test(name, srcs, deps = [], args = [], **kwargs):
    """
        Call pytest for untit tests
    """
    py_test(
        name = name,
        srcs = [
            "//helpers:pytest_wrapper.py",
        ] + srcs,
        main = "//helpers:pytest_wrapper.py",
        args = [
            "--capture=no",
        ] + args + ["$(location :%s)" % x for x in srcs],
        python_version = "PY3",
        srcs_version = "PY3",
        deps = deps + [
            requirement("pytest"),
        ],
        **kwargs
    )
def pytest_lint(name, srcs, deps = [], args = [], **kwargs):
    """
        Call pytest with lint args
    """
    py_test(
        name = name,
        srcs = [
            "//helpers:pytest_wrapper.py",
        ] + srcs,
        main = "//helpers:pytest_wrapper.py",
        args = [
            "--capture=no",
            "--black",
            "--pylint",
            "--mypy",
        ] + args + ["$(location :%s)" % x for x in srcs],
        python_version = "PY3",
        srcs_version = "PY3",
        deps = deps + [
            requirement("pytest"),
            requirement("pytest-black"),
            requirement("pytest-pylint"),
            requirement("pytest-mypy"),
        ],
        **kwargs
    )

# temp macro for python pipeline while its being developed
def python_pipeline(
        name, 
        deps = [], 
        test_deps = []
    ):

    """
    The main entry point for any python project. `python_pipeline` should be the only thing you need in your BUILD file.

    Creates a python library, setups tests, and a whl publishing target

    Args:
        name: The name of the package including the scope (@test/bar).
        test_entrypoint: Test Entrypoint (defaults to __tests__/test.py)
        deps: build/runtime dependencies
        test_deps: test dependencies
        lint_deps: lint dependencies
    """

    srcs = native.glob(include = ["src/**/*.py"], exclude = ["**/__tests__/**/*"])

    library_name = name + "_library"
    library_target = ":" + library_name

    
    py_library(
        name = library_name,
        srcs = srcs,
        deps = deps
    )

    test_name = name + "_test"

    pytest_test(
        name = test_name,
        srcs = native.glob(["src/**/__tests__/**/*.py"]),
        deps = [library_target] + test_deps
    )

    lint_name = name + "_lint"
    pytest_lint(
        name = lint_name,
        srcs = srcs
    )


    package_name = name + "_pkg"
    package_target = ":" + package_name

    py_package(
        name = package_name,
        # Only include these Python packages.
        packages = deps,
        deps = [library_target],
    )

    wheel_name = name + "_whl"

    py_wheel(
        name = wheel_name,
        distribution = name,
        python_tag = "py3",
        version = "{STABLE_VERSION}",
        stamp = -1,
        deps = [package_target],
        strip_path_prefixes = [(native.package_name() + "/src")]
    )