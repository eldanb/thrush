import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { timeStamp } from 'console';

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
export class WaveformEditorComponent implements AfterViewInit, OnDestroy {

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
  
  private _selectionStartTime: number | null = null; 
  private _selectionEndTime: number | null = null;
  
  private _displayStartTime: number = 0;
  private _displayEndTime: number = 0;

  private _allCursors = [
    this._selectionStartCursor, 
    this._selectionEndCursor,
    this._loopStartCursor,
    this._loopEndCursor,
    this._pointerCursor, 
  ];


  constructor() {
    this._selectionStartCursor.onChange = (newValue) => {
      if(newValue != null) {
        this.selectionStartTime = Math.min(newValue, this._selectionEndCursor.time ?? newValue);
        this.selectionEndTime = Math.max(newValue, this._selectionEndCursor.time ?? newValue);
      }
    }

    this._selectionEndCursor.onChange = (newValue) => {
      if(newValue != null) {
        this.selectionStartTime = Math.min(newValue, this._selectionStartCursor.time ?? newValue);
        this.selectionEndTime = Math.max(newValue, this._selectionStartCursor.time ?? newValue);
      }
    }

    this._loopEndCursor.onChange = (newValue) => {
      if(newValue != null && this._loopStartCursor.time != null &&
          newValue < this._loopStartCursor.time) {
        this._loopStartCursor.time = null;
        this._loopEndCursor.time = null;
        this.refresh();
      }
    }

    this._loopStartCursor.onChange = (newValue) => {
      if(newValue != null && this._loopEndCursor.time != null &&
          newValue > this._loopEndCursor.time) {
        this._loopStartCursor.time = null;
        this._loopEndCursor.time = null;
        this.refresh();
      }
    }


    this._loopStartCursor.time = 0;
    this._loopEndCursor.time = 0;
  }

  @Input()
  public get editedWaveform(): EditedWaveform | null {
    return this._editedWaveform;
  }

  public set editedWaveform(v: EditedWaveform | null) {
    this._editedWaveform = v;
    this._displayStartTime = 0;
    this._displayEndTime = this.waveformDuration;
    this.refresh();
  }
    
  @Input()
  public loopStart: number = 0;

  @Input()
  public loopEnd: number = 0;


  public get selectionStartTime(): number | null {
    return this._selectionStartTime;
  }

  public set selectionStartTime(v: number | null) {
    const old = this._selectionStartTime || 0;
    this._selectionStartTime = v;    
    this.render(Math.min(old, this._selectionStartTime || 0), Math.max(old, this._selectionStartTime || 0));
  }

  public get selectionEndTime(): number | null {
    return this._selectionEndTime;
  }

  public set selectionEndTime(v: number | null) {
    const old = this._selectionEndTime || 0;
    this._selectionEndTime = v;
    this.render(Math.min(old, this._selectionEndTime ?? old), Math.max(old, this._selectionEndTime ?? old));
  }

  public get waveformDuration(): number {
    return this._editedWaveform
      ? this._editedWaveform.channelSamples[0].length / this._editedWaveform.sampleRate
      : 0;
  }

