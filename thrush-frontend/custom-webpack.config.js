const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const WebpackBeforeBuildPlugin = require('before-build-webpack');
const { exec } = require('child_process');
const { accessSync, statSync } = require('fs');

function shouldBuild(srcFile, destFile) {
  try {
    accessSync(destFile);
  } catch(e) {
    return true;
  }

  const srcTime = statSync(srcFile).mtime;
  const destTime = statSync(destFile).mtime;
  if(destTime < srcTime) {
    return true;
  }


  return false;
}
module.exports = (config, options, targetOptions) => {

  

  config.plugins.push(
    new WebpackBeforeBuildPlugin((status, callback) => {
      console.log("Building synth audio worker WASM routines");
      
      if(shouldBuild('src/lib/thrush_engine/synth/scriptsynth/wasm/synthRoutines.wat', 'src/lib/thrush_engine/synth/scriptsynth/wasm/synthRoutines.wasm.embed')) {      
        exec('cd src/lib/thrush_engine/synth/scriptsynth/wasm && wat2wasm synthRoutines.wat --output synthRoutines.wasm.embed');        
      } else {
        console.log("No changes to source file");
      }

      callback();
    })
  );

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

  config.module.rules.unshift(
    {
      test: /\.wasm.embed$/,
      use: [ 'arraybuffer-loader' ]
    }
  )
  config.module.noParse = /benchmark\.js/;
  
  return config;
};

