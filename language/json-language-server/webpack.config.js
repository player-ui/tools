const path = require("path");

module.exports = {
  entry: ".",
  devtool: false,
  mode: "development",
  resolve: {
    extensions: [".ts", ".js", ".tsx"],
  },
  target: "node",
  output: {
    path: path.resolve(process.cwd(), "dist"),
    filename: process.env.ROOT_FILE_NAME,
    globalObject: "this",
    library: process.env.LIBRARY_NAME,
    // libraryExport: process.env.LIBRARY_NAME,
    libraryTarget: "umd",
  },
  stats: {},
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        include: [path.resolve(__dirname, "src")],
        loader: "ts-loader",
      },
    ],
  },
};