  public getRenderingCoordinateSpace() {
    if(!this._renderingCoordinateSpace && this._editedWaveform) {
      const width = this._canvas!.nativeElement!.clientWidth;
      const height = this._canvas!.nativeElement!.clientHeight;
      const displayStartTime = this._displayStartTime;
      const displayEndTime = this._displayEndTime;
      const topPad = 16;
      const channelHeight = (height-topPad) / (this._editedWaveform.channelSamples.length * (1 + CHANNEL_PAD_RATIO) - CHANNEL_PAD_RATIO);
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
  }

  public handleCanvasMouseMove(event: MouseEvent) {
    if(!this._editedWaveform) {
      return;
    }

    const clrect = (event.target as HTMLCanvasElement).getBoundingClientRect();

    if(this._dragging) {
      this.moveCursorToCanvasX(this._dragging, event.clientX - clrect.left);  
    }

    this.moveCursorToCanvasX(this._pointerCursor, event.clientX - clrect.left);
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
      this.moveCursorToCanvasX(this._selectionEndCursor, event.clientX - clrect.left);

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

    this.moveCursorToCanvasX(this._pointerCursor, null);
  }

  public handleZoomInClick() {
    this.updateZoomByFactor(1/1.5);
  }

  public handleZoomOutClick() {
    this.updateZoomByFactor(1.5);
  }

  public handleZoomToSelectionClick() {
    if(this._selectionStartTime == null || this._selectionEndTime == null) {
      this.setZoomRange(0, this.waveformDuration);
    } else {
      this.setZoomRange(this._selectionStartTime, this._selectionEndTime);
    }
  }

  public handleSetLoopToSelection() {
    if(this._selectionStartTime == null || this._selectionEndTime == null ||
       (this._selectionStartTime == this._loopStartCursor.time && 
        this._selectionEndTime == this._loopEndCursor.time)) {
          this._loopStartCursor.time = null;
          this._loopEndCursor.time = null;
          
    } else {
      this._loopStartCursor.time = this._selectionStartTime;
      this._loopEndCursor.time = this._selectionEndTime;      
    }    

    this.refresh();
  }

  private moveCursorToCanvasX(cursor: DraggableCursor, canvasX: number | null) {  
    const rcs = this.getRenderingCoordinateSpace()!;
    const renderContext = this._canvas!.nativeElement.getContext("2d")!;

    if(cursor.time != null) {    
      const oldTime = cursor.time;
      const oldWidth = cursor.getDisplayWidth(renderContext)/rcs.timeToCanvasXFactor;
      cursor.time = null;

      this.render(oldTime, oldTime + oldWidth);
    }
    
    cursor.time = canvasX != null ? rcs.canvasXToTime(canvasX) : null;
    if(cursor.time != null) {
      const newWidth = cursor.getDisplayWidth(renderContext)/rcs.timeToCanvasXFactor;
      this.render(cursor.time, cursor.time + newWidth);   
    }
  }

  private updateZoomByFactor(factor: number) {
    const rcs = this.getRenderingCoordinateSpace()!;

    let zoomFactor = (this._displayEndTime - this._displayStartTime) / rcs.width;
    const midTime = (this._displayEndTime + this._displayStartTime) / 2;    
    zoomFactor *= factor;
    const newTimeRange = zoomFactor * rcs.width;
    
    let start = Math.max(midTime - newTimeRange / 2, 0);
    let end = Math.min(midTime + newTimeRange / 2, this.waveformDuration);

    this.setZoomRange(start, end);
  }
  
  private setZoomRange(startTime: number, endTime: number) {
    this._displayStartTime = startTime;
    this._displayEndTime = endTime;
    this._renderingCoordinateSpace = null;
    this.refresh();
  }

  private refresh() {
    if(this._canvas) {
      this.render(this._displayStartTime, this._displayEndTime);
    }
  }

  private render(startTime: number, endTime: number) {
    const editedWaveform = this._editedWaveform;
    if(!editedWaveform) {
      return;
    }

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

    // Draw selection background
    if(this._selectionStartTime != null && this._selectionEndTime != null) {
      const selectionBoundaryMin = Math.floor(renderingCoordinateSpace.timeToCanvasX(Math.max(startTime, this._selectionStartTime)));
      const selectionBoundaryMax = Math.ceil(renderingCoordinateSpace.timeToCanvasX(Math.min(endTime, this._selectionEndTime)));

      if(selectionBoundaryMax > selectionBoundaryMin) {
        renderContext.fillStyle = WAVETABLE_COLOR_SELECTION_BACKGROUND;
        renderContext.fillRect(
          selectionBoundaryMin, 
          renderingCoordinateSpace.y, 
          selectionBoundaryMax-selectionBoundaryMin + 1,
          renderingCoordinateSpace.height);   
      }
    }

    const selStart = this;
    this.renderWaveform(editedWaveform, renderingStartX, renderingEndX, renderingCoordinateSpace, renderContext);    
    
    this._allCursors.forEach(cursor => {
      cursor.draw(renderingStartX, renderingEndX, renderingCoordinateSpace, renderContext);
    })    

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
  private _time: number | null = null;
  private _lineColor: string | null;
  
  public draggable: boolean;  
  public onChange: ((newValue: number | null) => void) | null = null;

  constructor(lineColor: string | null, draggable: boolean) {
    this._lineColor = lineColor;
    this.draggable = draggable;
  }

  public get time(): number | null {
    return this._time;
  }

  public set time(v: number | null) {
    if(this.onChange) {
      this.onChange.call(null, v);
    }
    this._time = v;
  }

  hitTest(time: number, rcs: RenderingCoordinateSpace): boolean {
    if(this._time == null) {
      return false;
    }

    return Math.abs(time - this._time) * rcs.timeToCanvasXFactor < 5;
  } 

  draw(clipStartX: number, clipEndX: number, rcs: RenderingCoordinateSpace, renderContext: CanvasRenderingContext2D) {
    if(this._time == null) {
      return;
    }

    const timeX = rcs.timeToCanvasX(this._time);
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
    return this._time?.toFixed(3) + "s";
  }
}

// TODO
// Crop
// Insert silence
// Cut/Copy/Paste [overwrite/insert]
// Effects (filter, apply envelope)
// Time legends
// Time edit boxes