const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')
const { defineConfig } = require('@vue/cli-service')
const enGB = require('./src/plugins/i18n/en_GB.json')

// The page metadata written into index.html (what search engines and the social media cards read: they don't run
// JavaScript), from the English texts. The page updates them to the chosen language once loaded (see plugins/i18n.js).
const pageMeta = {
  title: enGB.metaTitle || '',
  description: enGB.metaDescription || '',
  url: enGB.metaUrl || '',
  image: enGB.metaImage || ''
}

module.exports = defineConfig({
  devServer: {
    port: 4000,
    // Also opened by the name of this machine (e.g. http://dok-26:4000) from other computers of the network; IP addresses
    // and localhost are always allowed
    allowedHosts: ['localhost', 'dok-26'],
    client: {
      overlay: {
        // The browser warning 'ResizeObserver loop completed with undelivered notifications' is harmless (elements resized
        // while observed, e.g. the map and the edit fields of the passport page): not shown as an error. Only for npm run serve.
        runtimeErrors: error => !(error && error.message && error.message.includes('ResizeObserver loop'))
      }
    },
    proxy: {
      '/api': {
        target: 'http://localhost:9080/germinate',
        changeOrigin: true
      }
    }
  },

  transpileDependencies: false,

  publicPath: process.env.NODE_ENV === 'production' ? './' : '/',

  chainWebpack: config => {
    config.plugin('html').tap(args => {
      args[0].title = pageMeta.title
      args[0].pageMeta = pageMeta
      return args
    })
  },

  configureWebpack: {
    plugins: [
      new NodePolyfillPlugin()
    ],

    resolve: {
      fallback: {
        path: require.resolve('path-browserify'),
        querystring: require.resolve('querystring-es3')
      }
    },

    devtool: 'source-map',
    target: 'web'
  }
})
