import { Component, EventEmitter, OnInit, ViewChild } from '@angular/core';
import { ResourceTypeScript } from 'src/lib/project-datamodel/project-datamodel';
import { MonacoEditorComponent } from 'src/app/widget-lib/monaco-editor/monaco-editor.component';
import { ResourceEditor } from '../resource-editor';
import { BehaviorSubject } from 'rxjs';


@Component({
  templateUrl: './synth-script-editor.component.html',
  styleUrls: ['./synth-script-editor.component.scss']
})
export class SynthScriptEditorComponent implements OnInit, ResourceEditor<ResourceTypeScript, never> {  
  constructor() { }

  ngOnInit(): void {
  }

  private _editedResource: ResourceTypeScript | undefined;
  
  public resourceEdited = new EventEmitter();

  @ViewChild('codeEditor')
  private codeEditor: MonacoEditorComponent | null = null;
  
  get editedResource() {
    if(!this._editedResource) {
      this._editedResource = { code: '' };
    }

    this._editedResource.code = this.codeEditor?.text!
    return this._editedResource;
  }

  set editedResource(resource: ResourceTypeScript | undefined) {
    this._editedResource = resource;
  }

  get scriptCode(): string {
    return this._editedResource?.code || '';
  }
  
  handleEditorTextChanged() {
    this.resourceEdited.emit();
  }
}
