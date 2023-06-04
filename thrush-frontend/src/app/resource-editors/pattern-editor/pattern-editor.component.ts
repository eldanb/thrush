import { Component, EventEmitter, OnInit } from '@angular/core';
import { ResourceTypePattern } from 'src/lib/project-datamodel/project-datamodel';
import { PlayingPreviewStopHandler, ResourceEditor, ResourceEditorWithPlaySupport } from '../resource-editor';
import _ from 'lodash';
import { ThrushEngineService } from 'src/app/services/thrush-engine.service';
import { ThrushPatternSequenceGenerator } from 'src/lib/thrush_engine/sequences/ThrushPatternSequenceGenerator';


type PatternEditorState = {}
const previewPlaybackCursorName = 'pattern_preview_playing';

@Component({
  templateUrl: './pattern-editor.component.html',
  styleUrls: ['./pattern-editor.component.scss']
})
export class PatternEditorComponent implements OnInit, 
                   ResourceEditor<ResourceTypePattern, PatternEditorState>,
                   ResourceEditorWithPlaySupport {

  readonly noteSelectOptions = [
    {value: null, name: '---'}, 
    ..._.range(0, 8).flatMap((octave, octaveIndex) => 
      ["c-", "c#", "d-", "d#", "e-", "f-", "f#", "g-", "g#", "a-", "a#", "b-"].map((note, noteIndex) => ({
        name: `${note}${octave}`,
        value: octaveIndex*12 + noteIndex
      })))];

  editedResource?: ResourceTypePattern | undefined;
  editorState?: PatternEditorState | undefined;
  resourceEdited = new EventEmitter<boolean>();
  showInstrumentBindings: boolean = false;
  

  private _selectedRow: number = 0;
  private _selectedChannel: number = 0;
  private _previewUpdateTimer: any = null;
  
  get selectedRow(): number {
    return this._selectedRow;
  }

  get selectedChannel(): number {
    return this._selectedChannel;
  }

  set selectedRow(row: number) {
    this._selectedRow = row;
  }

  set selectedChannel(channel: number) {
    this._selectedChannel = channel;
  }

  constructor(private _synthEngine: ThrushEngineService) { }

  async playResourcePreview(): Promise<PlayingPreviewStopHandler | null> {
    if(!this.editedResource) {
      return null;
    }

    this._previewUpdateTimer = setInterval(() => {
      this.selectedRow = this._synthEngine.sequencer.cursorTracker.getCursor(previewPlaybackCursorName);
    }, 50);
    
    this._synthEngine.playSequence(new ThrushPatternSequenceGenerator(
      this.editedResource?.pattern,
      {
        synth: this._synthEngine.sequencer.tsynthToneGenerator,
        sampleInstrumentHandles: this.editedResource?.pattern.defaultInstrumentBindings
      },
      previewPlaybackCursorName));

      return async () => {
        this._synthEngine.stop();
        clearInterval(this._previewUpdateTimer);
        this._previewUpdateTimer = null;
      }
  }

  get patternRows() {
    return this.editedResource?.pattern.rows ?? [];
  }

  handleNoteChange(rowIndex: number, channelIndex: number, event: Event) {
    const newNote = (event.target as HTMLSelectElement).value;
    if(this.editedResource) {
      this.editedResource.pattern.rows[rowIndex].channelCommands[channelIndex].note = newNote ? Number(newNote) : undefined;
      this.resourceEdited.emit(true);
    }    
  }

  handleRowClick(row: number) {
    this.selectedRow = row;
  }

  handleChannelClick(channel: number) {
    this.selectedChannel = channel;
  }

  handleEditorKeyDown(event: Event) {
    if(!this.editedResource) {
      return;
    }

    const keyDownEvent = event as KeyboardEvent;
    switch(keyDownEvent.key) {
      case "ArrowDown":
        if(this.selectedRow < this.editedResource.pattern.rows.length-1) {
          this.selectedRow += 1;
        }        
        break;

      case "ArrowUp":
        if(this.selectedRow > 0) {
          this.selectedRow -= 1;
        }
        break;

      case "ArrowLeft":
        if(this.selectedChannel > 0) {
          this.selectedChannel -= 1;
        }
        break;

      case "ArrowRight":
        if(this.selectedChannel < this.editedResource.pattern.numChannels-1) {
          this.selectedChannel += 1;
        }
        break;

      default:
        return;
    }

    event.preventDefault();
  }


  ngOnInit(): void {
  }

}
