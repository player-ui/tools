const path = require('path');
const webpack = require('webpack');
const { version } = require('./version.json');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ExtensionReloader = require('webpack-extension-reloader');
const HTMLWebpackPlugin = require('html-webpack-plugin');

const config = () => {
  return {
    mode: process.env.NODE_ENV ?? 'development',
    context: path.join(__dirname, 'src'),
    devtool: false,
    entry: {
      'background/background': './background/background.ts',
      'popup/popup': './popup/popup.ts',
      'panel/panel': './panel/panel.tsx',
      'panel/startup': './panel/startup.ts',
      'runtime/runtime': './runtime/runtime.tsx',
      'content/content': './content/content.ts',
      'options/options': './options/options.ts',
    },
    output: {
      path: path.join(__dirname, 'dist'),
      filename: '[name].js',
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.json'],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: 'ts-loader',
          exclude: /node_modules/,
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
        {
          test: /\.(png|jpg|jpeg|gif)$/i,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: false,
              },
            },
          ],
        },
        {
          test: /\.css$/,
          oneOf: [
            {
              exclude: /node_modules/,
              use: [
                { loader: 'style-loader' },
                {
                  loader: 'css-loader',
                  options: {
                    sourceMap: true,
                    localsConvention: 'camelCase',
                    importLoaders: 1,
                    modules: {
                      localIdentName: '[name]-[local]',
                    },
                  },
                },
                'postcss-loader',
              ],
            },
            { include: /node_modules/, use: ['style-loader', 'css-loader'] },
          ],
        },
      ],
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'production'),
        },
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: 'media', to: 'media' },
          {
            from: 'manifest.json',
            to: 'manifest.json',
            transform: (content) => {
              const jsonContent = JSON.parse(content);
              jsonContent['version'] = version;

              if (config.mode === 'development') {
                jsonContent['content_security_policy'] =
                  "script-src 'self' 'unsafe-eval'; object-src 'self'";
              }

              return JSON.stringify(jsonContent, null, 2);
            },
          },
        ],
      }),
      new HTMLWebpackPlugin({
        filename: 'panel/panel.html',
        chunks: ['panel/panel'],
      }),
      new HTMLWebpackPlugin({
        filename: 'panel/startup.html',

        chunks: ['panel/startup'],
      }),
      new HTMLWebpackPlugin({
        filename: 'popup/popup.html',
        chunks: ['popup/popup'],
      }),
      new HTMLWebpackPlugin({
        filename: 'options/options.html',
        chunks: ['options/options'],
      }),
      process.env.HMR === 'true' &&
        new ExtensionReloader({
          entries: {
            contentScript: ['content/content'],
            background: 'background/background',
            extensionPage: ['popup/popup', 'options/options', 'panel/panel'],
          },
        }),
    ].filter(Boolean),
  };
};

module.exports = config;
