const fs = require("fs");
const glob = require("glob");

// Find all directories that contain a BUILD file
const directories = glob.sync("**/BUILD", { realpath: true });

// Get the parent directory of each BUILD file
const packages = directories.map((dir) => dir.replace("/BUILD", ""));

// Create the packages section of the pnpm-workspace.yaml file
const packagesYaml = packages.map((pkg) => `  - "${pkg}"`).join("\n");

// Create the full pnpm-workspace.yaml content with a comment at the top
const yamlContent = `# This file is auto-generated by generate-pnpm-workspace.js\npackages:\n${packagesYaml}\n`;

// Write the pnpm-workspace.yaml file
fs.writeFileSync("pnpm-workspace.yaml", yamlContent);
