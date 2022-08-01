import { Component, OnInit } from '@angular/core';
import { AmigaModFile, AmigaModNativeSynthImportSynthDriver, AmigaModPlayer2, AmigaModScriptSynthImportSynthDriver, parseModFile } from 'src/lib/formats/AmigaModParser';
import { parseWav } from 'src/lib/formats/WavParser';
import { ThrushAggregatedSequenceGenerator } from 'src/lib/thrush_engine/sequences/ThrushAggregatedSequenceGenerator';
import { ThrushConcatSequenceGenerator } from 'src/lib/thrush_engine/sequences/ThrushConcatSequenceGenerator';
import { ThrushFunctionSequenceGenerator } from 'src/lib/thrush_engine/sequences/ThrushFunctionSequenceGenerator';
import { ThrushPatternSequenceGenerator } from 'src/lib/thrush_engine/sequences/ThrushPatternSequenceGenerator';
import { ThrushSequenceGenerator } from 'src/lib/thrush_engine/ThrushSequencer';
import { ThrushEngineService } from './services/thrush-engine.service';

const TEMPO = 0.2;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'thrush';
  seqContextToPlay: ThrushSequenceGenerator | null = null;
  patternCursor: any;

  private _synthMode: string = 'script';
  private _parsedModule: AmigaModFile | null = null;
  constructor(private _thrushEngine: ThrushEngineService) {
    console.log("BLAAA " + require('../../node_modules/monaco-editor/esm/vs/base/browser/ui/codicons/codicon/codicon.ttf').default)
  }

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

      let instrumentId = await this._thrushEngine.sequencer.tsynthToneGenerator.createInstrument(
        wavFile.samples.buffer, wavFile.sampleRate, 0, 0, wavFile.samples.length-1000, 1);
      let instrumentIdNative = this._thrushEngine.sequencer.waveTableSynthesizer.registerInstrument(
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

}
