import register from "@babel/register";

/** Register a `require()` loader for any of the given paths */
export const registerForPaths = () => {
  register({
    extensions: [".es6", ".es", ".jsx", ".js", ".mjs", ".tsx", ".ts"],

    presets: [
      [require.resolve("@babel/preset-env"), { modules: "cjs" }],
      require.resolve("@babel/preset-typescript"),
      require.resolve("@babel/preset-react"),
    ],
    plugins: [require.resolve("@babel/plugin-transform-react-jsx-source")],
  });
};
