import { AfterViewInit, Component, Inject, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { EditedWaveform } from 'src/app/widget-lib/waveform-editor/waveform-editor.component';
import { ScriptSynthInstrument } from 'src/lib/thrush_engine/synth/scriptsynth/ScriptSynthInstrument';
import { ResourceEditor, ResourceEditorDialogData } from '../resource-editor-dialog-service/resource-editor-dialog.service';
import { WaveInstrumentEditorComponent } from '../wave-instrument-editor/wave-instrument-editor.component';


export type WaveInstrumentEditorDialogData = {
  scriptSynthInstrument?: ScriptSynthInstrument;
}

@Component({
  templateUrl: './resource-editor-dialog.component.html',
  styleUrls: ['./resource-editor-dialog.component.scss']
})
export class ResourceEditorDialogComponent<R, C> implements OnInit, AfterViewInit {
  @ViewChild("editorContainer", { read: ViewContainerRef })
  private _resourceEditor: ViewContainerRef | null = null;

  private _resourceEditorComponent: ResourceEditor<R, C> | null = null;
  
  constructor(
    @Inject(MAT_DIALOG_DATA) private _dialogData: ResourceEditorDialogData<R, C>, 
      private _dlgRef: MatDialogRef<ResourceEditorDialogComponent<R, C>, R | null>) { }
  
  ngOnInit(): void {
  }

  ngAfterViewInit() {
    const component = this._resourceEditor?.createComponent(this._dialogData.editorComponent);
    this._resourceEditorComponent = component!.instance;
    this._resourceEditorComponent.editorConfig = this._dialogData.editorConfig
    this._resourceEditorComponent.editedResource = this._dialogData.editedResource;
  }
  
  handleOk() {
    this._dlgRef.close(this._resourceEditorComponent?.editedResource);
  }

  handleCancel() {
    this._dlgRef.close(null);
  }
}
