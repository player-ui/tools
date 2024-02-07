#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function gen_package_json(base_package, dependencies, output_file) {
  // Read the root and base package.json files
  const basePackageJson = JSON.parse(fs.readFileSync(base_package));
  const version = basePackageJson["version"];
  const currDeps = Object.keys(basePackageJson["dependencies"]).reduce(
    (acc, key) => ({ ...acc, [key]: version }),
    {}
  );

  // Iterate over the dependencies and get the version from the root package.json
  const packageDependencies = dependencies.reduce(
    (deps, [dep, version]) => ({
      ...deps,
      [dep]: version,
    }),
    currDeps
  );

  const output = path.resolve(output_file);
  const new_pkg = JSON.stringify(
    { ...basePackageJson, dependencies: packageDependencies },
    null,
    2
  );

  // Write the updated base package.json back to the file
  fs.writeFileSync(output, new_pkg);
}

// Process command-line arguments
const base_package = process.argv[2];
const dependencies = process.argv
  .slice(3, -1)
  .map((dep) => {
    const match = dep.match(
      /node_modules\/\.aspect_rules_js\/(.+)@(.+)\/node_modules\/\1/
    );
    return match ? [match[1], match[2]] : null;
  })
  .filter(Boolean);
const output_file = process.argv[process.argv.length - 1];

gen_package_json(base_package, dependencies, output_file);
