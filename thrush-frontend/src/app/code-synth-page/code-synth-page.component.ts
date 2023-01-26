import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatSelectChange } from '@angular/material/select';
import { parseWav } from 'src/lib/formats/WavParser';
import { ThrushAggregatedSequenceGenerator } from 'src/lib/thrush_engine/sequences/ThrushAggregatedSequenceGenerator';
import { ThrushFunctionSequenceGenerator } from 'src/lib/thrush_engine/sequences/ThrushFunctionSequenceGenerator';
import { ResourceEditorDialogService } from '../resource-editors/resource-editor-dialog-service/resource-editor-dialog.service';
import { WaveInstrumentEditorComponent } from '../resource-editors/wave-instrument-editor/wave-instrument-editor.component';
import { ThrushEngineService } from '../services/thrush-engine.service';
import { MonacoEditorComponent } from '../widget-lib/monaco-editor/monaco-editor.component';



@Component({
  selector: 'app-code-synth-page',
  templateUrl: './code-synth-page.component.html',
  styleUrls: ['./code-synth-page.component.scss']
})
export class CodeSynthPageComponent implements OnInit {

  readonly EXAMPLES_LIST: { title: string; content: string }[] = [
    { title: 'Procedural Music Generation', content: require('!raw-loader!src/assets/example-songs/code/procedural-generation.txt').default },
    { title: 'Part Notation Sequences', content: require('!raw-loader!src/assets/example-songs/code/part-notation.txt').default }
  ];
  
  @ViewChild('meditor', { read: MonacoEditorComponent })
  codeEditor: MonacoEditorComponent | null = null;

  @ViewChild('codeSampleLoadCtl', { read: ElementRef })
  codeSampleLoadCtl?: ElementRef<HTMLInputElement>;
  
  sequenceCode = require('!raw-loader!src/assets/example-songs/code/default-new-code.txt').default;

  public codeLoadedInsturments: Array<{
    nativeId: number;
    scriptId: number;
    name: string;
  }> = [];

  constructor(private _thrushEngine: ThrushEngineService,
              private _resourceEditDialogSerice: ResourceEditorDialogService) { }

  ngOnInit(): void {
    (async () => {
      await this._thrushEngine.initialize();

      const sampleUrlsToLoad = [
        './assets/example-songs/samples/piano.wav', 
        './assets/example-songs/samples/bass.wav', 
        './assets/example-songs/samples/strsynth.wav'];
      (async () => {
        for(let index=0; index<sampleUrlsToLoad.length; index++) {
          await this.loadSampleFromUrl(sampleUrlsToLoad[index]);
        }
      })();
    })();
  }

  async handleCodeSampleLoadButtonClick() {
    const instrument = await this._resourceEditDialogSerice.runResourceDialog(WaveInstrumentEditorComponent);
    if(instrument) {
      const instrumentId = await this._thrushEngine.sequencer.tsynthToneGenerator.createInstrument(
        instrument.samples,
        instrument.sampleRate,
        instrument.loopStartTime && instrument.loopEndTime 
          ? instrument.loopStartTime * instrument.sampleRate
          : 0,
        instrument.loopStartTime && instrument.loopEndTime 
          ? (instrument.loopEndTime-instrument.loopStartTime) * instrument.sampleRate
          : 0,
        1, 
        instrument.entryEnvelopes,
        instrument.exitEnvelopes);

      this.codeLoadedInsturments.push({
          scriptId: instrumentId,
          nativeId: -1,
          name: 'custom'
        });
    }
  }

  handleLoadCodeSample(eTarget: EventTarget | null) {    
  }

  private async loadSampleFromUrl(url: string) {
    const fetchResult = await fetch(url);
    const sampleBuffer = await fetchResult.arrayBuffer();
    await this.registerCodeSample(url.split('/').pop()!.replace(/\..*$/, ''), sampleBuffer);
  }

  private async registerCodeSample(sampleName: string,  instrumentSampleArray: ArrayBuffer) {
    const wavFile = parseWav(instrumentSampleArray!);
    
    let instrumentId = await this._thrushEngine.sequencer.tsynthToneGenerator.createInstrument(
      wavFile.samples[0].buffer, wavFile.sampleRate, 0, 0, 1);
    let instrumentIdNative = this._thrushEngine.sequencer.waveTableSynthesizer.registerInstrument(
      wavFile.samples[0].buffer, wavFile.sampleRate, 0, 0, 0, 1);

    this.codeLoadedInsturments.push({
      scriptId: instrumentId,
      nativeId: instrumentIdNative,
      name: sampleName
    });
  }

  handlePlayCode() {
    const aggregator = new ThrushAggregatedSequenceGenerator();
    const generatorFunction = new Function(`return (${this.codeEditor?.text!})`)();
    const generatorFunctionSeq = new ThrushFunctionSequenceGenerator(generatorFunction, aggregator);
    aggregator.addInitialChild(generatorFunctionSeq);    
    this._thrushEngine.playSequence(aggregator);
  }

  handleStop() {
    this._thrushEngine.stop();
  } 

  get synthReady(): boolean {
    return this._thrushEngine.ready;
  }

  loadExample(selectionEvent: MatSelectChange) {
    this.sequenceCode =  selectionEvent.value.content;
  }
}
