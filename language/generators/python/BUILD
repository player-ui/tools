load("@rules_player//python:defs.bzl", "py_pipeline")
load("@pypi//:requirements.bzl", "requirement")
load("@build_constants//:constants.bzl", "VERSION")


py_pipeline(
  name = "player_tools_dsl_generator",
  deps = [
    "//xlr/types/python:player_tools_xlr_types"
  ],
  test_deps = [
    requirement("pytest"),
    "//language/dsl/python:player_tools_dsl"
  ],
  lint_deps = [
    requirement("pytest"),
    requirement("pytest-black"),
    requirement("pytest-pylint"),
    requirement("pytest-mypy"),
  ],
  version = VERSION
)