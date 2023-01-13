import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';

const WAVETABLE_COLOR_BACKGROUND = '#101010';
const WAVETABLE_COLOR_WAVE = 'green';
const CHANNEL_PAD_RATIO = 0.25;
const WAVETABLE_COLOR_POINTER = '#FFFFFFC0';
const WAVETABLE_COLOR_SELECTION = '#D0FFFFC0';
const WAVETABLE_COLOR_SELECTION_BACKGROUND = '#D0FFFF40';

const WAVETABLE_COLOR_LOOP = '#FFFFD0C0';

export interface EditedWaveform {
  channelSamples: Float32Array[];
  sampleRate: number;
} 

@Component({
  selector: 'app-waveform-editor',
  templateUrl: './waveform-editor.component.html',
  styleUrls: ['./waveform-editor.component.scss']
})
export class WaveformEditorComponent implements AfterViewInit, OnDestroy, OnChanges {

  @ViewChild('waveformCanvas', {read: ElementRef})
  private _canvas : ElementRef<HTMLCanvasElement> | null = null;
  
  private _editedWaveform: EditedWaveform | null = null;  

  private _resizeObserver: ResizeObserver = new ResizeObserver(() => this.handleResize());
  private _renderingCoordinateSpace: RenderingCoordinateSpace | null = null;
  
  private _pointerCursor = new DraggableCursor(WAVETABLE_COLOR_POINTER, false);  
  private _selectionStartCursor = new DraggableCursor(WAVETABLE_COLOR_SELECTION, true);
  private _selectionEndCursor = new DraggableCursor(WAVETABLE_COLOR_SELECTION, true);
  private _loopStartCursor = new DraggableCursor(WAVETABLE_COLOR_LOOP, true);
  private _loopEndCursor = new DraggableCursor(WAVETABLE_COLOR_LOOP, true);

  private _dragging: DraggableCursor | null = null;
  
  private _pointer: number | null = null;
  
  private _displayStartTime: number = 0;
  private _displayEndTime: number = 0;

  private _allCursors = [
    this._selectionStartCursor, 
    this._selectionEndCursor,
    this._loopStartCursor,
    this._loopEndCursor,
    this._pointerCursor, 
  ];
  private _displayRangeDirty: boolean = false;

  constructor() {
    this._selectionStartCursor.onChange = (newValue) => {
      this.selectionStartTimeChange.emit(newValue || undefined);
      if(newValue != null && (this._selectionEndCursor.time ?? 0 < newValue)) {
        this.selectionEndTimeChange.emit(null);
      }
    }
    this._selectionStartCursor.timeGetter = () => this.selectionStartTime;

    this._selectionEndCursor.onChange = (newValue) => {
        if(newValue == null || ((this._selectionStartCursor.time ?? 0) < newValue)) {
          this.selectionEndTimeChange.emit(newValue || undefined);
        } else 
        if((this._selectionStartCursor.time ?? 0) > newValue) {
          this.selectionEndTimeChange.emit(null);
        }
    }
    this._selectionEndCursor.timeGetter = () => this.selectionEndTime;

    this._loopEndCursor.onChange = (newValue) => {
      if(newValue != null && this._loopStartCursor.time != null &&
          newValue < this._loopStartCursor.time) {
        this._loopStartCursor.requestTimeChange(null);
        this._loopEndCursor.requestTimeChange(null);
      } else {
        this.loopEndTimeChange.emit(newValue || undefined);
      }
    }

    this._loopEndCursor.timeGetter = () => this.loopEndTime;

    this._loopStartCursor.onChange = (newValue) => {
      if(newValue != null && this._loopEndCursor.time != null &&
          newValue > this._loopEndCursor.time) {
        this._loopStartCursor.requestTimeChange(null);
        this._loopEndCursor.requestTimeChange(null);        
      } else {
        this.loopStartTimeChange.emit(newValue || undefined);
      }
    }
    this._loopStartCursor.timeGetter = () => this.loopStartTime;

    this._pointerCursor.onChange = ((newValue) => this._pointer = newValue);
    this._pointerCursor.timeGetter = (() => this._pointer);
  }

  @Input()
  public get editedWaveform(): EditedWaveform | null {
    return this._editedWaveform;
  }

  public set editedWaveform(v: EditedWaveform | null) {
    this._editedWaveform = v;
    this._displayRangeDirty = true;
  }
    
