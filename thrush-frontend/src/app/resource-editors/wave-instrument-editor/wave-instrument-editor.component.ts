import { Component, EventEmitter, OnDestroy, OnInit } from '@angular/core';
import { EditedWaveform } from 'src/app/widget-lib/waveform-editor/waveform-editor.component';
import { parseWav } from 'src/lib/formats/WavParser';
import { EnvelopeCurveCoordinate } from 'src/lib/thrush_engine/synth/common/Envelopes';
import { Envelopes } from 'src/lib/thrush_engine/synth/scriptsynth/ScriptSynthInstrument';
import { ThrushEngineService } from 'src/app/services/thrush-engine.service';
import {  JsonToWaveform, WaveformToJson, ResourceTypeAbstractWaveInstrument } from 'src/lib/project-datamodel/project-datamodel';
import { ResourceEditor } from '../resource-editor';
import { ResourceOpenDialogService } from 'src/app/widget-lib/resource-open-dialog/resource-open-dialog-service';


@Component({
  selector: 'app-wave-instrument-editor',
  templateUrl: './wave-instrument-editor.component.html',
  styleUrls: ['./wave-instrument-editor.component.scss']
})
export class WaveInstrumentEditorComponent implements OnInit, OnDestroy, 
  ResourceEditor<ResourceTypeAbstractWaveInstrument, never> {

  public displayStartTime: number = 0;
  public displayEndTime: number = 0;
  
  public selectionStartTime: number | null = null;
  public selectionEndTime: number | null = null;

  public resourceEdited = new EventEmitter();

  private _editedWaveform: EditedWaveform | null = null;
  private _registeredInstrument: string | null = null;

  private _playbackTime: number | null = null;
  private _playbackStartTime: number | null = null;
  private _playbackCursorUpdateTimer: any;
  private _loopStartTime: number | null = null;
  private _loopEndTime: number | null = null;


  private _editedEntryEnvelopes: Envelopes = {
    volume: []
  };

  private _cachedEditedResource : ResourceTypeAbstractWaveInstrument | null = null;

  public editedEntryEnvelopeName: keyof Envelopes = "volume";

  public get editedEntryEnvelope(): EnvelopeCurveCoordinate[] {
    return this._editedEntryEnvelopes[this.editedEntryEnvelopeName];
  }

  public set editedEntryEnvelope(v: EnvelopeCurveCoordinate[]) {
    this._editedEntryEnvelopes[this.editedEntryEnvelopeName] = v;
    this.resourceDirty();
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
    this.resourceDirty();
  }


  public get loopStartTime(): number | null {
    return this._loopStartTime;
  }

  public set loopStartTime(value: number | null) {
    this._loopStartTime = value;
    this.resourceDirty();
  }

  public get loopEndTime(): number | null {
    return this._loopEndTime;
  }

  public set loopEndTime(value: number | null) {
    this._loopEndTime = value;
    this.resourceDirty();
  } 

  public get playbackTime() {
    return this._playbackTime;
  }

  constructor(private _synthEngine: ThrushEngineService, 
    private _fileOpenDlg: ResourceOpenDialogService) { }

  ngOnInit(): void {
    this._playbackCursorUpdateTimer = setInterval(() => this.updatePlaybackCursor(), 50);    
  }

  ngOnDestroy(): void {
      if(this._registeredInstrument) {
        this._synthEngine.sequencer.tsynthToneGenerator.deleteInstrument(this._registeredInstrument);
      }
      
      if(this._playbackCursorUpdateTimer) {
        clearInterval(this._playbackCursorUpdateTimer);
      }
  }

  private updatePlaybackCursor(): void {
    if(!this._playbackStartTime) {
      this._playbackTime = null;  
    } else {
      let sampleAxisTime: number | null = (this._synthEngine.currentTime - this._playbackStartTime) * 4;   // Note 24 = pitch 4
      if(sampleAxisTime > this.waveformDuration) {
        if(this.loopEndTime) {
          sampleAxisTime -= this.waveformDuration;
          const loopDuration = (this.loopEndTime - (this.loopStartTime ?? 0));
          sampleAxisTime -= Math.floor(sampleAxisTime / loopDuration) * loopDuration;
          sampleAxisTime += (this.loopStartTime ?? 0);
        } else {
          this._playbackStartTime = null;
          sampleAxisTime = null;
        }        
      }

      this._playbackTime = sampleAxisTime;
    }    
  }

  set editedWaveform(value: EditedWaveform | null) {
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

  public async handleImportRequest() {
    const fileArrayBuffer = await this._fileOpenDlg.open({
      title: 'Select Waveform to Import',
      allowLocal: true,
      browseSources: []
    });

    if(!fileArrayBuffer) {
      return;
    }
    
    const wavFile = parseWav(fileArrayBuffer);

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

    this.resourceDirty();
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
    
    this.resourceDirty();
  }

  // TODO get rid
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

        this.resourceDirty();
    };

    reader.readAsArrayBuffer(sampleFile);
  }

  get editedResource(): ResourceTypeAbstractWaveInstrument {   
    if(this._cachedEditedResource == null) {
      this._cachedEditedResource = { 
        samplesBase64: WaveformToJson(this.editedWaveform!.channelSamples[0]),
        sampleRate: this.editedWaveform!.sampleRate,
        loopStartTime: this.loopStartTime!,
        loopEndTime: this.loopEndTime!,
        entryEnvelopes: this._editedEntryEnvelopes,
        exitEnvelopes: this._editedExitEnvelopes,
      };
    }    
    return this._cachedEditedResource;
  }

  set editedResource(resource: ResourceTypeAbstractWaveInstrument | null) {
    if(resource) {
      this.editedWaveform = {
        channelSamples: [JsonToWaveform(resource.samplesBase64)],
        sampleRate: resource.sampleRate,            
      }

      this.loopStartTime = resource.loopStartTime;
      this.loopEndTime = resource.loopEndTime;
      this._editedEntryEnvelopes = resource.entryEnvelopes;
      this._editedExitEnvelopes = resource.exitEnvelopes;
    }
  }


  async handlePreviewStart() { 
    const abstInstrument = this.editedResource;
    const synth = this._synthEngine.sequencer.tsynthToneGenerator;

    this._synthEngine.resumeAudioContext();

    if(!this._registeredInstrument) {
      this._registeredInstrument = `$$WAVEDITOR${Math.random()}`;
    }
    await synth.createInstrument(this._registeredInstrument, 
      JsonToWaveform(abstInstrument.samplesBase64),  abstInstrument.sampleRate, 
        (abstInstrument.loopStartTime && abstInstrument.loopEndTime) 
          ? abstInstrument.loopStartTime * abstInstrument.sampleRate
          : 0, 
        (abstInstrument.loopStartTime && abstInstrument.loopEndTime) 
          ? (abstInstrument.loopEndTime - abstInstrument.loopStartTime) * abstInstrument.sampleRate
          : 0,
        1, abstInstrument.entryEnvelopes, abstInstrument.exitEnvelopes        
    );

    await synth.executeImmediateCommand({
      releaseNote: true
    });

    this._playbackStartTime = await synth.executeImmediateCommand({
      newNote: {
        instrumentId: this._registeredInstrument,
        note: 24
      },
      volume: 1,
      panning: 0.5      
    });
  }

  async handlePreviewStop() {
    const synth = this._synthEngine.sequencer.tsynthToneGenerator;

    await synth.executeImmediateCommand({
        releaseNote: true
    });

    this._playbackStartTime = null;
  }

  private resourceDirty() {
    this._cachedEditedResource = null;
    this.resourceEdited.emit(true);
  }

  async createEncodedStream() {
    const ac = new AudioContext();
    const mediaStreamDestination = ac.createMediaStreamDestination();
    const mediaSrc = ac.createBufferSource();
    const wavAudioBuffer = new AudioBuffer({ 
      sampleRate: this._editedWaveform!.sampleRate, 
      numberOfChannels: this._editedWaveform!.channelSamples.length,
      length: this._editedWaveform!.channelSamples[0].length  
    });
    this._editedWaveform!.channelSamples.forEach( (channelBuffer, channelIndex) => 
    wavAudioBuffer.copyToChannel(channelBuffer, channelIndex) );    
    mediaSrc.buffer = wavAudioBuffer;
    mediaSrc.connect(mediaStreamDestination);

    const recordedMediaChunks: Blob[] = [];
    const mediaRecorder = new MediaRecorder(mediaStreamDestination.stream);
    mediaRecorder.ondataavailable = (event) => {
      recordedMediaChunks.push(event.data);
    }

    mediaRecorder.onstop = () => {
      const file = new Blob(recordedMediaChunks, {type: mediaRecorder.mimeType});

      const url = URL.createObjectURL(file);
  
      const dlanchor = document.createElement("a");
      dlanchor.href = url;
      dlanchor.download = `downloaded-media.bin`;
      document.body.appendChild(dlanchor);
      dlanchor.click();
      setTimeout(function() {
          document.body.removeChild(dlanchor);
          window.URL.revokeObjectURL(url);  
      }, 0); 
    }    

    mediaSrc.onended = () => mediaRecorder.stop();

    mediaSrc.start();
    
  }
}
