import { ComponentType } from '@angular/cdk/portal';
import { Component, ComponentRef, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { MatDrawer } from '@angular/material/sidenav';
import { ResourceType, ThrushProject, ThrushProjectTypedResource } from 'src/lib/project-datamodel/project-datamodel';
import { WaveInstrumentEditorComponent } from '../resource-editors/wave-instrument-editor/wave-instrument-editor.component';
import { SynthScriptEditorComponent } from '../resource-editors/synth-script-editor/synth-script-editor.component';
import { ResourceEditor } from '../resource-editors/resource-editor';
import { Subscription } from 'rxjs';


type ResourceEditorDescriptor = {
  title: string;
  resourceName: string;
  resourceType: ResourceType;
  cachedComponent?: ComponentRef<ResourceEditor<any, any>>;
  draftResource: any;
  draftResourceDirty: boolean;
}

const ResourceEditorTypes: Record<ResourceType, ComponentType<ResourceEditor<any, never>>>  = {
  abst_wave_instrument: WaveInstrumentEditorComponent,
  script: SynthScriptEditorComponent,
}

@Component({
  selector: 'app-project-editor',
  templateUrl: './project-editor.component.html',
  styleUrls: ['./project-editor.component.scss']
})
export class ProjectEditorComponent implements OnInit {

  @ViewChild("editorHost", { read: ViewContainerRef })
  private _editorHost: ViewContainerRef | null = null;

  @ViewChild('drawer')
  private _drawer: MatDrawer | null = null;

  private _editedProject: ThrushProject = {
    title: 'project',
    resources: {
      'main': { 
        type: 'script',
        code: 'this is the code',
      },
      'sec': { 
        type: 'script',
        code: 'that is the code',
      },
      'piano': {
        type: 'abst_wave_instrument',
        entryEnvelopes: {volume: []},
        exitEnvelopes: {volume: []},
        loopStartTime: 0,
        loopEndTime: 0,
        sampleRate: 1,
        samplesBase64: ''
      }
    } 
  }

  openEditors: ResourceEditorDescriptor[] = [ 
  ];

  _activeEditor: ResourceEditorDescriptor | null = null;
  private _activeDirtySubscription: Subscription | null = null;

  get activeEditor(): ResourceEditorDescriptor | null {
    return this._activeEditor;
  }

  set activeEditor(newActiveEditor: ResourceEditorDescriptor | null) {
    if(this._activeEditor?.cachedComponent) {
      this._activeDirtySubscription
      this._activeEditor.draftResource = this._activeEditor.cachedComponent.instance.editedResource;
      this._activeEditor.cachedComponent.destroy();
      this._activeEditor.cachedComponent = undefined;
    }
    if(this._activeDirtySubscription) {
      this._activeDirtySubscription.unsubscribe();
    }

    this._activeEditor = newActiveEditor;
    if(newActiveEditor) {
      if(!newActiveEditor.cachedComponent) {
        newActiveEditor.cachedComponent = this.createEditorComponentForResrouce(
          newActiveEditor.resourceType,
          newActiveEditor.draftResource);        
      }

      this._activeDirtySubscription = newActiveEditor.cachedComponent!.instance.resourceEdited.subscribe((d) => {
        newActiveEditor.draftResourceDirty = true;
      })
    }
  }

  constructor() { }

  ngOnInit(): void {
    this.openResource('main');
    this.openResource('sec');
    this.openResource('piano');
  }

  toggleResourceList() {
    this._drawer?.toggle();
  }

  //this._editedProject.resources[newActiveEditor.resourceName]
  private createEditorComponentForResrouce(resourceType: ResourceType, resource: any): ComponentRef<ResourceEditor<any, never>> | undefined {
    const component = this._editorHost!.createComponent(ResourceEditorTypes[resourceType]);
    component.instance.editedResource = resource;
    return component;
  }

  private openResource(resourceName: string): ResourceEditorDescriptor {
    let existingEditor = this.openEditors.find(editor => editor.resourceName == resourceName);
    if(existingEditor) {
      return existingEditor;
    }

    const editedResource = this._editedProject.resources[resourceName];
    const newEditor: ResourceEditorDescriptor = {
      title: resourceName,
      resourceName: resourceName,
      draftResource: Object.assign({}, editedResource),
      draftResourceDirty: false,
      resourceType: editedResource.type
    }
    this.openEditors.push(newEditor);

    return newEditor;
  }

  handleSaveClicked() {
    // TODO controller save this.activeEditor?.draftResource
    this.activeEditor!.draftResourceDirty = false;
  }
}