  @Output ()
  public loopStartTimeChange = new EventEmitter<number>();

  @Input()
  public loopStartTime: number | null = null;

  @Output ()
  public loopEndTimeChange = new EventEmitter<number>();

  @Input()
  public loopEndTime: number | null = null;

  @Output()
  public selectionStartTimeChange = new EventEmitter<number>();

  @Input()
  public selectionStartTime: number | null = null;

  @Output()
  public selectionEndTimeChange = new EventEmitter<number | null>();

  @Input()
  public selectionEndTime: number | null = null;

  public get waveformDuration(): number {
    return this._editedWaveform
      ? this._editedWaveform.channelSamples[0].length / this._editedWaveform.sampleRate
      : 1;
  }

  ngOnChanges(changes: SimpleChanges): void {
    let minTime = this.waveformDuration;
    let maxTime = 0;

    const rcs = this.getRenderingCoordinateSpace();
    if(!rcs) {
      return;
    }
    const renderContext = this._canvas!.nativeElement.getContext("2d")!;

    if(this._displayRangeDirty) {
      this._displayRangeDirty = false;
      minTime = 0;
      maxTime = this.waveformDuration;
    }
    else 
    {
      this._allCursors.forEach(cursor => {
        const cursorDisplayWidth = cursor.getDisplayWidth(renderContext) / rcs.timeToCanvasXFactor;

        if(cursor.drawnOnTime != null) {
          if(cursor.drawnOnTime < minTime) {
            minTime = cursor.drawnOnTime;
          }

          if(cursor.drawnOnTime + cursorDisplayWidth > maxTime) {
            maxTime = cursor.drawnOnTime + cursorDisplayWidth;
          }
        }

        if(cursor.time != null) {
          if(cursor.time < minTime) {
            minTime = cursor.time;
          }
          if(cursor.time + cursorDisplayWidth > maxTime) {
            maxTime = cursor.time + cursorDisplayWidth;
          }
        }
      });
    }

    if(minTime<maxTime) {
      this.render(minTime, maxTime);
    }
  }

  ngOnDestroy(): void {
    this._resizeObserver.disconnect();
  }

  ngAfterViewInit(): void {
    this._resizeObserver.observe(this._canvas!.nativeElement);
    this.handleResize();
    this._displayRangeDirty = true;
  }

  private handleResize() {
    const renderContext = this._canvas!.nativeElement.getContext("2d")!;
    
    renderContext.canvas.width = this._canvas!.nativeElement!.clientWidth;
    renderContext.canvas.height = this._canvas!.nativeElement!.clientHeight;

    this.render(0, this.waveformDuration)
  }

  public handleCanvasMouseMove(event: MouseEvent) {
    if(!this._editedWaveform) {
      return;
    }

    const clrect = (event.target as HTMLCanvasElement).getBoundingClientRect();

    if(this._dragging) {
      this.moveCursorToCanvasX(this._dragging, event.clientX - clrect.left);  
    }

    this.moveCursorToCanvasX(this._pointerCursor, event.clientX - clrect.left, true);
  }
  
  public handleCanvasMouseDown(event: MouseEvent) {
    if(!this._editedWaveform) {
      return;
    }

    const rcs = this.getRenderingCoordinateSpace()!;
    this._dragging = this._allCursors.find(
      (c) => c.draggable &&
        c.hitTest(this._pointerCursor.time || 0, rcs)) || null;

    if(!this._dragging) {
      const clrect = (event.target as HTMLCanvasElement).getBoundingClientRect();
      
      this.moveCursorToCanvasX(this._selectionStartCursor, event.clientX - clrect.left);        
      this.moveCursorToCanvasX(this._selectionEndCursor, null);

      this._dragging = this._selectionEndCursor;
    }
  }

  public handleCanvasMouseUp(event: MouseEvent) {
    if(!this._editedWaveform) {
      return;
    }

    this._dragging = null;
  }

  public handleCanvasMouseLeave() {
    this._dragging = null;

    this.moveCursorToCanvasX(this._pointerCursor, null, true);
  }

  public get displayStartTime() {
    return this._displayStartTime;
  }

  @Input()
  public set displayStartTime(value: number) {
    this._displayStartTime = value;
    this._renderingCoordinateSpace = null;
    this._displayRangeDirty = true;
  }

  public get displayEndTime() {
    return this._displayEndTime;    
  }

