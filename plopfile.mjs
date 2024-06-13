import fs from "fs";
import path from "path";

const toKebabCase = (str) =>
  str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, "$1-$2").toLowerCase();

export default function (plop) {
  plop.setActionType("renameBuildFiles", function (answers) {
    const { pluginName } = answers;
    const name = toKebabCase(pluginName.toLowerCase());
    const basePath = path.resolve(
      process.cwd(),
      `./devtools/plugins/desktop/${name}/`
    );
    fs.renameSync(
      path.join(basePath, "BUILD.hbs"),
      path.join(basePath, "BUILD")
    );
    return `./devtools/plugins/desktop/${pluginName}/BUILD have been renamed`;
  });

  plop.setGenerator("dev-tools-web-plugin", {
    description: "Create a new web dev tools plugin",
    prompts: [
      {
        type: "input",
        name: "pluginName",
        message: "Plugin name:",
      },
      {
        type: "input",
        name: "pluginDescription",
        message: "Plugin description:",
      },
    ],
    actions: [
      {
        type: "addMany",
        destination: "./devtools/plugins/desktop/{{dashCase pluginName}}",
        base: "./devtools/plugins/desktop/template",
        templateFiles: "./devtools/plugins/desktop/template/**/*",
        globOptions: { dot: true },
        stripExtension: true,
      },
      {
        type: "renameBuildFiles",
      },
      ...Object.values(extendedActions),
    ],
  });
}

const extendedActions = {
  bazelIgnore: {
    type: "append",
    path: "./.bazelignore",
    pattern: /\# Node modules/,
    template: "{{dashCase pluginName}}/node_modules",
  },
  pnpmWorkspace: {
    type: "append",
    path: "./pnpm-workspace.yaml",
    pattern: /packages\:/,
    template: '  - "devtools/plugins/desktop/{{dashCase pluginName}}"',
  },
  testAppImport: {
    type: "append",
    path: "./devtools/plugins/desktop/test-env/src/App.tsx",
    pattern:
      /import { BasicWevDevtoolsPlugin } from "@player-tools\/devtools-basic-web-plugin";\n?/,
    template:
      'import { {{pascalCase pluginName}} } from "@player-tools/template-plugin";\n',
  },
  testAppPlugin: {
    type: "append",
    path: "./devtools/plugins/desktop/test-env/src/App.tsx",
    pattern:
      /new BasicWebDevtoolsPlugin\(\) as unknown as ReactPlayerPlugin,\n?/,
    template:
      "new {{pascalCase pluginName}}Plugin() as unknown as ReactPlayerPlugin,\n",
  },
  testAppSetup: {
    type: "modify",
    path: "./devtools/plugins/desktop/test-env/setup.sh",
    pattern: /(PLUGINS=.*)(\))/,
    template: '$1 "@player-tools/{{dashCase pluginName}}-plugin"$2\n',
  },
};
