import { Component, OnInit } from '@angular/core';
import { AmigaModNativeSynthImportSynthDriver, AmigaModPlayer, AmigaModPlayer2, AmigaModScriptSynthImportSynthDriver, parseModFile } from 'src/lib/formats/AmigaModParser';
import { parseWav } from 'src/lib/formats/WavParser';
import { NativeSynthesizer } from 'src/lib/thrush_engine/synth/native/NativeSynthesizer';
import { ScriptSynthesizer } from 'src/lib/thrush_engine/synth/scriptsynth/ScriptSynthesizer';
import { ThrushAggregatedSequenceGenerator } from 'src/lib/thrush_engine/ThrushAggregatedSequenceGenerator';
import { ThrushConcatSequenceGenerator } from 'src/lib/thrush_engine/ThrushConcatSequenceGenerator';
import { ThrushFunctionSequenceGenerator } from 'src/lib/thrush_engine/ThrushFunctionSequenceGenerator';
import { ThrushPatternSequenceGenerator } from 'src/lib/thrush_engine/ThrushPatternSequenceGenerator';
import { ThrushSequenceGenerator, ThrushSequencer } from 'src/lib/thrush_engine/ThrushSequencer';
import { ThrushCommonSynthesizerEvent } from 'src/lib/thrush_engine/ThrushSynthesizerInterface';

const audioContext = new AudioContext();

let sequencer: ThrushSequencer;
let audioWorkletNode: ScriptSynthesizer;
let synthReady = false;
let wavetableSynth = new NativeSynthesizer(audioContext, 16);

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

  async stop() {
    await sequencer.stop();
  }

  async play_sample() {
    audioContext.resume();
    sequencer.start(this.seqContextToPlay!);
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
          yield 2*TEMPO;
          yield playNoteOnWaveSynthChannel(1, instrumentIdNative, 16);
          yield 2*TEMPO;
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

  load_module(eTarget: EventTarget | null) {
    const file_picker = eTarget as HTMLInputElement;
    var module_file = file_picker!.files![0];
    var reader = new FileReader();

    reader.readAsArrayBuffer(module_file);
    reader.onloadend = async () => {
      const parsedModule = parseModFile(reader.result as ArrayBuffer);
      const player = new AmigaModPlayer(parsedModule);
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
      const parsedModule = parseModFile(reader.result as ArrayBuffer);
      const driver = new AmigaModScriptSynthImportSynthDriver(sequencer.tsynthToneGenerator);
      //const driver = new AmigaModNativeSynthImportSynthDriver(sequencer.waveTableSynthesizer);
      
      const player = new AmigaModPlayer2(parsedModule, driver);
      const bindings = await player.createPatternBinding();
      const cres = player.compileSong();      

      this.seqContextToPlay = 
        new ThrushConcatSequenceGenerator(
          cres.song.map((patternIndex) => 
            new ThrushPatternSequenceGenerator(cres.patterns[patternIndex], bindings)
          )
        );
      //new ThrushPatternSequenceGenerator(cres.patterns[0], bindings);
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

      this.synthReady = true
    })();
  }
}
