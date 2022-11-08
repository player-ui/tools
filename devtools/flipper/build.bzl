load("//:index.bzl", "find_entry")
load("@bazel_skylib//lib:paths.bzl", "paths")
load("@build_bazel_rules_nodejs//:index.bzl", "copy_to_bin", "pkg_npm")
load("@npm//flipper-pkg:index.bzl", _flipper_pkg_bin = "flipper_pkg")
load("@rules_pkg//:pkg.bzl", "pkg_tar")
load("@rules_player//internal:scope_name.bzl", "scope_name")
load("@rules_player//javascript:utils.bzl", "remove_duplicates")
load("@rules_player//javascript/package_json:index.bzl", "create_package_json")

def _install_fliper_plugin_impl(ctx):
    install_flipper_plugin_script = ctx.actions.declare_file("%s-install.sh" % ctx.attr.name)

    tar_link = "pack.tgz"

    ctx.actions.expand_template(
        template = ctx.file._install_script,
        output = install_flipper_plugin_script,
        substitutions = {
            "$TAR_PATH": tar_link,
            "$VERSION_FILE_PATH": ctx.file.version_file.path,
            "$FLIPPER_INSTALL_LOCATION": ctx.attr.install_location,
            "$PLUGIN_NAME": ctx.attr.plugin_name,
        },
    )

    files = [
        ctx.file.version_file,
        ctx.file.flipper_plugin,
    ]

    symlinks = {
        tar_link: ctx.file.flipper_plugin,
    }

    return DefaultInfo(
        executable = install_flipper_plugin_script,
        runfiles = ctx.runfiles(files = files, symlinks = symlinks),
    )

install_flipper_plugin = rule(
    implementation = _install_fliper_plugin_impl,
    attrs = {
        "plugin_name": attr.string(),
        "flipper_plugin": attr.label(allow_single_file = [".tgz"]),
        "version_file": attr.label(default = "//:VERSION", allow_single_file = ["VERSION"]),
        "install_location": attr.string(default = "~/.flipper/installed-plugins"),
        "_install_script": attr.label(default = ":install-flipper-plugin.sh.tpl", allow_single_file = True),
    },
    executable = True,
)

# Macro creating necessary targets for flipper-pkg development and publishing
def flipper_pkg(
        *,
        name,
        plugin_name,
        scope = None,
        plugin_icon = None,
        plugin_title = None,
        plugin_description = None,
        registry = "https://registry.npmjs.org",
        base_package_json = "//common:pkg_json_base",
        root_package_json = "//:package.json",
        dependencies = [],
        peer_dependencies = [],
        srcs = None,
        entry = None,
        root_dir = "src",
        out_dir = "dist"):
    srcs = srcs if srcs else native.glob(["src/**"])

    package_json = scope_name(name, "package-json")

    # TODO: This seems to be the standard for flipper plugin packages, but might be able to change to be consistent with the other packages in this repo
    package_name = "{}flipper-plugin-{}".format(("@" + scope + "/") if scope else "", plugin_name)
    create_package_json(
        name = package_json,
        package_name = package_name,
        base_package_json = base_package_json,
        dependencies = dependencies,
        registry = registry,
        out_dir = out_dir,
        peer_dependencies = remove_duplicates(peer_dependencies + [
            "@npm//flipper-plugin",
        ]),
        root_package_json = root_package_json,
        additional_properties = json.encode({k: v for k, v in {
            "$schema": "https://fbflipper.com/schemas/plugin-package/v2.json",
            "pluginType": "client",
            "id": plugin_name,
            "main": paths.join(out_dir, "bundle.js"),
            "flipperBundlerEntry": entry if entry else find_entry(root_dir, srcs),
            "keywords": [
                "flipper-plugin",
                package_name,
                plugin_name,
            ],
            "icon": plugin_icon,
            "title": plugin_title,
            "description": plugin_description,
        }.items() if v}),
    )

    bin_srcs = scope_name(name, "bin-srcs")
    copy_to_bin(
        name = bin_srcs,
        srcs = srcs,
    )

    flipper_plugin = scope_name(name, "flipper-plugin")
    _flipper_pkg_bin(
        name = flipper_plugin,
        outs = [
            paths.join(out_dir, "bundle.js"),
            # paths.join(out_dir, "bundle.map"),
        ],
        args = [
            "bundle",
        ],
        chdir = "$(RULEDIR)",
        data = dependencies + [
            bin_srcs,
            package_json,
        ],
    )

    # Strictly for installing plugin locally -- would like to just use the `pkg_npm.pack`, but that
    # outputs a tar at the root level, when I really just want it to be another build output.
    dev_pack = scope_name(name, "dev-pack")
    pkg_tar(
        name = dev_pack,
        srcs = [
            bin_srcs,
            flipper_plugin,
            package_json,
        ],
        extension = ".tgz",
        strip_prefix = ".",
    )

    install_flipper_plugin(
        name = scope_name(name, "install"),
        flipper_plugin = dev_pack,
        plugin_name = package_name,
    )

    # TODO: Potentially call flipper-pkg pack
    pkg_npm(
        name = scope_name(name, "pkg"),
        package_name = package_name,
        substitutions = {
            "__VERSION__": "{STABLE_VERSION}",
            "0.0.0-PLACEHOLDER": "{STABLE_VERSION}",
            "__GIT_COMMIT__": "{STABLE_GIT_COMMIT}",
        },
        validate = False,
        deps = [
            flipper_plugin,
            package_json,
        ],
    )
