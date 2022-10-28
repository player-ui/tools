workspace(
    name = "player",
    managed_directories = {
        "@npm": ["node_modules"],
    },
)

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

http_archive(
  name = "rules_player",
  strip_prefix = "rules_player-0.10.0",
  urls = ["https://github.com/player-ui/rules_player/archive/refs/tags/v0.10.0.tar.gz"],
  sha256 = "73597c76a5ceb6c1f84735e0e086792e4695759c62c22f45e13041862c6b0c33"
)

load("@rules_player//:workspace.bzl", "deps")

deps()

load("@rules_player//:conf.bzl", "apple", "javascript", "kotlin")

#####################
# Yarn Dependencies #
#####################
javascript()

load("@build_bazel_rules_nodejs//:index.bzl", "node_repositories", "yarn_install")

node_repositories(
    node_version = "16.12.0",
    yarn_version = "1.22.17",
)

yarn_install(
    name = "npm",
    included_files = [],
    package_json = "//:package.json",
    strict_visibility = False,
    yarn_lock = "//:yarn.lock",
)
