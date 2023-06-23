import { Component, OnInit } from '@angular/core';
import { AmigaModFile, parseModFile, AmigaModScriptSynthImportSynthDriver, AmigaModNativeSynthImportSynthDriver, AmigaModPlayer2 } from 'src/lib/formats/AmigaModParser';
import { parseWav } from 'src/lib/formats/WavParser';
import { ThrushAggregatedSequenceGenerator } from 'src/lib/thrush_engine/sequences/ThrushAggregatedSequenceGenerator';
import { ThrushConcatSequenceGenerator } from 'src/lib/thrush_engine/sequences/ThrushConcatSequenceGenerator';
import { ThrushFunctionSequenceGenerator } from 'src/lib/thrush_engine/sequences/ThrushFunctionSequenceGenerator';
import { ThrushPatternSequenceGenerator } from 'src/lib/thrush_engine/sequences/ThrushPatternSequenceGenerator';
import { ThrushSequenceGenerator } from 'src/lib/thrush_engine/ThrushSequencer';
import { ThrushEngineService } from '../services/thrush-engine.service';
import { EditedWaveform } from '../widget-lib/waveform-editor/waveform-editor.component';
import { EnvelopeCurveCoordinate } from 'src/lib/thrush_engine/synth/common/Envelopes';
import { ScriptSynthBenchmark } from 'src/lib/thrush_engine/synth/benchmarks/ScriptSynthBenchmark';
import { Suite } from 'benchmark';
import { Benchmark, BenchmarkStats } from 'src/lib/thrush_engine/synth/benchmarks/BenchmarkJsShim';
import { FmAlgorithmNode, ScriptSynthFmInstrument } from 'src/lib/thrush_engine/synth/scriptsynth/ScriptSynthInstrumentFm';



type BenchmarkResultSummary = {
  name: string;
  stats: BenchmarkStats;
}

const TEMPO = 0.2;

@Component({
  selector: 'app-test-page',
  templateUrl: './test-page.component.html',
  styleUrls: ['./test-page.component.scss']
})
export class TestPageComponent implements OnInit {
  seqContextToPlay: ThrushSequenceGenerator | null = null;
  patternCursor: any;

  private _synthMode: string = 'script';
  private _parsedModule: AmigaModFile | null = null;

  public benchmarkResults: BenchmarkResultSummary[] | null = null;

  public editedWaveform: EditedWaveform | null = null;
  public editedEnvelope: EnvelopeCurveCoordinate[] | null = [{
    time: 0,
    value: 1
  }];
 
  public eNoteValue: number = 11;
  
  public fmWaveform: EditedWaveform | null = null;
  constructor(private _thrushEngine: ThrushEngineService) { }

  ngOnInit(): void {
    (async () => {
      await this._thrushEngine.initialize();

      setInterval(() => {
        this.patternCursor = this._thrushEngine.sequencer.cursorTracker.getCursor('pattern');
      }, 50);
    })();

  }


  get synthMode(): string {
    return this._synthMode;
  } 

  set synthMode(v: string) {
    this._synthMode = v;
    this.reloadModFile();
  } 

  async handleStop() {
    await this._thrushEngine.stop();    
  }

  async handlePlayTest() {
    this._thrushEngine.playSequence(this.seqContextToPlay);
  }

