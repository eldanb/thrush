import { Component, OnInit } from '@angular/core';
import { AmigaModPlayer, parseModFile } from 'src/lib/formats/AmigaModParser';
import { parseWav } from 'src/lib/formats/WavParser';
import { NativeSynthesizer } from 'src/lib/thrush_engine/synth/native/NativeSynthesizer';
import { NativeSynthesizerInstrument } from 'src/lib/thrush_engine/synth/native/NativeSynthesizerInstrument';
import { ScriptSynthesizer } from 'src/lib/thrush_engine/synth/scriptsynth/ScriptSynthesizer';
import { ThrushAggregatedSequenceGenerator } from 'src/lib/thrush_engine/ThrushAggregatedSequenceGenerator';
import { ThrushFunctionSequenceGenerator } from 'src/lib/thrush_engine/ThrushFunctionSequenceGenerator';
import { ThrushSequencer } from 'src/lib/thrush_engine/ThrushSequencer';

const audioContext = new AudioContext();

let sequencer: ThrushSequencer;
let audioWorkletNode: ScriptSynthesizer;
let synthReady = false;
let wavetableSynth = new NativeSynthesizer(audioContext, 16);

function playNoteOnChannel(channel: number, instrumentId: number, note: number) {
  return (time: number) => ({
    time,
    async route(sequencer: ThrushSequencer) {
      sequencer.tsynthToneGenerator.enqueueEvent({
        time: this.time,
        channel,
        newNote: {
          instrumentId,
          note
        }
      });
    }
  })
}

function playNoteOnWaveSynthChannel(channel: number, instrument: NativeSynthesizerInstrument, note: number) {
  return (time: number) => ({
    time,
    async route(sequencer: ThrushSequencer) {
      sequencer.waveTableSynthesizer.scheduleNote(this.time, channel, note, instrument);
    }
  })
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

  async stop() {
    await sequencer.stop();
  }

  async play_sample() {
    audioContext.resume();
    const wavFile = parseWav(this.instrumentArray!);

    let instrumentId = await audioWorkletNode.synthInterface.createInstrument(
      wavFile.samples.buffer, wavFile.sampleRate, 0, 0, wavFile.samples.length-1000, 1);
    let instrument = NativeSynthesizerInstrument.fromWavFileContent(this.instrumentArray!);

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
        yield playNoteOnWaveSynthChannel(1, instrument, 12);
        yield 3*TEMPO;
        yield playNoteOnWaveSynthChannel(1, instrument, 16);
        yield 3*TEMPO;
        yield playNoteOnWaveSynthChannel(1, instrument, 19);
        yield 2*TEMPO;
      }
    });

    const seqContext3 = new ThrushFunctionSequenceGenerator(function* (tg) {
      for(;;) {
        yield playNoteOnWaveSynthChannel(1, instrument, 12);
        yield 2*TEMPO;
        yield playNoteOnWaveSynthChannel(1, instrument, 16);
        yield 2*TEMPO;
        yield playNoteOnWaveSynthChannel(1, instrument, 19);
        yield 2*TEMPO;
      }
    });

    const aggSeqContext = new ThrushAggregatedSequenceGenerator();
    aggSeqContext.addChild(seqContext);
    aggSeqContext.addChild(seqContext3);

    sequencer.start(aggSeqContext);
  }

  load_sample(eTarget: EventTarget | null) {
    const file_picker = eTarget as HTMLInputElement;
    var sample_file = file_picker!.files![0];
    var reader = new FileReader();

    reader.readAsArrayBuffer(sample_file);
    reader.onloadend = () => {
      this.instrumentArray = (reader.result as ArrayBuffer);
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
      audioContext.resume();
      sequencer.start(player);
    }
  }

  ngOnInit(): void {
    (async () => {
      audioContext.suspend();
      await ScriptSynthesizer.loadModuleToContext(audioContext);
      console.log("Module loaded");

      audioWorkletNode = new ScriptSynthesizer(audioContext, 16);
      await audioWorkletNode.synthInterface.configure(audioContext.sampleRate);
      audioWorkletNode.audioNode.connect(audioContext.destination);
      console.log("Node connected");

      sequencer = new ThrushSequencer(audioContext, audioWorkletNode.synthInterface, wavetableSynth);

      this.synthReady = true
    })();
  }
}
