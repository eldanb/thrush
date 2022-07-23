module.exports = {
  mode: 'development',
  entry: './src/lib/thrush_engine/ThrushFunctionGeneratorInterfaces.ts',  
  output: {
    filename: 'generated/ThrushFunctionGeneratorInterfaces.d.ts',
    path: __dirname
  },
  module: {
      rules: [
          {
              test: /\.ts$/,
              loader: 'ts-loader',
              exclude: /node_modules/,
              options: {
                configFile: 'tsconfig.thrush-sequence-generator-dts.json'
              }
          },
      ]
  },
  resolve: {
      extensions: [".ts", ".js"]
  }
};
