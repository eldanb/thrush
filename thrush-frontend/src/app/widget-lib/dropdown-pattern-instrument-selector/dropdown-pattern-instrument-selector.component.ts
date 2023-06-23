import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-dropdown-pattern-instrument-selector',
  templateUrl: './dropdown-pattern-instrument-selector.component.html',
  styleUrls: ['./dropdown-pattern-instrument-selector.component.scss']
})
export class DropdownPatternInstrumentSelectorComponent implements OnInit {

  constructor() { }

  @Input()
  instruments: string[] = [];

  @Input()
  selectedInstrument?: number;

  @Output()
  selectedInstrumentChange = new EventEmitter<number>();
  
  ngOnInit(): void {
  }

}
