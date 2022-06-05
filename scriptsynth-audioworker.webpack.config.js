module.exports = {
    mode: 'development',
    entry: './src/lib/thrush_engine/synth/scriptsynth/worklet/ScriptSynthWorklet.ts',
    output: {
        filename: 'src/assets/scriptsynth-audio-worklet.js',
        path: __dirname
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                exclude: /node_modules/,
                options: {
                  configFile: 'tsconfig.scriptsynth-audioworker.json'
                }
            },
        ]
    },
    resolve: {
        extensions: [".ts", ".js"]
    },
};
