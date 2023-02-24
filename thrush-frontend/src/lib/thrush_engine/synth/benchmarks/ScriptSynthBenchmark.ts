import { Script } from 'vm';
import './BenchmarkJsShim';
import { Benchmark } from './BenchmarkJsShim';
import { ScriptSynthEngine } from '../scriptsynth/ScriptSynthEngine';
import { ScriptSynthWaveInstrument } from '../scriptsynth/ScriptSynthInstrumentWave';


export const ScriptSynthBenchmark = 
  new Benchmark.Suite()  
  .add('single-note-all-fm', () => {
    const bmEngine = new ScriptSynthEngine(22050, 16);
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
    
    bmEngine.fillSampleBuffer(0, new Float32Array(22050), new Float32Array(22050), 0, 22050);
  }, {initCount: 15, minSamples: 15})
  .add('single-note-all-channels', () => {
    const bmEngine = new ScriptSynthEngine(22050, 16);
    bmEngine.registerInstrument('i1', new ScriptSynthWaveInstrument(
      new Float32Array(8192),
      8192, 10, 1000, 1, 
      {
        volume: [{ time: 0, value: 0}, { time: 0.2, value: 0.3 }, { time: 0.3, value: 0.9 }]
      }, null));
    
    for(let nid = 0; nid < 16; nid++) {
      bmEngine.enqueueEvent({ channelOrNoteId: `n${nid}`, newNote: { instrumentId: 'i1', note: 11+nid }, time: nid*0.01 });
    }
    
    bmEngine.fillSampleBuffer(0, new Float32Array(22050), new Float32Array(22050), 0, 22050);
  }, {initCount: 15, minSamples: 15})  
  .add('single-note-all-channels-vibrator', () => {
    const bmEngine = new ScriptSynthEngine(22050, 16);
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
    
    bmEngine.fillSampleBuffer(0, new Float32Array(22050), new Float32Array(22050), 0, 22050);
  }, {initCount: 15, minSamples: 15})
  
  
