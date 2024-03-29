import { Component, EventEmitter, OnInit, ViewChild } from '@angular/core';
import { ThrushEngineService } from 'src/app/services/thrush-engine.service';
import { MonacoEditorComponent } from 'src/app/widget-lib/monaco-editor/monaco-editor.component';
import { ResourceTypeScript } from 'src/lib/project-datamodel/project-datamodel';
import { ThrushAggregatedSequenceGenerator } from 'src/lib/thrush_engine/sequences/ThrushAggregatedSequenceGenerator';
import { ThrushFunctionSequenceGenerator } from 'src/lib/thrush_engine/sequences/ThrushFunctionSequenceGenerator';
import { PlayingPreviewStopHandler, ResourceEditor, ResourceEditorWithPlaySupport } from '../resource-editor';


@Component({
  templateUrl: './synth-script-editor.component.html',
  styleUrls: ['./synth-script-editor.component.scss']
})
export class SynthScriptEditorComponent implements OnInit, ResourceEditor<ResourceTypeScript, never>, ResourceEditorWithPlaySupport {  
  constructor(private _thrushEngine: ThrushEngineService) { }

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



  async playResourcePreview(): Promise<PlayingPreviewStopHandler | null> {
    const aggregator = new ThrushAggregatedSequenceGenerator();
    const generatorFunction = new Function(`return (${this._editedResource?.code})`)();
    const generatorFunctionSeq = new ThrushFunctionSequenceGenerator(generatorFunction, aggregator);
    aggregator.addInitialChild(generatorFunctionSeq);    
    this._thrushEngine.playSequence(aggregator);

    return async () => this.handleStop();
  }

  handleStop() {
    this._thrushEngine.stop();
  } 
}
