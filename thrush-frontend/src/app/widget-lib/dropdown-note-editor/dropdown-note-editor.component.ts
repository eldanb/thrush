import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import _ from 'lodash';

@Component({
  selector: 'app-dropdown-note-editor',
  templateUrl: './dropdown-note-editor.component.html',
  styleUrls: ['./dropdown-note-editor.component.scss']
})
export class DropdownNoteEditorComponent implements OnInit {

  constructor() { }

  @Input() 
  noteValue: number | undefined;

  @Output()
  noteValueChange = new EventEmitter<number>();
  
  octave = 2;

  ngOnInit(): void {
    this.octave = Math.floor((this.noteValue ?? 0) / 12)
  }

  handleNoteClick(event: Event, onDone: (value: any) => void) {
    if(event.target instanceof HTMLElement && 
       event.target.getAttribute("data-note-base")) {
      const noteBase = Number(event.target.getAttribute("data-note-base"));
      onDone(this.octave*12 + noteBase);
    }
  }

  noteToText(noteValue?: number): string {
    return this.noteSelectOptions.find(opt => opt.value == noteValue)?.name || '---';
  }

  setOctave(octave: number) {
    this.octave = Math.max(Math.min(octave, 8), 0);
  }
 
  readonly noteSelectOptions = [
    {value: null, name: '---'}, 
    ..._.range(0, 8).flatMap((octave, octaveIndex) => 
      ["c-", "c#", "d-", "d#", "e-", "f-", "f#", "g-", "g#", "a-", "a#", "b-"].map((note, noteIndex) => ({
        name: `${note}${octave}`,
        value: octaveIndex*12 + noteIndex
      })))];

}
