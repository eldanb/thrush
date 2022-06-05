const WebpackBeforeBuildPlugin = require('before-build-webpack');
const { exec } = require('child_process');

module.exports = {
  plugins: [
    new WebpackBeforeBuildPlugin((status, callback) => {
      console.log("Building synth audio worker");
      exec('webpack -c scriptsynth-audioworker.webpack.config.js');
      callback();
    })
  ]
}
