/* eslint @typescript-eslint/no-var-requires: "off" */

const HtmlPlugin = require("html-webpack-plugin")
const path = require("path")
const webpack = require("webpack")

module.exports = {
  resolve: {
    fallback: {
      fs: false
    }
  },

  entry: [
    "./src/lib/index.ts",
  ],
  output: {
    filename: "[name].js",
    chunkFilename: "[name].atlas.js",
    library: "atlas",
  },
  optimization: {
    splitChunks: {
      chunks: "all",
    },
    
  },
  devtool: "source-map",
  devServer: {
    http2: true,
    port: 3000,
    open: false,
    
  },
  resolve: {
    extensions: [".ts", ".js", ".jsx"],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: "babel-loader",
          options: {
            cacheDirectory: true,
            exclude: /node_modules/,
          },
        },
      },
      {
        test: /\.ts$/,
        use: ["babel-loader", "ts-loader"],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|tiff)$/,
        loader: 'file-loader',
        options: {
            name: '/assets/[name].[ext]',
            outputPath: 'images',
            publicPath: 'images',
            emitFile: true, 
            esModule: false,
        },
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      { enforce: "pre", test: /\.js$/, loader: "source-map-loader" },
    ],
  },
  plugins: [
    new HtmlPlugin({
      template: "./src/lib/index.html",
    }),
    new webpack.EnvironmentPlugin({
      CHARON_URL: "http://jbs-osm-test.informatik.fh-nuernberg.de",
      TEST_DISPLAY_ALWAYS: "false",
    }),
  ],
}
