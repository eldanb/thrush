import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { EditedWaveform } from 'src/app/widget-lib/waveform-editor/waveform-editor.component';
import { parseWav } from 'src/lib/formats/WavParser';
import { EnvelopeCurveCoordinate } from 'src/lib/thrush_engine/synth/common/Envelopes';
import { Envelopes } from 'src/lib/thrush_engine/synth/scriptsynth/ScriptSynthInstrument';
import { ResourceEditor } from '../resource-editor-dialog-service/resource-editor-dialog.service';
import { ThrushEngineService } from 'src/app/services/thrush-engine.service';


type AbstractWaveInstrument = {
  samples: Float32Array,
  sampleRate: number,
  loopStartTime: number,
  loopEndTime: number,
  entryEnvelopes: Envelopes,
  exitEnvelopes: Envelopes
};

@Component({
  selector: 'app-wave-instrument-editor',
  templateUrl: './wave-instrument-editor.component.html',
  styleUrls: ['./wave-instrument-editor.component.scss']
})
export class WaveInstrumentEditorComponent implements OnInit, OnDestroy, ResourceEditor<AbstractWaveInstrument, never> {

  public displayStartTime: number = 0;
  public displayEndTime: number = 0;
  
  public loopStartTime: number | null = null;
  public loopEndTime: number | null = null;
  public selectionStartTime: number | null = null;
  public selectionEndTime: number | null = null;

  private _editedWaveform: EditedWaveform | null = null;

  private _registeredInstrument: number | null = null;
  
  private _editedEntryEnvelopes: Envelopes = {
    volume: []
  };

  public editedEntryEnvelopeName: keyof Envelopes = "volume";

  public get editedEntryEnvelope(): EnvelopeCurveCoordinate[] {
    return this._editedEntryEnvelopes[this.editedEntryEnvelopeName];
  }

  public set editedEntryEnvelope(v: EnvelopeCurveCoordinate[]) {
    this._editedEntryEnvelopes[this.editedEntryEnvelopeName] = v;
  }


  private _editedExitEnvelopes: Envelopes = {
    volume: []
  };

  public editedExitEnvelopeName: keyof Envelopes = "volume";
    
  public get editedExitEnvelope(): EnvelopeCurveCoordinate[] {
    return this._editedExitEnvelopes[this.editedExitEnvelopeName];
  }

  public set editedExitEnvelope(v: EnvelopeCurveCoordinate[]) {
    this._editedExitEnvelopes[this.editedExitEnvelopeName] = v;
  }


