import { Component, Input, OnInit } from '@angular/core';
import { EditedWaveform } from 'src/app/widget-lib/waveform-editor/waveform-editor.component';
import { EnvelopeCurveCoordinate } from 'src/lib/thrush_engine/synth/common/Envelopes';

@Component({
  selector: 'app-wave-instrument-editor',
  templateUrl: './wave-instrument-editor.component.html',
  styleUrls: ['./wave-instrument-editor.component.scss']
})
export class WaveInstrumentEditorComponent implements OnInit {

  public displayStartTime: number = 0;
  public displayEndTime: number = 0;
  
  public loopStartTime: number | null = null;
  public loopEndTime: number | null = null;
  public selectionStartTime: number | null = null;
  public selectionEndTime: number | null = null;

  private _editedWaveform: EditedWaveform | null = null;

  @Input()
  public editedEnvelope: EnvelopeCurveCoordinate[] | null = [{
    time: 0,
    value: 1
  }];

  constructor() { }

  ngOnInit(): void {
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


}
