import { defineConfig, Options } from "tsup";
import fs from "fs";

export default defineConfig((options: Options) => {
  const defaultOptions: Options = {
    entry: ["./src/index.ts"],
    sourcemap: true,
    esbuildOptions(options) {
      options.jsx = "transform";
      options.jsxFactory = "createElement";
      options.jsxFragment = "Fragment";
    },
    ...options,
  };

  return [
    {
      ...defaultOptions,
      format: ["esm"],
      outExtension: () => ({ js: ".mjs", dts: ".d.mts" }),
      clean: true,
      async onSuccess() {
        // Support Webpack 4 by pointing `"module"` to a file with a `.js` extension
        fs.copyFileSync("dist/index.mjs", "dist/index.legacy-esm.js");
      },
    },
    // Browser-ready ESM, production + minified
    {
      ...defaultOptions,
      define: {
        "process.env.NODE_ENV": JSON.stringify("production"),
      },
      format: ["esm"],
      outExtension: () => ({ js: ".mjs" }),
    },
    {
      ...defaultOptions,
      format: "cjs",
      outDir: "./dist/cjs/",
      outExtension: () => ({ js: ".cjs" }),
    },
  ];
});
