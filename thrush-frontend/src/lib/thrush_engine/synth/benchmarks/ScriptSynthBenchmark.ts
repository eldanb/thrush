import { Script } from 'vm';
import './BenchmarkJsShim';
import { Benchmark } from './BenchmarkJsShim';
import { ScriptSynthEngine } from '../scriptsynth/ScriptSynthEngine';
import { ScriptSynthWaveInstrument } from '../scriptsynth/ScriptSynthInstrumentWave';
import { FmAlgorithmNode, ScriptSynthFmInstrument } from '../scriptsynth/ScriptSynthInstrumentFm';


export const ScriptSynthBenchmark = 
  new Benchmark.Suite()  
  .add('single-note-all-fm', () => {
    const bmEngine = new ScriptSynthEngine(44100, 16);
    bmEngine.registerInstrument('i1', new ScriptSynthWaveInstrument(
      new Float32Array(8192),
      8192, 10, 1000, 1, 
      {
        volume: [{ time: 0, value: 0}, { time: 0.2, value: 0.3 }, { time: 0.3, value: 0.9 }]
      }, null));
    
    for(let nid = 0; nid < 16; nid++) {
      // TODO
      bmEngine.enqueueEvent({ channelOrNoteId: `n${nid}`, newNote: { instrumentId: 'fm_sample', note: 11+nid }, time: nid*0.01 });
    }
    
    bmEngine.fillSampleBuffer(0, new Float32Array(44100), new Float32Array(44100), 0, 44100);
  }, {initCount: 15, minSamples: 15})  
  .add('single-note-all-fm-two-instruments', () => {
    const bmEngine = new ScriptSynthEngine(44100, 16);
    bmEngine.registerInstrument('fm_sample2', new ScriptSynthFmInstrument(
      new FmAlgorithmNode('sine', false, 1, [{ time: 0, value: 1 }, { time: 1, value: 0 }], [{ time: 1, value: 0 }], 0, [
        new FmAlgorithmNode('sine', false, 3, [{time: 0, value: 0.27}, {time: 2, value: 0.22}], [], 0, [
          new FmAlgorithmNode('sine', false, 7, [{time: 0, value: 0.5 }, {time: 0.030, value: 0.23}], [], 0, [
            new FmAlgorithmNode('sine', false, 16, [{time: 0, value: 0.37 }, {time: 0.05, value: 0.20}], [], 0, [])
          ])
        ])
      ]),
      [
        {
          type: 'chorus',
          depth: 0.002,
          mixLevel: 0.4,
          delay: 0.003,
          frequency: 6.0
        }
      ]
    ));
    
    for(let nid = 0; nid < 16; nid++) {
      // TODO
      bmEngine.enqueueEvent({ channelOrNoteId: `n${nid}`, newNote: { instrumentId: nid & 1 ? 'fm_sample' : 'fm_sample2', note: 11+nid }, time: nid*0.01 });
    }
    
    bmEngine.fillSampleBuffer(0, new Float32Array(44100), new Float32Array(44100), 0, 44100);
  }, {initCount: 15, minSamples: 15})
  .add('single-note-all-fm-reverb', () => {
    const bmEngine = new ScriptSynthEngine(44100, 16);
    bmEngine.registerInstrument('fm_sample3', new ScriptSynthFmInstrument(
      new FmAlgorithmNode('sine', false, 1, [{ time: 0, value: 1 }, { time: 1, value: 0 }], [{ time: 1, value: 0 }], 0, [
        new FmAlgorithmNode('sine', false, 3, [{time: 0, value: 0.27}, {time: 2, value: 0.22}], [], 0, [
          new FmAlgorithmNode('sine', false, 7, [{time: 0, value: 0.5 }, {time: 0.030, value: 0.23}], [], 0, [
            new FmAlgorithmNode('sine', false, 16, [{time: 0, value: 0.37 }, {time: 0.05, value: 0.20}], [], 0, [])
          ])
        ])
      ]),
      [
        {
          type: 'reverb',
          combDelays: [4800, 5000, 5400, 5802], 
          combGains: [0.742, 0.733, 0.715, 0.697], 
          allPassDelays: [1051, 337], 
          allPassGains: [0.7, 0.7]
        }
      ]
    ));
    
    for(let nid = 0; nid < 16; nid++) {
      // TODO
      bmEngine.enqueueEvent({ channelOrNoteId: `n${nid}`, newNote: { instrumentId: 'fm_sample3', note: 11+nid }, time: nid*0.01 });
    }
    
    bmEngine.fillSampleBuffer(0, new Float32Array(44100), new Float32Array(44100), 0, 44100);
  }, {initCount: 15, minSamples: 15})
  .add('single-note-all-channels', () => {
    const bmEngine = new ScriptSynthEngine(44100, 16);
    bmEngine.registerInstrument('i1', new ScriptSynthWaveInstrument(
      new Float32Array(8192),
      8192, 10, 1000, 1, 
      {
        volume: [{ time: 0, value: 0}, { time: 0.2, value: 0.3 }, { time: 0.3, value: 0.9 }]
      }, null));
    
    for(let nid = 0; nid < 16; nid++) {
      bmEngine.enqueueEvent({ channelOrNoteId: `n${nid}`, newNote: { instrumentId: 'i1', note: 11+nid }, time: nid*0.01 });
    }
    
    bmEngine.fillSampleBuffer(0, new Float32Array(44100), new Float32Array(44100), 0, 44100);
  }, {initCount: 15, minSamples: 15})  
  .add('single-note-all-channels-vibrator', () => {
    const bmEngine = new ScriptSynthEngine(44100, 16);
    bmEngine.registerInstrument('i1', new ScriptSynthWaveInstrument(
      new Float32Array(8192),
      8192, 10, 1000, 1, 
      {
        volume: [{ time: 0, value: 0}, { time: 0.2, value: 0.3 }, { time: 0.3, value: 0.9 }]
      }, null));
    
    for(let nid = 0; nid < 16; nid++) {
      bmEngine.enqueueEvent({ channelOrNoteId: `n${nid}`, 
        newNote: { instrumentId: 'i1', note: 11+nid }, 
        vibrato: {waveform: 'sine', amplitude: 0.3, frequency: 0.2 },
        time: nid*0.01 });
    }
    
    bmEngine.fillSampleBuffer(0, new Float32Array(44100), new Float32Array(44100), 0, 44100);
  }, {initCount: 15, minSamples: 15})
  
  
