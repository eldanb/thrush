import { Component, EventEmitter, OnInit } from '@angular/core';
import { ResourceEditor } from '../resource-editor';
import { ResourceTypeFmInstrument } from 'src/lib/project-datamodel/project-datamodel';

@Component({
  templateUrl: './fm-instrument-editor.component.html',
  styleUrls: ['./fm-instrument-editor.component.scss']
})
export class FmInstrumentEditorComponent implements OnInit, ResourceEditor<ResourceTypeFmInstrument> {

  constructor() { }
  editedResource?: ResourceTypeFmInstrument | undefined;
  editorConfig?: undefined;
  
  resourceEdited = new EventEmitter<boolean>();

  ngOnInit(): void {
  }

}
