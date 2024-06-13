import fs from "fs";
import path from "path";

export default function (plop) {
  plop.setActionType("renameFiles", function (answers) {
    const { pluginName } = answers;
    const basePath = path.resolve(process.cwd(), toKebabCase(pluginName));
    fs.renameSync(
      path.join(basePath, "BUILD.hbs"),
      path.join(basePath, "BUILD")
    );
    return `${pluginName}/README and ${pluginName}/BUILD have been renamed`;
  });

  plop.setGenerator("web dev tools plugin", {
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
        type: "renameFiles",
      },
      ...Object.values(extendedActions),
    ],
  });
}

const extendedActions = {
  bazelIgnore: {
    type: "append",
    path: "./.bazelignore",
    pattern: /(.|\n)+(.*node_modules)/,
    template: "{{dashCase assetName}}/node_modules",
  },
  pnpmWorkspace: {
    type: "append",
    path: "./pnpm-workspace.yaml",
    pattern: /(.|\n)+(.[\w|"])/,
    template: '  - "{{dashCase assetName}}"',
  },
  testAppImport: {
    type: "append",
    path: "./devtools/plugins/desktop/test-env/src/App.tsx",
    pattern:
      /import { BasicWevDevtoolsPlugin } from "@player-tools\/devtools-basic-web-plugin";\n?/,
    template:
      'import { {{pascalCase pluginName}} } from "@player-tools/template-plugin";',
  },
  testAppPlugin: {
    type: "append",
    path: "./devtools/plugins/desktop/test-env/src/App.tsx",
    pattern: /new BasicWebDevtoolsPlugin\(\) as unknown as ReactPlayerPlugin,/,
    template:
      "new {{pascalCase pluginName}}Plugin() as unknown as ReactPlayerPlugin,",
  },
  testAppSetup: {
    type: "append",
    path: "./devtools/plugins/desktop/test-env/setup.sh",
    pattern: /(PLUGINS=.*)(\))/,
    template: ' "@player-tools/{{pluginName}}-plugin"$2',
  },
};
