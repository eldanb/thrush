const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const WebpackBeforeBuildPlugin = require('before-build-webpack');
const { exec } = require('child_process');

module.exports = (config, options, targetOptions) => {
  config.plugins.push(
    new WebpackBeforeBuildPlugin((status, callback) => {
      console.log("Building synth audio worker");
      exec('webpack -c scriptsynth-audioworker.webpack.config.js');
      callback();
    })
  );

  config.plugins.push(
    new WebpackBeforeBuildPlugin((status, callback) => {
      console.log("Building synth generator .d.ts");
      exec('webpack -c thrush-sequence-generator-interface.webpack.config.js');
      callback();
    })
  );

  config.plugins.push(
    new MonacoWebpackPlugin()
  );

  const existingCssRule = config.module.rules.find((r) => 
    r.test.toString() == "/\\.(?:css)$/i"
  );

  existingCssRule.exclude = existingCssRule.exclude || [];
  existingCssRule.exclude.push(/monaco/);

  config.module.rules.push(
  {
    test: /\.ttf$/,
    loader: 'file-loader',
    include: [/monaco/]
  });
  
  config.module.rules.push(
  {
    test: /\.css$/,
    use: ['style-loader', {
      'loader': 'css-loader',
      options: {
        esModule: false
      }
  }],
    include: [/monaco/]
  });
  
  return config;
};
