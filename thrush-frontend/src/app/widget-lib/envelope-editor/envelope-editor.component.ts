import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { EnvelopeCurveCoordinate } from 'src/lib/thrush_engine/synth/common/Envelopes';

const ENVELOPE_COLOR_BACKGROUND = '#101010';
const ENVELOPE_COLOR_LINE = 'green';
const ENVELOPE_COLOR_HANDLE = '#FFFFFFC0'

const HANDLE_SIZE = 3;

export interface EditedWaveform {
  channelSamples: Float32Array[];
  sampleRate: number;
} 


@Component({
  selector: 'app-envelope-editor',
  templateUrl: './envelope-editor.component.html',
  styleUrls: ['./envelope-editor.component.scss']
})
export class EnvelopeEditorComponent implements AfterViewInit, OnDestroy {

  @ViewChild('envelopeCanvas', {read: ElementRef})
  private _canvas : ElementRef<HTMLCanvasElement> | null = null;
  
  private _editedEnvelope: EnvelopeCurveCoordinate[] | null = null;  

  private _resizeObserver: ResizeObserver = new ResizeObserver(() => this.handleResize());
  private _draggingEnvelopeIndex: number | null = null;
  
  private _displayStartTime: number = 0;
  private _displayEndTime: number = 10;

  private _canvasWidth: number = 0;
  private _canvasHeight: number = 0;
  private _pixelsInTimeUnit: number = 0;


  constructor() {
  }

  @Input()
  public get editedEnvelope(): EnvelopeCurveCoordinate[] | null {
    return this._editedEnvelope;
  }

  public set editedEnvelope(v: EnvelopeCurveCoordinate[] | null) {
    this._editedEnvelope = v;
    this.refresh();
  }

  @Input()
  public set displayStartTime(value: number) {
    this._displayStartTime = value;
    this.handleResize();
    this.refresh();
  }

  public get displayStartTime() {
    return this._displayStartTime;
  }

  @Input()
  public set displayEndTime(value: number) {
    this._displayEndTime = value;
    this.handleResize();
    this.refresh();
  }

  public get displayEndTime() {
    return this._displayEndTime;
  }

  ngOnDestroy(): void {
    this._resizeObserver.disconnect();
  }

  ngAfterViewInit(): void {
    this._resizeObserver.observe(this._canvas!.nativeElement);
    this.handleResize();
    this.refresh();    
  }

  private handleResize() {
    const renderContext = this._canvas!.nativeElement.getContext("2d")!;
    
    renderContext.canvas.width = this._canvas!.nativeElement!.clientWidth;
    renderContext.canvas.height = this._canvas!.nativeElement!.clientHeight;

    this._canvasHeight = renderContext.canvas.height;
    this._canvasWidth = renderContext.canvas.width;
    this._pixelsInTimeUnit = this._canvasWidth / (this._displayEndTime - this._displayStartTime);

    this.refresh();
  }

  public handleCanvasMouseMove(event: MouseEvent) {
    if(this._editedEnvelope === null || this._draggingEnvelopeIndex === null) {
      return;      
    }

    const clrect = (event.target as HTMLCanvasElement).getBoundingClientRect();
    const targetX = event.clientX - clrect.left;
    const targetY = event.clientY - clrect.top;

    const targetTime = this.xCoordToTime(targetX);
    const targetValue = this.yCoordToValue(targetY);

    if(targetTime > 
        (this._draggingEnvelopeIndex < (this._editedEnvelope?.length - 1) 
          ? this._editedEnvelope[this._draggingEnvelopeIndex + 1].time
          : this._displayEndTime)) {
      return;
    }

    if(targetTime < 
        (this._draggingEnvelopeIndex > 0
          ? this._editedEnvelope[this._draggingEnvelopeIndex - 1].time
          : this._displayStartTime)) {
      return;    
    }

    if(targetValue < 0 || targetValue > 1) {
      return;
    }
    
    this._editedEnvelope[this._draggingEnvelopeIndex].time = targetTime;
    this._editedEnvelope[this._draggingEnvelopeIndex].value = targetValue;

    this.refresh();
  }

  
  public handleCanvasMouseDown(event: MouseEvent) {
    if(!this._editedEnvelope) {
      return;
    }

    const clrect = (event.target as HTMLCanvasElement).getBoundingClientRect();
    const targetX = event.clientX - clrect.left;
    const targetY = event.clientY - clrect.top;

    let hitTestIndex = this._editedEnvelope.findIndex(envelopCoordinate => 
      Math.sqrt(
        Math.pow(this.timeToXCoord(envelopCoordinate.time) - targetX, 2) +
        Math.pow(this.valueToYCoord(envelopCoordinate.value) - targetY, 2)) < HANDLE_SIZE);

    if(hitTestIndex >=0 ) {
      this._draggingEnvelopeIndex = hitTestIndex;
      return;
    } else {
      const targetTime = this.xCoordToTime(targetX);
      const targetValue = this.yCoordToValue(targetY);

      const newCoordinate: EnvelopeCurveCoordinate = {
        time: targetTime,
        value: targetValue
      };

      let insertionIndex = this._editedEnvelope.findIndex(coordinate => coordinate.time > targetTime);
      if(insertionIndex>=0) {
        this._editedEnvelope.splice(insertionIndex, 0, newCoordinate);
      } else {
        insertionIndex = this._editedEnvelope.push(newCoordinate) - 1;
      }

      this._draggingEnvelopeIndex = insertionIndex;
    }
    
    this.refresh();
  }

  yCoordToValue(yCoord: number) {
    return 1 - (yCoord / this._canvasHeight);    
  }

  xCoordToTime(xCoord: number) {
    return (xCoord / this._pixelsInTimeUnit) + this._displayStartTime;    
  }

  valueToYCoord(value: number) {
    return (1-value) * this._canvasHeight;
  }

  timeToXCoord(time: number) {
    return (time - this._displayStartTime) * this._pixelsInTimeUnit;
  }

  public handleCanvasMouseUp(event: MouseEvent) {
    this._draggingEnvelopeIndex = null;
  }

  private refresh() {
    if(this._canvas) {
      this.render();
    }
  }

  private render() {    
    const renderContext = this._canvas!.nativeElement.getContext("2d")!;    
    
    renderContext.save();
    
    const clipRect = new Path2D();
    clipRect.rect(0, 0, this._canvasWidth, this._canvasHeight);
    renderContext.fillStyle = ENVELOPE_COLOR_BACKGROUND;
    renderContext.fillRect(
      0, 
      0, 
      this._canvasWidth, this._canvasHeight);

    if(this._editedEnvelope) {      
      renderContext.beginPath();
      // TOOD Start value
      renderContext.moveTo(this.timeToXCoord(0), this.valueToYCoord(0));
      this._editedEnvelope.forEach(envelopeCoordinate => {        
        renderContext.lineTo(this.timeToXCoord(envelopeCoordinate.time), this.valueToYCoord(envelopeCoordinate.value));
      });
      renderContext.strokeStyle = ENVELOPE_COLOR_LINE;
      renderContext.stroke();


      this._editedEnvelope.forEach(envelopeCoordinate => {
        renderContext.beginPath();
        renderContext.ellipse(this.timeToXCoord(envelopeCoordinate.time), this.valueToYCoord(envelopeCoordinate.value), HANDLE_SIZE, HANDLE_SIZE, 0, 0, Math.PI*2);
        renderContext.strokeStyle = ENVELOPE_COLOR_HANDLE;
        renderContext.stroke();
      });      
    }

    renderContext.restore();
  }
}
