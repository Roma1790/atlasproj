/* eslint @typescript-eslint/no-var-requires: "off" */

const CopyPlugin = require("copy-webpack-plugin")
const HtmlPlugin = require("html-webpack-plugin")
const path = require("path")
const PurgecssPlugin = require("purgecss-webpack-plugin")
const glob = require("glob")

module.exports = {
  entry: {
    index: "./src/index.tsx",
  },
  output: {
    filename: "pantheon.js",
    chunkFilename: "[name].pantheon.js",
    library: "Pantheon",
    libraryExport: "default",
    // libraryTarget: "window",
    path: path.resolve(__dirname, "dist"),
  },
  optimization: {
    splitChunks: {
      chunks: "all",
    },
  },
  devServer: {
    compress: true,
    overlay: true,
    port: 3000,
    open: false,
    stats: "normal",
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "awesome-typescript-loader",
      },
      {
        test: /\.js$/,
        loader: "babel-loader",
      },
      {
        test: /\.css$/,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "postcss-loader",
            options: {
              ident: "postcss",
              plugins: [require("tailwindcss"), require("autoprefixer")],
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new CopyPlugin([{ from: "data", to: "data" }]),
    new HtmlPlugin({
      template: "./src/index.html",
    }),
    new PurgecssPlugin({
      paths: glob.sync(`${path.join(__dirname, "static/css")}/**/*`, {
        nodir: true,
      }),
    }),
  ],
}
