import { Component, OnInit, ViewChild } from '@angular/core';
import { AmigaModFile, AmigaModNativeSynthImportSynthDriver, AmigaModPlayer2, AmigaModScriptSynthImportSynthDriver, parseModFile } from 'src/lib/formats/AmigaModParser';
import { parseWav } from 'src/lib/formats/WavParser';
import { NativeSynthesizer } from 'src/lib/thrush_engine/synth/native/NativeSynthesizer';
import { ScriptSynthesizer } from 'src/lib/thrush_engine/synth/scriptsynth/ScriptSynthesizer';
import { ThrushAggregatedSequenceGenerator } from 'src/lib/thrush_engine/sequences/ThrushAggregatedSequenceGenerator';
import { ThrushConcatSequenceGenerator } from 'src/lib/thrush_engine/sequences/ThrushConcatSequenceGenerator';
import { ThrushFunctionSequenceGenerator } from 'src/lib/thrush_engine/sequences/ThrushFunctionSequenceGenerator';
import { ThrushPatternSequenceGenerator } from 'src/lib/thrush_engine/sequences/ThrushPatternSequenceGenerator';
import { ThrushSequenceGenerator, ThrushSequencer } from 'src/lib/thrush_engine/ThrushSequencer';
import { MonacoEditorComponent } from './widget-lib/monaco-editor/monaco-editor.component';

const audioContext = new AudioContext();

let sequencer: ThrushSequencer;
let audioWorkletNode: ScriptSynthesizer;
let synthReady = false;
let wavetableSynth = new NativeSynthesizer(audioContext, 16);

const DEFAULT_CODE=
`/**
* @param {ThrushSequenceGenerationCalls} c
*/
function* mainSequence(c) { 
  
  const TEMPO = 0.2;
  
  const bells = (notes, instrumentId, tempo, count) => c.functionSequence(function* (c) {
    let channel = 0;
    for(let x=0; x<count; x++) {
      const noteStep = Math.round(Math.random() * (notes.length-1));     
      yield c.playNote("soft", channel, instrumentId, notes[noteStep], { panning: Math.random() });
      yield c.delay(tempo);
      channel ++;
      if(channel>1) {
        channel = 0;
      }
    }
  });
  
  for(;;) {
    yield c.startSequence(c.functionSequence(function* (c) {
      yield c.playSequence(bells([12, 24, 12], 0, TEMPO/1.5, 12));
      yield c.playSequence(bells([12, 24, 12], 0, TEMPO/1.5, 12));
      yield c.playSequence(bells([12, 24, 12], 0, TEMPO/1.5, 12));
      yield c.playSequence(bells([12, 24, 12], 0, TEMPO/1.5, 12));
      
      yield c.playSequence(bells([9, 21, 9], 0, TEMPO/1.5, 12));
      yield c.playSequence(bells([9, 21, 9], 0, TEMPO/1.5, 12));
      yield c.playSequence(bells([9, 21, 9], 0, TEMPO/1.5, 12));
      yield c.playSequence(bells([9, 21, 9], 0, TEMPO/1.5, 12));
    }));
    
    
    for(let x=0; x<4; x++) {
      yield c.playSequence(c.functionSequence(function* (c) {
        yield c.playNote("native", 2, 0, 0);
        yield c.delay(3*TEMPO);
        yield c.playNote("native", 2, 0, 4);
        yield c.delay(3*TEMPO);
        yield c.playNote("native", 2, 0, 7);
        yield c.delay(2*TEMPO);
      }));
    }

    for(let x=0; x<4; x++) {
      yield c.playSequence(c.functionSequence(function* (c) {
        yield c.playNote("native", 2, 0, -3);
        yield c.delay(3*TEMPO);
        yield c.playNote("native", 2, 0, 0);
        yield c.delay(3*TEMPO);
        yield c.playNote("native", 2, 0, 4);
        yield c.delay(2*TEMPO);
      }));
    }

  } 
}
`;

