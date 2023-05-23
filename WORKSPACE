workspace(
    name = "player",
    managed_directories = {
        "@npm": ["node_modules"],
    },
)

load("@bazel_tools//tools/build_defs/repo:git.bzl", "git_repository")

git_repository(
    name = "rules_player",
    remote = "https://github.com/player-ui/rules_player.git",
    branch = "esm-native-builds"
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
