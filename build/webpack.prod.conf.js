const path = require('path');
const OS = require('os');
// 环境变量
const ENV = process.env;
// 多进程压缩
const HappyPack = require('happypack');
// gzip压缩插件
const CompressionWebpackPlugin = require('compression-webpack-plugin');
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin');
const happyThreadPool = HappyPack.ThreadPool({ size: OS.cpus().length });
const resolve = dir => path.join(__dirname, dir);

// webpack plugins
let _plugins = [
  new HappyPack({
    id: 'happybabel',
    loaders: [
      {
        loader: 'babel-loader?cacheDirectory=true'
      }
    ],
    threadPool: happyThreadPool,
    verbose: true
  }),
  new ScriptExtHtmlWebpackPlugin({
    defaultAttribute: 'defer'
  })
];

// 如果执行build命令，添加gzip压缩
if (ENV.VUE_APP_ENV === 'production' && ENV.IS_GZIP === 'true') {
  const _cwp = new CompressionWebpackPlugin({
    algorithm: 'gzip',
    deleteOriginalAssets: true,
    threshold: 0,
    minRatio: 1,
    test: new RegExp('\\.(' + ['js', 'css'].join('|') + ')$')
  });
  _plugins.push(_cwp);
}

module.exports = {
  // externals: {
  //   vue: 'Vue',
  //   vuex: 'Vuex',
  //   'vue-router': 'VueRouter',
  //   'element-ui': 'ELEMENT'
  // },
  optimization: {
    runtimeChunk: {
      name: entrypoint => `runtime~${entrypoint.name}`
    },
    splitChunks: {
      chunks: 'async',
      // minChunks: 2,
      // minSize: 20000,
      // maxAsyncRequests: 20,
      // maxInitialRequests: 30,
      // name: false,
      cacheGroups: {
        vue: {
          test: /[\\/]node_modules[\\/](vue|vue-router|vuex)[\\/]/,
          name: 'chunk-vue',
          chunks: 'all',
          priority: 40
        },
        // 单独将 ElementUI 拆包
        elementUI: {
          name: 'chunk-elementUI',
          priority: 30,
          chunks: 'all',
          test: /[\\/]node_modules[\\/]element-ui[\\/]/
        },
        vendors: {
          name: 'chunk-vendors',
          test: /[\\/]node_modules[\\/]/,
          minChunks: 1,
          priority: 25
        },
        comps: {
          name: 'chunk-comps',
          test: resolve('../src/components'),
          minChunks: 1,
          priority: 21
        },
        // libs: {
        //   name: 'chunk-libs',
        //   test: resolve('../src/libs'),
        //   chunks: 'all',
        //   minChunks: 1,
        //   priority: 20
        // },
        utils: {
          name: 'chunk-utils',
          test: resolve('../src/utils'),
          minChunks: 1,
          priority: 19
        },
        apis: {
          name: 'chunk-apis',
          test: resolve('../src/apis'),
          minChunks: 1,
          priority: 18
        },
        configs: {
          name: 'chunk-configs',
          test: resolve('../src/configs'),
          minChunks: 1,
          priority: 17
        }
      }
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        include: resolve('src'),
        exclude: /node_modules/,
        loader: 'happypack/loader?id=happybabel'
      }
    ]
  },
  plugins: _plugins
};
