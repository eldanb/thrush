import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { parseWav } from 'src/lib/formats/WavParser';
import { ThrushAggregatedSequenceGenerator } from 'src/lib/thrush_engine/sequences/ThrushAggregatedSequenceGenerator';
import { ThrushFunctionSequenceGenerator } from 'src/lib/thrush_engine/sequences/ThrushFunctionSequenceGenerator';
import { ThrushEngineService } from '../services/thrush-engine.service';
import { MonacoEditorComponent } from '../widget-lib/monaco-editor/monaco-editor.component';

@Component({
  selector: 'app-code-synth-page',
  templateUrl: './code-synth-page.component.html',
  styleUrls: ['./code-synth-page.component.scss']
})
export class CodeSynthPageComponent implements OnInit {

  @ViewChild('meditor', { read: MonacoEditorComponent })
  codeEditor: MonacoEditorComponent | null = null;

  @ViewChild('codeSampleLoadCtl', { read: ElementRef })
  codeSampleLoadCtl?: ElementRef<HTMLInputElement>;

  sequenceCode = require('!raw-loader!src/assets/example-songs/code/default-code-song.txt').default;

  public codeLoadedInsturments: Array<{
    nativeId: number;
    scriptId: number;
    name: string;
  }> = [];

  constructor(private _thrushEngine: ThrushEngineService) { }

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

  handleCodeSampleLoadButtonClick() {
    this.codeSampleLoadCtl!.nativeElement.click();
  }

  handleLoadCodeSample(eTarget: EventTarget | null) {
    const file_picker = eTarget as HTMLInputElement;
    const fileName = file_picker!.value;
    var sample_file = file_picker!.files![0];
    var reader = new FileReader();

    reader.readAsArrayBuffer(sample_file);
    reader.onloadend = async () => {
      const instrumentSampleArray =  (reader.result as ArrayBuffer);
      await this.registerCodeSample(fileName, instrumentSampleArray);      
    };
  }

  private async loadSampleFromUrl(url: string) {
    const fetchResult = await fetch(url);
    const sampleBuffer = await fetchResult.arrayBuffer();
    await this.registerCodeSample(url.split('/').pop()!.replace(/\..*$/, ''), sampleBuffer);
  }

  private async registerCodeSample(sampleName: string,  instrumentSampleArray: ArrayBuffer) {
    const wavFile = parseWav(instrumentSampleArray!);
    
    let instrumentId = await this._thrushEngine.sequencer.tsynthToneGenerator.createInstrument(
      wavFile.samples.buffer, wavFile.sampleRate, 0, 0, wavFile.samples.length-1000, 1);
    let instrumentIdNative = this._thrushEngine.sequencer.waveTableSynthesizer.registerInstrument(
      wavFile.samples.buffer, wavFile.sampleRate, 0, 0, wavFile.samples.length-1000, 1);

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
}