  constructor(private _synthEngine: ThrushEngineService) { }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
      if(this._registeredInstrument) {
        this._synthEngine.sequencer.tsynthToneGenerator.deleteInstrument(this._registeredInstrument);
      }      
  }

  @Input()
  public set editedWaveform(value: EditedWaveform | null) {
    this._editedWaveform = value;
    this.displayStartTime = 0;
    this.displayEndTime = this.waveformDuration;  
  }

  public get editedWaveform(): EditedWaveform | null  {
    return this._editedWaveform;
  }

  public get waveformDuration(): number {
    return this.editedWaveform
      ? this.editedWaveform.channelSamples[0].length / this.editedWaveform.sampleRate
      : 0;
  }

  public handleZoomInClick() {
    this.updateZoomByFactor(1/1.5);
  }

  public handleZoomOutClick() {
    this.updateZoomByFactor(1.5);
  }

  public handleZoomToSelectionClick() {
    if(this.selectionStartTime == null || this.selectionEndTime == null) {
      this.setZoomRange(0, this.waveformDuration);
    } else {
      this.setZoomRange(this.selectionStartTime, this.selectionEndTime);
    }
  }

  private updateZoomByFactor(factor: number) {
    const midTime = (this.displayEndTime + this.displayStartTime) / 2;    
    const newTimeRange = (this.displayEndTime - this.displayStartTime) * factor;
    
    let start = Math.max(midTime - newTimeRange / 2, 0);
    let end = Math.min(midTime + newTimeRange / 2, this.waveformDuration);

    this.setZoomRange(start, end);
  }
  
  private setZoomRange(startTime: number, endTime: number) {
    this.displayStartTime = startTime;
    this.displayEndTime = endTime;
  }

  public handleSetLoopToSelection() {

    if(this.selectionStartTime == null || this.handleZoomToSelectionClick == null ||
       (this.selectionStartTime == this.loopStartTime && 
        this.selectionEndTime == this.loopEndTime)) {
          this.loopStartTime = null;
          this.loopEndTime = null;;          
    } else {
      this.loopStartTime = this.selectionStartTime;
      this.loopEndTime = this.selectionEndTime;
    }   
  }

  public handleImportRequest() {
    document.getElementById('fileLoadControl')?.click();
  }

  public handleTrimRequest() {
    const startTime = this.selectionStartTime;
    const endTime = this.selectionEndTime;
    const editedWaveform = this.editedWaveform;

    if(!editedWaveform || startTime == null || endTime == null) {
      return;
    }

    this.editedWaveform = {...editedWaveform, 
      channelSamples: editedWaveform.channelSamples.map(sampleBuffer => 
        sampleBuffer.subarray(startTime * editedWaveform.sampleRate, endTime * editedWaveform.sampleRate)
      ),      
    }

    if(this.loopStartTime && this.loopStartTime >= startTime && this.loopStartTime <= endTime && 
      this.loopEndTime && this.loopEndTime >= startTime && this.loopEndTime <= endTime) {
        this.loopStartTime -= startTime;
        this.loopEndTime -= startTime;
    } else {
      this.loopStartTime = null;
      this.loopEndTime = null;
    }

    this.selectionStartTime = null;
    this.selectionEndTime = null;

    [this._editedEntryEnvelopes].forEach(envelopes => {
      Object.keys(envelopes).forEach(envelopeName => {            
        const envelopeKey = envelopeName as keyof Envelopes;
        envelopes[envelopeKey] = 
          envelopes[envelopeKey]
            .filter(coord => coord.time >= startTime && coord.time <= endTime)
            .map(coord => ({ ...coord, time: coord.time - startTime }));

        if(envelopes[envelopeKey].length == 0) {
          envelopes[envelopeKey] = [ { time: 0, value: 1 }];
        }
      });
    });    
  }

  public handleLoadSample(eTarget: EventTarget) {
    const filePicker = eTarget as HTMLInputElement;
    const sampleFile = filePicker!.files![0];    
    const reader = new FileReader();

    reader.onloadend = () => {        
        const wavFile = parseWav((reader.result as ArrayBuffer)!);

        this.editedWaveform = { 
          channelSamples: wavFile.samples,
          sampleRate: wavFile.sampleRate
        };

        this.loopStartTime = null;
        this.loopEndTime = null;
        this.selectionEndTime = null;
        this.selectionStartTime = null;
        this._editedEntryEnvelopes = {
          volume: [{
            time: 0,
            value: 1
            }]
          };

        this._editedExitEnvelopes = {
          volume: [{
            time: 0, 
            value: 0
          }]
          };
        };

    reader.readAsArrayBuffer(sampleFile);
  }

  get editedResource(): AbstractWaveInstrument {       
    return { 
      samples: this.editedWaveform!.channelSamples[0], 
      sampleRate: this.editedWaveform!.sampleRate,
      loopStartTime: this.loopStartTime!,
      loopEndTime: this.loopEndTime!,
      entryEnvelopes: this._editedEntryEnvelopes,
      exitEnvelopes: this._editedExitEnvelopes,
    };
  }


  set editedResource(resource: AbstractWaveInstrument) {

  }


  async handlePreviewStart() { 
    const abstInstrument = this.editedResource;
    const synth = this._synthEngine.sequencer.tsynthToneGenerator;

    this._synthEngine.resumeAudioContext();

    if(!this._registeredInstrument) {
      this._registeredInstrument = await synth.createInstrument(
        abstInstrument.samples, abstInstrument.sampleRate, 
        (abstInstrument.loopStartTime && abstInstrument.loopEndTime) 
          ? abstInstrument.loopStartTime * abstInstrument.sampleRate
          : 0, 
        (abstInstrument.loopStartTime && abstInstrument.loopEndTime) 
          ? (abstInstrument.loopEndTime - abstInstrument.loopStartTime) * abstInstrument.sampleRate
          : 0,
        1, abstInstrument.entryEnvelopes, abstInstrument.exitEnvelopes        
      );
    } else {
      await synth.updateInstrument(
        this._registeredInstrument,
        abstInstrument.samples, abstInstrument.sampleRate, 
        abstInstrument.loopStartTime * abstInstrument.sampleRate, 
        (abstInstrument.loopEndTime - abstInstrument.loopStartTime) * abstInstrument.sampleRate,
        1, abstInstrument.entryEnvelopes, abstInstrument.exitEnvelopes        
      );
    }

    await synth.executeImmediateCommand({
      newNote: {
        instrumentId: this._registeredInstrument,
        note: 24
      },
      volume: 1,
      panning: 0      
    });
  }

  async handlePreviewStop() {
    const synth = this._synthEngine.sequencer.tsynthToneGenerator;

    await synth.executeImmediateCommand({
        releaseNote: true
    });
  }
}