const TEMPO = 0.2;


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'thrush';
  instrumentArray: ArrayBuffer | null = null;
  synthReady = false;
  seqContextToPlay: ThrushSequenceGenerator | null = null;
  patternCursor: any;
  codeSynth = DEFAULT_CODE;

  private _synthMode: string = 'script';
  private _parsedModule: AmigaModFile | null = null;
  
  @ViewChild('meditor', { read: MonacoEditorComponent })
  codeEditor: MonacoEditorComponent | null = null;
  
  public codeLoadedInsturments: Array<{
    nativeId: number;
    scriptId: number;
    name: string;
  }> = [];

  get synthMode(): string {
    return this._synthMode;
  } 

  set synthMode(v: string) {
    this._synthMode = v;
    this.reloadModFile();
  } 

  async stop() {
    await sequencer.stop();
  }

  async play_sample() {
    audioContext.resume();
    sequencer.start(this.seqContextToPlay!);
  }

  setSynthMode(mode: string) {
    alert('l');
  }
  
  load_sample(eTarget: EventTarget | null) {
    const file_picker = eTarget as HTMLInputElement;
    var sample_file = file_picker!.files![0];
    var reader = new FileReader();

    reader.readAsArrayBuffer(sample_file);
    reader.onloadend = async () => {
      this.instrumentArray = (reader.result as ArrayBuffer);


      const wavFile = parseWav(this.instrumentArray!);

      let instrumentId = await audioWorkletNode.createInstrument(
        wavFile.samples.buffer, wavFile.sampleRate, 0, 0, wavFile.samples.length-1000, 1);
      let instrumentIdNative = sequencer.waveTableSynthesizer.registerInstrument(
        wavFile.samples.buffer, wavFile.sampleRate, 0, 0, wavFile.samples.length-1000, 1);
  
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
      
      aggSeqContext.addChild(seqContext4);
      //aggSeqContext.addChild(seqContext3);
  
      this.seqContextToPlay = aggSeqContext;
    }
  }

  load_code_sample(eTarget: EventTarget | null) {
    const file_picker = eTarget as HTMLInputElement;
    const fileName = file_picker!.value;
    var sample_file = file_picker!.files![0];
    var reader = new FileReader();

    reader.readAsArrayBuffer(sample_file);
    reader.onloadend = async () => {
      const instrumentSampleArray =  (reader.result as ArrayBuffer);
      const wavFile = parseWav(instrumentSampleArray!);
      
      let instrumentId = await audioWorkletNode.createInstrument(
        wavFile.samples.buffer, wavFile.sampleRate, 0, 0, wavFile.samples.length-1000, 1);
      let instrumentIdNative = sequencer.waveTableSynthesizer.registerInstrument(
        wavFile.samples.buffer, wavFile.sampleRate, 0, 0, wavFile.samples.length-1000, 1);

      this.codeLoadedInsturments.push({
        scriptId: instrumentId,
        nativeId: instrumentIdNative,
        name: fileName
      })
    };

  }
  
  load_module2(eTarget: EventTarget | null) {
    const file_picker = eTarget as HTMLInputElement;
    var module_file = file_picker!.files![0];
    var reader = new FileReader();

    reader.readAsArrayBuffer(module_file);
    reader.onloadend = async () => {
      this._parsedModule = parseModFile(reader.result as ArrayBuffer);
      this.reloadModFile();
    }
  }

  load_code() {
    const aggregator = new ThrushAggregatedSequenceGenerator();
    const generatorFunction = new Function(`return (${this.codeEditor?.text!})`)();
    const generatorFunctionSeq = new ThrushFunctionSequenceGenerator(generatorFunction, aggregator);
    aggregator.addChild(generatorFunctionSeq);

    this.seqContextToPlay = aggregator;
  }

  private async reloadModFile() {
    if(this._parsedModule) {

      const driver = 
        this._synthMode == 'script' 
          ? new AmigaModScriptSynthImportSynthDriver(sequencer.tsynthToneGenerator)
          : new AmigaModNativeSynthImportSynthDriver(sequencer.waveTableSynthesizer);
            
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

  ngOnInit(): void {
    (async () => {
      audioContext.suspend();
      await ScriptSynthesizer.loadModuleToContext(audioContext);
      console.log("Module loaded");

      audioWorkletNode = new ScriptSynthesizer(audioContext, 16);
      await audioWorkletNode.initialize();
      audioWorkletNode.audioNode.connect(audioContext.destination);
      console.log("Node connected");

      sequencer = new ThrushSequencer(audioContext, audioWorkletNode, wavetableSynth);

      this.synthReady = true;

      setInterval(() => {
        this.patternCursor = sequencer.cursorTracker.getCursor('pattern');
      }, 50)
    })();
  }
}
