import { ComponentType } from '@angular/cdk/portal';
import { Component, ComponentRef, Input, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { MatDrawer } from '@angular/material/sidenav';
import { ResourceType, ThrushProject, ThrushProjectTypedResource } from 'src/lib/project-datamodel/project-datamodel';
import { WaveInstrumentEditorComponent } from '../resource-editors/wave-instrument-editor/wave-instrument-editor.component';
import { SynthScriptEditorComponent } from '../resource-editors/synth-script-editor/synth-script-editor.component';
import { ResourceEditor } from '../resource-editors/resource-editor';
import { Subscription } from 'rxjs';
import { ThrushProjectController } from 'src/lib/project-datamodel/thrush-project-controller';


type ResourceEditorDescriptor = {
  title: string;
  resourceName: string;
  resourceType: ResourceType;
  cachedComponent?: ComponentRef<ResourceEditor<any, any>>;
  draftResource: any;
  draftResourceDirty: boolean;
  dirtySubscription: Subscription | null;
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

  @Input()
  public editedProjectController: ThrushProjectController | null = null;


  openEditors: ResourceEditorDescriptor[] = [ 
  ];

  private _activeEditor: ResourceEditorDescriptor | null = null;

  get activeEditor(): ResourceEditorDescriptor | null {
    return this._activeEditor;
  }

  set activeEditor(newActiveEditor: ResourceEditorDescriptor | null) {
    if(this._activeEditor?.cachedComponent) {      
      this._activeEditor.draftResource = this._activeEditor.cachedComponent.instance.editedResource;
      this._activeEditor.cachedComponent.destroy();
      this._activeEditor.cachedComponent = undefined;
      this._activeEditor.dirtySubscription?.unsubscribe();
    }

    this._activeEditor = newActiveEditor;
    if(newActiveEditor) {
      if(!newActiveEditor.cachedComponent) {
        newActiveEditor.cachedComponent = this.createEditorComponentForResource(
          newActiveEditor.resourceType,
          newActiveEditor.draftResource);

        newActiveEditor.dirtySubscription = newActiveEditor.cachedComponent!.instance.resourceEdited.subscribe((r) => {
          newActiveEditor.draftResourceDirty = true;
          newActiveEditor.draftResource = r;
        });
      }
    }
  }

  constructor() { }

  ngOnInit(): void {
  }

  toggleResourceList() {
    this._drawer?.toggle();
  }

  private createEditorComponentForResource(resourceType: ResourceType, resource: any): ComponentRef<ResourceEditor<any, never>> | undefined {
    const component = this._editorHost!.createComponent(ResourceEditorTypes[resourceType]);
    component.instance.editedResource = resource;
    return component;
  }

  private getResourceEditor(resourceName: string): ResourceEditorDescriptor {
    let existingEditor = this.openEditors.find(editor => editor.resourceName == resourceName);
    if(existingEditor) {
      return existingEditor;
    }

    const editedResource = this.editedProjectController!.project.resources[resourceName];
    const newEditor: ResourceEditorDescriptor = {
      title: resourceName,
      resourceName: resourceName,
      draftResource: Object.assign({}, editedResource),
      draftResourceDirty: false,
      dirtySubscription: null,
      resourceType: editedResource.type,      
    }
    this.openEditors.push(newEditor);

    return newEditor;
  }

  public handleOpenResource(resourceName: string) {
    this.activeEditor = this.getResourceEditor(resourceName);
  }

  public async handleNewWavestrument() {
    const newResourceName = await this.editedProjectController!.createResource('abst_wave_instrument');
    this.handleOpenResource(newResourceName);
  }

  public async handleNewScript() {
    const newResourceName = await this.editedProjectController!.createResource('script');
    this.handleOpenResource(newResourceName);
    
  }

  async handleSaveClicked() {
    await this.editedProjectController!.saveResource(this.activeEditor!.resourceName, 
      Object.assign({ 'type': this.activeEditor!.resourceType }, this.activeEditor?.cachedComponent!.instance.editedResource));
    this.activeEditor!.draftResourceDirty = false;
  }

  public get editedProjectResourceNames(): string[] {
    return Object.keys(this.editedProjectController!.project.resources);
  }
}