  @Input()
  public set displayEndTime(value: number) {
    this._displayEndTime = value;
    this._renderingCoordinateSpace = null;
    this._displayRangeDirty = true;
  }
  
  private render(startTime: number, endTime: number) {
    const editedWaveform = this._editedWaveform;

    const renderContext = this._canvas!.nativeElement.getContext("2d")!;    
    const renderingCoordinateSpace = this.getRenderingCoordinateSpace()!
    
    // Clear background
    const renderingStartX = Math.floor(renderingCoordinateSpace.timeToCanvasX(startTime));
    const renderingEndX = Math.ceil(renderingCoordinateSpace.timeToCanvasX(endTime));

    renderContext.save();

    const clipRect = new Path2D();
    clipRect.rect(renderingStartX, 
      0, 
      renderingEndX-renderingStartX,
      renderingCoordinateSpace.height);    
    renderContext.clip(clipRect);

    renderContext.fillStyle = WAVETABLE_COLOR_BACKGROUND;
    renderContext.fillRect(
      renderingStartX, 
      0, 
      renderingEndX-renderingStartX+1,
      renderingCoordinateSpace.height);

    if(editedWaveform) {
      // Draw selection background
      if(this.selectionStartTime != null && this.selectionEndTime != null) {
        const selectionBoundaryMin = Math.floor(renderingCoordinateSpace.timeToCanvasX(Math.max(startTime, this.selectionStartTime)));
        const selectionBoundaryMax = Math.ceil(renderingCoordinateSpace.timeToCanvasX(Math.min(endTime, this.selectionEndTime)));

        if(selectionBoundaryMax > selectionBoundaryMin) {
          renderContext.fillStyle = WAVETABLE_COLOR_SELECTION_BACKGROUND;
          renderContext.fillRect(
            selectionBoundaryMin, 
            renderingCoordinateSpace.y, 
            selectionBoundaryMax-selectionBoundaryMin + 1,
            renderingCoordinateSpace.height);   
        }
      }

      this.renderWaveform(editedWaveform, renderingStartX, renderingEndX, renderingCoordinateSpace, renderContext);    
      
      this._allCursors.forEach(cursor => {
        cursor.draw(renderingStartX, renderingEndX, renderingCoordinateSpace, renderContext);
      })    
    }

    renderContext.restore();
  }

  private renderWaveform(
    editedWaveform: EditedWaveform,
    renderingStartX: number,
    renderingEndX: number,
    renderingCoordinateSpace: RenderingCoordinateSpace,
    renderContext: CanvasRenderingContext2D) {
    const canvasXToSampleFactor = (1/renderingCoordinateSpace.timeToCanvasXFactor * editedWaveform.sampleRate); 

    editedWaveform.channelSamples.forEach((channelSamples, channelIndex) => {
      const channelTop = renderingCoordinateSpace.y + renderingCoordinateSpace.channelStride * channelIndex;
      renderContext.fillStyle = WAVETABLE_COLOR_WAVE;

      for(let x = renderingStartX, 
          timeSamples = renderingCoordinateSpace.canvasXToTime(renderingStartX) * editedWaveform.sampleRate; 
          x<=renderingEndX; 
          x++, timeSamples += canvasXToSampleFactor) {  
        
        const roundedTimeSamples = Math.floor(timeSamples);
        let sampleMin = channelSamples[roundedTimeSamples];
        let sampleMax = channelSamples[roundedTimeSamples];

        for(let s = roundedTimeSamples; s<timeSamples+canvasXToSampleFactor; s++) {
          if(channelSamples[s] > sampleMax) {
            sampleMax = channelSamples[s];
          } else
          if(channelSamples[s] < sampleMin) {
            sampleMin = channelSamples[s];
          }
        }

        renderContext.fillRect(x, 
          channelTop + renderingCoordinateSpace.channelHeight/2 * (1-sampleMax),
          1, (renderingCoordinateSpace.channelHeight/2 * (sampleMax-sampleMin))+1);
      }
    });
  }

