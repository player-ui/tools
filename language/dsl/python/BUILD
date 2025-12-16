load("@rules_player//python:defs.bzl", "py_pipeline")
load("@pypi//:requirements.bzl", "requirement")
load("@build_constants//:constants.bzl", "VERSION")

py_pipeline(
  name = "player_tools_dsl",
  deps = [],
  test_deps = [
    requirement("pytest"),
  ],
  lint_deps = [
    requirement("pytest"),
    requirement("pytest-black"),
    requirement("pytest-pylint"),
    requirement("pytest-mypy"),
  ],
  version = VERSION
)