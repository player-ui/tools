def _gen_package_json_impl(ctx):
    output = ctx.actions.declare_file("base.package.json")

    command = "node {script} {base_package} {dependencies} {output}".format(
        script = ctx.file._script.short_path,
        base_package = ctx.file.base_package.short_path,
        dependencies = " ".join([dep.short_path for dep in ctx.files.dependencies]),
        output = output.path,
    )

    ctx.actions.run_shell(
        inputs = [ctx.file._script, ctx.file.base_package] + ctx.files.dependencies,
        outputs = [output],
        command = command,
    )

    return DefaultInfo(files = depset([output]))

gen_package_json = rule(
    implementation = _gen_package_json_impl,
    attrs = {
        "_script": attr.label(default = Label("//cli:gen_package_json.js"), allow_single_file = True),
        "base_package": attr.label(allow_single_file = True),
        "dependencies": attr.label_list(allow_files = True),
    },
)