  private moveCursorToCanvasX(cursor: DraggableCursor, canvasX: number | null, immediateRender : boolean = false) {  
    const rcs = this.getRenderingCoordinateSpace()!;

    const oldTime = cursor.time;        
    const newTime = canvasX != null ? rcs.canvasXToTime(canvasX) : null;

    cursor.requestTimeChange(newTime);

    if(immediateRender) {
      const renderContext = this._canvas!.nativeElement.getContext("2d")!;
      const newWidth = cursor.getDisplayWidth(renderContext)/rcs.timeToCanvasXFactor;
      if(oldTime != null) {    
        this.render(oldTime, oldTime + newWidth);
      }

      if(cursor.time != null) {
        this.render(cursor.time, cursor.time + newWidth);   
      }
    }
  }

  private getRenderingCoordinateSpace() {
    if(!this._renderingCoordinateSpace) {
      const width = this._canvas!.nativeElement!.clientWidth;
      const height = this._canvas!.nativeElement!.clientHeight;
      const displayStartTime = this._editedWaveform ? this._displayStartTime : 0;
      const displayEndTime = this._editedWaveform ? this._displayEndTime : 1;
      const topPad = 16;
      const channelHeight = (height-topPad) / ((this._editedWaveform?.channelSamples?.length ?? 1) * (1 + CHANNEL_PAD_RATIO) - CHANNEL_PAD_RATIO);
      const channelStride = channelHeight * (1 + CHANNEL_PAD_RATIO);
      const timeToCanvasXFactor = width / (displayEndTime - displayStartTime);
  
      this._renderingCoordinateSpace = {
        x: 0,
        y: topPad,
        width,
        height,
  
        timeToCanvasXFactor,
  
        channelHeight,
        channelStride,
  
        displayStartTime,
        displayEndTime,
  
        timeToCanvasX: (t: number) => 
          (t - displayStartTime) * timeToCanvasXFactor + 0,   
            
        canvasXToTime: (cx: number) => 
          (cx - 0) / timeToCanvasXFactor + displayStartTime
  
      };
    }

    return this._renderingCoordinateSpace;
  }
}

interface RenderingCoordinateSpace {
  x: number;
  y: number;
  width: number;
  height: number;
  
  timeToCanvasXFactor: number;

  channelHeight: number;
  channelStride: number;

  displayStartTime: number;
  displayEndTime: number

  timeToCanvasX: (t: number) => number;
  canvasXToTime: (cx: number) => number; 
}

class DraggableCursor {
  private _lineColor: string | null;
  private _drawnOn: number | null = null;
  
  public draggable: boolean;  
  public onChange: ((newValue: number | null) => void) | null = null;
  public timeGetter: (() => number | null) | null = null;

  constructor(lineColor: string | null, draggable: boolean) {
    this._lineColor = lineColor;
    this.draggable = draggable;
  }

  public get time(): number | null {
    return this.timeGetter ? this.timeGetter() : null;
  }

  public get drawnOnTime(): number | null {
    return this._drawnOn;
  }

  requestTimeChange(v: number | null) {
    if(this.onChange) {
      this.onChange.call(null, v);
    }
  }

  hitTest(time: number, rcs: RenderingCoordinateSpace): boolean {
    if(this.time == null) {
      return false;
    }

    return Math.abs(time - this.time) * rcs.timeToCanvasXFactor < 5;
  } 

  draw(clipStartX: number, clipEndX: number, rcs: RenderingCoordinateSpace, renderContext: CanvasRenderingContext2D) {
    this._drawnOn = this.time;

    if(this.time == null) {
      return;
    }

    const timeX = rcs.timeToCanvasX(this.time);
    const width = this.getDisplayWidth(renderContext);
    if(timeX + width < clipStartX || timeX > clipEndX) {
      return;
    }

    renderContext.fillStyle = WAVETABLE_COLOR_BACKGROUND;
    renderContext.fillRect(timeX, 0, width, rcs.y);
    renderContext.fillStyle = this._lineColor ?? 'white';
    renderContext.fillText(this.getTimeLabel(), timeX + 3, rcs.y - 2);
    
    if(this._lineColor) {
      renderContext.fillStyle = this._lineColor;
      renderContext.fillRect(timeX, 0, 1, rcs.height);
    }
  }

  getDisplayWidth(renderContext: CanvasRenderingContext2D): number {
    return renderContext.measureText(this.getTimeLabel()).width + 6;    
  }

  getTimeLabel() {
    return this.time?.toFixed(3) + "s";
  }
}

// TODO
// Crop
// Insert silence
// Cut/Copy/Paste [overwrite/insert]
// Effects (filter, apply envelope)
// Time legends
