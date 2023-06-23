import { Component, ComponentRef, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-dropdown-edited-field',
  templateUrl: './dropdown-edited-field.component.html',
  styleUrls: ['./dropdown-edited-field.component.scss']
})
export class DropdownEditedFieldComponent implements OnInit {

  constructor() { }

  @ViewChild(NgbPopover) popover: NgbPopover | null = null; 

  @Input()
  editorTemplate: TemplateRef<any> | null = null; 

  @Input()
  editedValue: any;

  @Output()
  editedValueChange = new EventEmitter<any>();

  ngOnInit(): void {
  }

  handlePopoverClick() {
    this.popover?.open({ 
      editedValue: this.editedValue, 
      onEditDone: (newValue: any) => {
        this.popover?.close();
        this.editedValueChange.emit(newValue);
      } 
    });
  }
}
