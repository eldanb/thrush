export class ThrushCursorTracker {
  private _cursors: Record<string, any> = {};
  private _eventQueue: Array<{
    time: number;
    cursor: string;
    value?: any;
  }> = [];

  constructor(private _audioContext: AudioContext) {
  }

  postCusrorChangeEvent(time: number, cursor: string, value: any) {
    this._eventQueue.push({
      time, cursor, value
    });
  }

  getCursor(cursorName: string): any {
    this.pumpEvents();
    
    return this._cursors[cursorName];
  }

  private pumpEvents() {
    const forTime = this._audioContext.currentTime;
    while(this._eventQueue.length && 
      this._eventQueue[0]?.time <= forTime) {      

      const processedEvent = this._eventQueue.shift()!;
      
      if(processedEvent.value == null) {
        delete this._cursors[processedEvent.cursor];
      } else {
        this._cursors[processedEvent.cursor] = processedEvent.value;
      }
    }
  } 
}