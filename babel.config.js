module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    env: {
      test: {
        presets: ['babel-preset-expo'],
      },
    },
  }
}
