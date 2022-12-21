load("@build_bazel_rules_nodejs//:index.bzl", "copy_to_bin")
load("@npm//webpack-cli:index.bzl", webpack = "webpack_cli")
load("@rules_pkg//:pkg.bzl", "pkg_zip")

genrule(
    name = "version",
    srcs = [
        "//:VERSION",
    ],
    outs = ["version.json"],
    cmd = """echo {'"'version'"': '"'`cat $(location //:VERSION)`'"'} > $@""",
)

# Necessary to ensure files are available in same context where output will be created
# See [chdir] option on [webpack] target
copy_to_bin(
    name = "srcs",
    srcs = glob(["src/**"]) + [
        ":webpack.config.js",
        ":postcss.config.js",
        ":tsconfig.json",
    ],
)

webpack(
    # The name controls the output directory, which I tried to make dynamic based on
    # target name, but somewhere, the link was missing, so this should stay [dist]
    # unless you figure out how to correctly link the output directory with the files
    # created by webpack
    name = "dist",
    chdir = "$(RULEDIR)",
    data = [
        ":srcs",
        ":version.json",

        # Webpack deps
        "@npm//@babel/preset-env",
        "@npm//@babel/plugin-proposal-nullish-coalescing-operator",
        "@npm//babel-loader",
        "@npm//copy-webpack-plugin",
        "@npm//css-loader",
        "@npm//html-webpack-plugin",
        "@npm//postcss-loader",
        "@npm//postcss-nested",
        "@npm//postcss-mixins",
        "@npm//postcss-simple-vars",
        "@npm//style-loader",
        "@npm//ts-loader",
        "@npm//url-loader",
        "@npm//webpack-extension-reloader",

        # Real deps
        # "//devtools/common",
        # "//devtools/window-rpc-bridge",
        "//devtools/ui",
        "@npm//@types/react-dom",
        "@npm//react",
        "@npm//react-dom",
        "@npm//uuid",
        "@npm//webextension-polyfill-ts",
        "@npm//webext-redux",
    ],
    output_dir = True,
)

alias(
    name = "web-ext",
    actual = "dist",
)

pkg_zip(
    name = "chrome",
    srcs = [
        ":dist",
    ],
    strip_prefix = "dist",
)