  handleLoadSample(eTarget: EventTarget | null) {
    const file_picker = eTarget as HTMLInputElement;
    var sample_file = file_picker!.files![0];
    var reader = new FileReader();

    reader.readAsArrayBuffer(sample_file);
    reader.onloadend = async () => {
      const instrumentArray = (reader.result as ArrayBuffer);
      const wavFile = parseWav(instrumentArray!);

      this.editedWaveform = { 
        channelSamples: wavFile.samples,
        sampleRate: wavFile.sampleRate
      };

      const instrumentId = 'instrumentOne';
      await this._thrushEngine.sequencer.tsynthToneGenerator.createInstrument(instrumentId, 
        wavFile.samples[0].buffer, wavFile.sampleRate, 0, wavFile.samples.length-1000, 1);
      
      const instrumentIdNative = 'instrumentOne';
      this._thrushEngine.sequencer.waveTableSynthesizer.registerInstrument(instrumentIdNative,
        wavFile.samples[0].buffer, wavFile.sampleRate, 0, wavFile.samples.length-1000, 1);
  
      const aggSeqContext = new ThrushAggregatedSequenceGenerator();

      const seqContext = new ThrushFunctionSequenceGenerator(function* (c) {
        for(;;) {
          yield c.playNote('soft', 0, instrumentId, 0);
          yield c.delay(2*TEMPO);
          yield c.playNote('soft', 0, instrumentId, 4);
          yield c.delay(2*TEMPO);
          yield c.playNote('soft', 0, instrumentId, 7);
          yield c.delay(2*TEMPO);
        }
      }, aggSeqContext);
  
      const seqContext2 = new ThrushFunctionSequenceGenerator(function* (c) {
        for(;;) {
          yield c.playNote('soft', 1, instrumentIdNative, 12);
          yield c.delay(3*TEMPO);
          yield c.playNote('soft', 1, instrumentIdNative, 16);
          yield c.delay(3*TEMPO);
          yield c.playNote('soft', 1, instrumentIdNative, 19);
          yield c.delay(2*TEMPO);
        }
      }, aggSeqContext);
  
      const seqContext3 = new ThrushFunctionSequenceGenerator(function* (c) {
        for(;;) {
          yield c.playNote('native', 1, instrumentIdNative, 12);
          yield c.delay(3*TEMPO);
          yield c.playNote('native', 1, instrumentIdNative, 16);
          yield c.delay(3*TEMPO);
          yield c.playNote('native', 1, instrumentIdNative, 19);
          yield c.delay(2*TEMPO);
        }
      }, aggSeqContext);
  
      const seqContext4 = new ThrushFunctionSequenceGenerator(function* (c) {
        for(;;) {
          yield c.playSequence(c.functionSequence(function* (c) {
            
              yield c.playNote('native', 1, instrumentIdNative, 12);
              yield c.delay(3*TEMPO);
              yield c.playNote('native', 1, instrumentIdNative, 16);
              yield c.delay(3*TEMPO);
              yield c.playNote('native', 1, instrumentIdNative, 19);
              yield c.delay(2*TEMPO);            
          }));

          yield c.playSequence(c.functionSequence(function* (c) {
            
              yield c.playNote('soft', 0, instrumentId, 0);
              yield c.delay(2*TEMPO);
              yield c.playNote('soft', 0, instrumentId, 4);
              yield c.delay(2*TEMPO);
              yield c.playNote('soft', 0, instrumentId, 7);
              yield c.delay(2*TEMPO);
                }
          ));

          yield c.delay(9*TEMPO);
          yield c.cursor('dummy', 1);
        }
      }, aggSeqContext);
      
      aggSeqContext.addInitialChild(seqContext4);
      //aggSeqContext.addInitialChild(seqContext3);
  
      this.seqContextToPlay = aggSeqContext;
    }
  }

  
  handleLoadModule(eTarget: EventTarget | null) {
    const file_picker = eTarget as HTMLInputElement;
    var module_file = file_picker!.files![0];
    var reader = new FileReader();

    reader.readAsArrayBuffer(module_file);
    reader.onloadend = async () => {
      this._parsedModule = parseModFile(reader.result as ArrayBuffer);
      this.reloadModFile();
    }
  }

  private async reloadModFile() {
    if(this._parsedModule) {

      const driver = 
        this._synthMode == 'script' 
          ? new AmigaModScriptSynthImportSynthDriver(this._thrushEngine.sequencer.tsynthToneGenerator)
          : new AmigaModNativeSynthImportSynthDriver(this._thrushEngine.sequencer.waveTableSynthesizer);
            
      const player = new AmigaModPlayer2(this._parsedModule, driver);
      const bindings = await player.createPatternBinding();
      const cres = player.compileSong();      

      this.seqContextToPlay = 
        new ThrushConcatSequenceGenerator(
          cres.song.map((patternIndex) => 
            new ThrushPatternSequenceGenerator(cres.patterns[patternIndex], bindings, "pattern")
          )
        );
    }
  }

  
  get synthReady(): boolean {
    return this._thrushEngine.ready;
  }

  runBenchmark() {
    this.runAndReportBenchmark(ScriptSynthBenchmark);
  }

  computeFm() {
    const instrument = new ScriptSynthFmInstrument(new FmAlgorithmNode('sine', false, 1, [], [], 0, [
      new FmAlgorithmNode('sine', false, 1.98, [], [], 0, [])
    ]));

    const outputSampleRate = 22050;
    const noteGenerator = instrument.createNoteGenerator(24, outputSampleRate, 0);
    
    const editedWaveform: EditedWaveform = {
      sampleRate: outputSampleRate,
      channelSamples: [new Float32Array(outputSampleRate*0.12), new Float32Array(outputSampleRate*0.12)]
    }
    const outputChannels = [0, 0];

    for(let idx=0; idx<editedWaveform.channelSamples[0].length; idx++) {
      outputChannels[0] = 0; 
      outputChannels[1] = 0; 

      if(!noteGenerator.getNoteSample(idx, idx/outputSampleRate, outputChannels)) {
        break;
      }

      editedWaveform.channelSamples[0][idx] = outputChannels[0];
      editedWaveform.channelSamples[1][idx] = outputChannels[1];
    } 

    this.fmWaveform = editedWaveform;
  }

  get fmWaveformDuration(): number {
    return this.fmWaveform
      ? this.fmWaveform.channelSamples[0].length / this.fmWaveform.sampleRate
      : 0;
  }

  private runAndReportBenchmark(benchmark: Suite) {
    benchmark.on('complete',  ()  => {
      this.benchmarkResults = 
        ScriptSynthBenchmark.map((bm: Benchmark) => ({ name: bm, stats: bm.stats }) );
    })
    .run({ async: true });
  }
}
