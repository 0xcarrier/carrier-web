const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const theme = require('./src/theme.json');
const Dotenv = require('dotenv-webpack');
const CopyPlugin = require('copy-webpack-plugin');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

const NODE_ENV = process.env.NODE_ENV;

console.log('carrier version', process.env.CARRIER_VERSION);

const isProduction = NODE_ENV === 'production';

module.exports = {
  devtool: false,
  mode: isProduction ? 'production' : 'development',
  entry: {
    index: path.resolve(__dirname, 'src/index.tsx'),
  },
  output: {
    pathinfo: false,
    filename: isProduction ? '[name].[chunkhash:8].js' : '[name].js',
    path: isProduction ? path.resolve(__dirname, 'dist/public') : path.resolve(__dirname, 'dist'),
    publicPath: isProduction ? '/public/' : '/',
    assetModuleFilename: '[hash:8][ext][query]',
  },
  experiments: {
    asyncWebAssembly: true,
  },
  module: {
    rules: [
      {
        test: /\.(tsx|ts)$/,
        use: [
          isProduction && {
            loader: 'babel-loader', // transform es6 to es5
          },
          {
            loader: '@linaria/webpack-loader', // extract css from js
            options: {
              displayName: isProduction ? false : true,
            },
          },
          {
            loader: 'ts-loader', // transform ts to js
            options: {
              allowTsInNodeModules: true,
            },
          },
        ].filter(Boolean),
      },
      {
        test: /\.less$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          {
            loader: 'css-loader',
          },
          {
            loader: 'less-loader', // compiles Less to CSS
            options: {
              lessOptions: {
                modifyVars: theme,
                javascriptEnabled: true,
              },
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          {
            loader: 'css-loader',
          },
        ],
      },
      {
        test: /\.svg$/,
        oneOf: [
          {
            resourceQuery: /inline/,
            use: [
              {
                loader: '@svgr/webpack',
                options: {
                  svgoConfig: {
                    plugins: [
                      {
                        name: 'removeViewBox',
                        active: false,
                      },
                    ],
                  },
                },
              },
            ],
          },
          {
            resourceQuery: /url/,
            type: 'asset/resource',
          },
          {
            use: [
              {
                loader: 'svg-url-loader',
                options: {
                  limit: 10000,
                },
              },
            ],
          },
        ],
      },
      {
        test: /\.(eot|otf|ttf|jpe?g|png|webp|woff|woff2?)(\?.+)?$/,
        type: 'asset/resource',
      },
      {
        test: /\.m?js/,
        resolve: {
          fullySpecified: false,
        },
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  cache: {
    type: 'filesystem',
  },
  devServer: {
    host: '0.0.0.0',
    port: process.env.PROXY || 8080,
    historyApiFallback: true,
    client: {
      overlay: false,
      webSocketURL: 'auto://0.0.0.0:0/ws',
    },
    allowedHosts: 'all',
    proxy: [
      {
        context: ['/api'],
        target: 'http://localhost:8000',
        pathRewrite: { '^/api': '' },
      },
    ],
  },
  optimization: {
    runtimeChunk: true,
    splitChunks: {
      chunks: !isProduction ? 'all' : undefined,
      cacheGroups: isProduction
        ? {
            vendors: {
              // third-party denpendencies
              name: 'vendors',
              test: /[\\/]node_modules[\\/]/,
              chunks: 'all',
            },
          }
        : undefined,
    },
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          safari10: true,
          output: {
            comments: false,
          },
        },
      }),
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
            },
          ],
        },
      }),
    ],
  },
  plugins: [
    // new BundleAnalyzerPlugin(),
    new NodePolyfillPlugin(),
    new MiniCssExtractPlugin({
      filename: isProduction ? '[name]-[contenthash:8].css' : '[name].css',
    }),
    new HtmlWebpackPlugin({
      filename: isProduction ? '../index.html' : 'index.html',
      template: './src/assets/index.tpl',
    }),
    new Dotenv({ systemvars: true }),
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'staticwebapp.config.json'),
          to: '../staticwebapp.config.json',
        },
        {
          from: path.resolve(__dirname, 'src/assets/carrier.png'),
          to: 'carrier.png',
        },
        {
          from: path.resolve(__dirname, 'src/assets/testnet-relayer-data.json'),
          to: 'testnet-relayer-data.json',
        },
      ],
    }),
  ].filter(Boolean),
};
