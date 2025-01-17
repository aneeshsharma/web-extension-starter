const path = require('path');
const webpack = require('webpack');
const ZipPlugin = require('zip-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const FixStyleOnlyEntriesPlugin = require('webpack-fix-style-only-entries');

module.exports = {
    mode: 'development',

    entry: {
        background: './src/scripts/background.js',
        popup: './src/scripts/popup.js',
        options: './src/scripts/options.js',
        styles: ['./src/styles/popup.scss', './src/styles/options.scss'],
    },

    output: {
        filename: 'js/[name].bundle.js',
        path: path.resolve(__dirname, 'extension', process.env.TARGET),
    },

    plugins: [
        new webpack.ProgressPlugin(),
        new FixStyleOnlyEntriesPlugin({ silent: true }),
        new CleanWebpackPlugin({
            cleanOnceBeforeBuildPatterns: [
                path.join(process.cwd(), `extension/${process.env.TARGET}`),
                path.join(process.cwd(), `extension/${process.env.TARGET}.zip`),
            ],
            cleanStaleWebpackAssets: false,
            verbose: true,
        }),
        new CopyWebpackPlugin([
            { from: 'src/assets', to: 'assets' },
            {
                from: `src/manifests/${process.env.TARGET}.json`,
                transform(content, path) {
                    // generates the manifest file using the package.json informations
                    return Buffer.from(
                        JSON.stringify({
                            version: process.env.npm_package_version,
                            background: {
                                persistent: false,
                                scripts: ['js/background.bundle.js'],
                            },
                            ...JSON.parse(content.toString()),
                        })
                    );
                },
                to: 'manifest.json',
            },
        ]),
        new HtmlWebpackPlugin({
            template: 'src/options.html',
            // inject: false,
            chunks: ['options'],
            filename: 'options.html',
        }),
        new HtmlWebpackPlugin({
            template: 'src/popup.html',
            // inject: false,
            chunks: ['popup'],
            filename: 'popup.html',
        }),
    ],

    module: {
        rules: [
            {
                test: /.(js|jsx)$/,
                include: [path.resolve(__dirname, 'src/scripts')],
                loader: 'babel-loader',

                options: {
                    plugins: ['syntax-dynamic-import'],

                    presets: [
                        [
                            '@babel/preset-env',
                            {
                                modules: false,
                            },
                        ],
                    ],
                },
            },
            {
                test: /\.scss$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: '[name].css',
                            context: './src/styles/',
                            outputPath: 'css/',
                        },
                    },
                    'extract-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: true,
                        },
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            ident: 'postcss',
                            // eslint-disable-next-line global-require
                            plugins: [require('autoprefixer')()],
                        },
                    },
                    'resolve-url-loader',
                    'sass-loader',
                ],
            },
        ],
    },

    optimization: {
        minimizer: [
            new TerserPlugin({
                cache: true,
                parallel: true,
            }),
            new ZipPlugin({
                path: path.resolve(__dirname, 'extension'),
                filename: `${process.env.TARGET}.zip`,
            }),
        ],
    },

    devServer: {
        contentBase: path.join(__dirname, 'extension'),
    },
};
