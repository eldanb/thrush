import { Component, ComponentRef, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AmigaModFile, AmigaModNativeSynthImportSynthDriver, AmigaModPlayer, AmigaModPlayer2, AmigaModScriptSynthImportSynthDriver, parseModFile } from 'src/lib/formats/AmigaModParser';
import { parseWav } from 'src/lib/formats/WavParser';
import { NativeSynthesizer } from 'src/lib/thrush_engine/synth/native/NativeSynthesizer';
import { ScriptSynthesizer } from 'src/lib/thrush_engine/synth/scriptsynth/ScriptSynthesizer';
import { ThrushAggregatedSequenceGenerator } from 'src/lib/thrush_engine/ThrushAggregatedSequenceGenerator';
import { ThrushConcatSequenceGenerator } from 'src/lib/thrush_engine/ThrushConcatSequenceGenerator';
import { ThrushFunctionSequenceGenerator } from 'src/lib/thrush_engine/ThrushFunctionSequenceGenerator';
import { ThrushPatternSequenceGenerator } from 'src/lib/thrush_engine/ThrushPatternSequenceGenerator';
import { ThrushSequenceGenerator, ThrushSequencer } from 'src/lib/thrush_engine/ThrushSequencer';
import { ThrushCommonSynthesizerEvent } from 'src/lib/thrush_engine/ThrushSynthesizerInterface';
import { MonacoEditorComponent } from './widget-lib/monaco-editor/monaco-editor.component';

const audioContext = new AudioContext();

let sequencer: ThrushSequencer;
let audioWorkletNode: ScriptSynthesizer;
let synthReady = false;
let wavetableSynth = new NativeSynthesizer(audioContext, 16);

const DEFAULT_CODE=`
(() => {
  const TEMPO = 0.2;
  const g = function* (tg) {  
    for(;;) {
      yield playNoteOnChannel(0, 0, 0);
      yield 2*TEMPO;
      yield playNoteOnChannel(0, 0, 4);
      yield 2*TEMPO;
      yield playNoteOnChannel(0, 0, 7);
      yield 2*TEMPO;
    }
  }

  return g;
})()
`;

function playNoteOnChannel(channel: number, instrumentId: number, note: number) {
  return (time: number) => new ThrushCommonSynthesizerEvent(time, sequencer.tsynthToneGenerator, 
    channel, {
      newNote: {
        instrumentId,
        note
      }
    });
}

function playNoteOnWaveSynthChannel(channel: number, instrumentId: number, note: number) {
  return (time: number) => new ThrushCommonSynthesizerEvent(time, sequencer.waveTableSynthesizer, 
    channel, {
      newNote: {
        instrumentId,
        note
      }
    });
}

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
  
      const seqContext = new ThrushFunctionSequenceGenerator(function* (tg) {
        for(;;) {
          yield playNoteOnChannel(0, instrumentId, 0);
          yield 2*TEMPO;
          yield playNoteOnChannel(0, instrumentId, 4);
          yield 2*TEMPO;
          yield playNoteOnChannel(0, instrumentId, 7);
          yield 2*TEMPO;
        }
      });
  
      const seqContext2 = new ThrushFunctionSequenceGenerator(function* (tg) {
        for(;;) {
          yield playNoteOnWaveSynthChannel(1, instrumentIdNative, 12);
          yield 3*TEMPO;
          yield playNoteOnWaveSynthChannel(1, instrumentIdNative, 16);
          yield 3*TEMPO;
          yield playNoteOnWaveSynthChannel(1, instrumentIdNative, 19);
          yield 2*TEMPO;
        }
      });
  
      const seqContext3 = new ThrushFunctionSequenceGenerator(function* (tg) {
        for(;;) {
          yield playNoteOnWaveSynthChannel(1, instrumentIdNative, 12);
          yield 3*TEMPO;
          yield playNoteOnWaveSynthChannel(1, instrumentIdNative, 16);
          yield 3*TEMPO;
          yield playNoteOnWaveSynthChannel(1, instrumentIdNative, 19);
          yield 2*TEMPO;
        }
      });
  
      const aggSeqContext = new ThrushAggregatedSequenceGenerator();
      aggSeqContext.addChild(seqContext);
      aggSeqContext.addChild(seqContext3);
  
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
  load_module(eTarget: EventTarget | null) {
    const file_picker = eTarget as HTMLInputElement;
    var module_file = file_picker!.files![0];
    var reader = new FileReader();

    reader.readAsArrayBuffer(module_file);
    reader.onloadend = async () => {
      this._parsedModule = parseModFile(reader.result as ArrayBuffer);
      const player = new AmigaModPlayer(this._parsedModule);
      await player.loadInstruments(sequencer);

      this.seqContextToPlay = player;
    }
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
    const generatorFunction = eval(this.codeEditor?.text!);
    this.seqContextToPlay = new ThrushFunctionSequenceGenerator(generatorFunction);
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
