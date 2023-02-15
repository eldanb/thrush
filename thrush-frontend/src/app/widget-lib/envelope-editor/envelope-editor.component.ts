import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ViewContainerRef } from '@angular/core';
import { EnvelopeCurveCoordinate } from 'src/lib/thrush_engine/synth/common/Envelopes';

const ENVELOPE_COLOR_BACKGROUND = 'white';
const ENVELOPE_COLOR_LINE = 'darkgray';
const ENVELOPE_COLOR_HANDLE = 'blue'

const HANDLE_SIZE = 4;

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
  
  private _editedEnvelope: EnvelopeCurveCoordinate[] = [];  

  private _resizeObserver: ResizeObserver = new ResizeObserver(() => this.handleResize());
  private _draggingEnvelopeIndex: number | null = null;
  
  private _displayStartTime: number = 0;
  private _displayEndTime: number = 10;

  private _canvasWidth: number = 0;
  private _canvasHeight: number = 0;
  private _pixelsInTimeUnit: number = 0;

  constructor(private _vcr: ViewContainerRef) {
  }

  @Input()
  public get editedEnvelope(): EnvelopeCurveCoordinate[] {
    return this._editedEnvelope;
  }

  public set editedEnvelope(v: EnvelopeCurveCoordinate[]) {
    this._editedEnvelope = v?.concat() || null;
    this.refresh();
  }

  @Output()
  public editedEnvelopeChange = new EventEmitter<EnvelopeCurveCoordinate[]>();

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
    this._resizeObserver.observe(this._vcr.element.nativeElement);
    this.handleResize();
    this.refresh();    
  }

  private handleResize() {
    if(!this._canvas?.nativeElement) {
      return;
    }

    const renderContext = this._canvas!.nativeElement.getContext("2d")!;
    
    const sizedElement = this._vcr.element.nativeElement;
    renderContext.canvas.width = sizedElement.clientWidth;
    renderContext.canvas.height = sizedElement.clientHeight;

    this._canvasHeight = renderContext.canvas.height;
    this._canvasWidth = renderContext.canvas.width;
    this._pixelsInTimeUnit = this._canvasWidth / (this._displayEndTime - this._displayStartTime);

    this.refresh();
  }

  public handleCanvasMouseMove(event: MouseEvent) {
    if(this._draggingEnvelopeIndex === null) {
      return;      
    }

    const clrect = (event.target as HTMLCanvasElement).getBoundingClientRect();
    const targetX = event.clientX - clrect.left;
    const targetY = event.clientY - clrect.top;

    const targetTime = this.xCoordToTime(targetX);
    const targetValue = this.yCoordToValue(targetY);

    if(this._draggingEnvelopeIndex < (this._editedEnvelope?.length - 1) &&
        targetTime > this._editedEnvelope[this._draggingEnvelopeIndex + 1].time) {
        this._editedEnvelope.splice(this._draggingEnvelopeIndex+1, 1);
    } else
    if((this._draggingEnvelopeIndex > 0 && 
        targetTime < this._editedEnvelope[this._draggingEnvelopeIndex - 1].time)) {
      this._editedEnvelope.splice(this._draggingEnvelopeIndex-1, 1);
      this._draggingEnvelopeIndex --;
    } else 
    if(targetValue < 0 || targetValue > 1 || targetTime > this._displayEndTime || targetTime < this._displayStartTime) {
      return;
    } else {    
      this._editedEnvelope[this._draggingEnvelopeIndex].time = targetTime;
      this._editedEnvelope[this._draggingEnvelopeIndex].value = targetValue;
    }

    this.refresh();
  }

  
  public handleCanvasMouseDown(event: MouseEvent) {
    const clrect = (event.target as HTMLCanvasElement).getBoundingClientRect();
    const targetX = event.clientX - clrect.left;
    const targetY = event.clientY - clrect.top;
    const targetTime = this.xCoordToTime(targetX);

    let lastSegmentStartTime = 0;
    let lastSegmentStartValue = 0; // TODO startValue
    let closeToLine = false;

    let hitTestIndex = this._editedEnvelope.findIndex(envelopCoordinate =>  {
      if(Math.sqrt(
        Math.pow(this.timeToXCoord(envelopCoordinate.time) - targetX, 2) +
        Math.pow(this.valueToYCoord(envelopCoordinate.value) - targetY, 2)) < HANDLE_SIZE) {
          return true;
      }

      if(targetTime >= lastSegmentStartTime && targetTime <= envelopCoordinate.time) {
        const lineValueAtTargetX = 
          lastSegmentStartValue + 
            (envelopCoordinate.value - lastSegmentStartValue) *
            ((targetTime - lastSegmentStartTime) / (envelopCoordinate.time - lastSegmentStartTime));

        if(Math.abs(targetY - this.valueToYCoord(lineValueAtTargetX)) <= 2*HANDLE_SIZE) {
          closeToLine = true;
        }
      }

      lastSegmentStartTime = envelopCoordinate.time;
      lastSegmentStartValue = envelopCoordinate.value;
      return false;
    });

    if(hitTestIndex<0 && 
        !closeToLine &&
        targetTime >= lastSegmentStartTime &&
        Math.abs(targetY - this.valueToYCoord(lastSegmentStartValue)) <= 2*HANDLE_SIZE) {

      closeToLine = true;
      
    }

    if(hitTestIndex >=0 ) {
      this._draggingEnvelopeIndex = hitTestIndex;
      return;
    } else 
    if(closeToLine) {
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
    this._editedEnvelope = this._editedEnvelope.concat();
    this.editedEnvelopeChange.emit(this._editedEnvelope);
    this.render();
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

  
    renderContext.beginPath();
    
    // TOOD Start value
    let lastValue = 0;
    renderContext.moveTo(this.timeToXCoord(0), this.valueToYCoord(lastValue));
    this._editedEnvelope.forEach(envelopeCoordinate => {        
      lastValue = envelopeCoordinate.value;
      renderContext.lineTo(this.timeToXCoord(envelopeCoordinate.time), this.valueToYCoord(lastValue));
    });

    renderContext.lineTo(this._canvasWidth, this.valueToYCoord(lastValue));

    renderContext.strokeStyle = ENVELOPE_COLOR_LINE;
    renderContext.stroke();


    this._editedEnvelope.forEach(envelopeCoordinate => {
      renderContext.beginPath();
      renderContext.ellipse(this.timeToXCoord(envelopeCoordinate.time), this.valueToYCoord(envelopeCoordinate.value), HANDLE_SIZE, HANDLE_SIZE, 0, 0, Math.PI*2);
      renderContext.strokeStyle = ENVELOPE_COLOR_HANDLE;
      renderContext.stroke();
    });   
    
    if(this._draggingEnvelopeIndex !== null) {
      const draggingEnvelope = this._editedEnvelope[this._draggingEnvelopeIndex];
      renderContext.fillStyle = ENVELOPE_COLOR_HANDLE;        
      renderContext.fillText(`${Math.round(draggingEnvelope.value*1000)/1000}@${Math.round(draggingEnvelope.time*1000)/1000}s`, 
        this.timeToXCoord(draggingEnvelope.time) + (1.5*HANDLE_SIZE), this.valueToYCoord(draggingEnvelope.value) - (1.5*HANDLE_SIZE));
    }
  

    renderContext.restore();
  }
}
