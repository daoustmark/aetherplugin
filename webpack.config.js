const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: {
    popup: './src/extension/popup.js',
    content: ['./src/extension/content.js', './src/extension/styles/content.css'],
    options: './src/extension/options.js',
    main: './src/extension/styles/main.css'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  chrome: '88'
                },
                modules: false
              }]
            ],
            plugins: [
              '@babel/plugin-transform-runtime'
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  require('tailwindcss'),
                  require('autoprefixer')
                ]
              }
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'styles/[name].css'
    }),
    new CopyPlugin({
      patterns: [
        {
          from: 'src/extension/manifest.json',
          to: 'manifest.json'
        },
        {
          from: 'src/extension/popup.html',
          to: 'popup.html'
        },
        {
          from: 'src/extension/options.html',
          to: 'options.html'
        },
        {
          from: 'src/extension/background.js',
          to: 'background.js'
        },
        {
          from: 'src/extension/icons',
          to: 'icons'
        }
      ]
    })
  ],
  optimization: {
    splitChunks: false,
    runtimeChunk: false
  }
}; 