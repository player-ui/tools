const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const DuplicatePackageCheckerPlugin = require('duplicate-package-checker-webpack-plugin');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');

module.exports = (env, argv) => ({
  entry: '.',
  mode: argv.mode,
  devtool: 'none',
  output: {
    path: path.resolve(process.cwd(), 'dist'),
    filename: process.env.ROOT_FILE_NAME,
    globalObject: 'this',
    library: process.env.LIBRARY_NAME,
    libraryTarget: 'umd',
  },

  externals: {
    emotionStyled: '@emotion/styled',
    framerMotion: 'framer-motion',
    react: 'react',
    reactDOM: 'react-dom',
  },

  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.m?js$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-proposal-nullish-coalescing-operator'],
          },
        },
      },
    ],
  },

  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          ecma: 5,
          compress: {
            warnings: false,
            comparisons: false,
            inline: 2,
          },
          mangle: {
            safari10: true,
          },
          output: {
            ecma: 5,
            comments: false,
            ascii_only: true,
          },
        },
        parallel: true,
        cache: true,
        sourceMap: true,
      }),
    ],
  },

  plugins: [
    new CaseSensitivePathsPlugin(),
    new DuplicatePackageCheckerPlugin(),
  ],
});
